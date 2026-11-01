//go:build !windows

package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/creack/pty"
)

var testBinary string

func TestMain(m *testing.M) {
	directory, err := os.MkdirTemp("", "qpq-pty-*")
	if err != nil {
		fmt.Fprintf(os.Stderr, "create test directory: %v\n", err)
		os.Exit(1)
	}

	testBinary = filepath.Join(directory, "qpq")
	build := exec.Command("go", "build", "-o", testBinary, ".")
	if output, err := build.CombinedOutput(); err != nil {
		fmt.Fprintf(os.Stderr, "build qpq: %v\n%s", err, output)
		os.RemoveAll(directory)
		os.Exit(1)
	}

	code := m.Run()
	os.RemoveAll(directory)
	os.Exit(code)
}

type syncBuffer struct {
	mu     sync.Mutex
	buffer bytes.Buffer
}

func (b *syncBuffer) Write(data []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buffer.Write(data)
}

func (b *syncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buffer.String()
}

type ptySession struct {
	t       *testing.T
	master  *os.File
	command *exec.Cmd
	output  *syncBuffer
	done    chan struct{}
	exitErr error

	writeMu      sync.Mutex
	oscResponses int
	cprResponses int
}

func startPTYSession(t *testing.T, home string, config Config) *ptySession {
	t.Helper()
	t.Setenv("HOME", home)

	path, err := configPath()
	if err != nil {
		t.Fatalf("resolve config path: %v", err)
	}
	if err := saveConfig(path, config); err != nil {
		t.Fatalf("save config: %v", err)
	}

	command := exec.Command(testBinary)
	command.Dir = home
	command.Env = environmentWith(map[string]string{
		"HOME":     home,
		"SHELL":    "/bin/sh",
		"TERM":     "xterm-256color",
		"LANG":     "C.UTF-8",
		"CI":       "",
		"NO_COLOR": "",
		"CLICOLOR": "",
	})

	master, err := pty.StartWithSize(command, &pty.Winsize{Rows: screenRows, Cols: screenColumns})
	if err != nil {
		t.Fatalf("start qpq in a pty: %v", err)
	}

	session := &ptySession{
		t:       t,
		master:  master,
		command: command,
		output:  &syncBuffer{},
		done:    make(chan struct{}),
	}

	go func() {
		buffer := make([]byte, 4096)
		for {
			read, err := master.Read(buffer)
			if read > 0 {
				_, _ = session.output.Write(buffer[:read])
				session.respondToTerminalQueries()
			}
			if err != nil {
				return
			}
		}
	}()
	go func() {
		session.exitErr = command.Wait()
		close(session.done)
	}()

	t.Cleanup(func() {
		_ = master.Close()
		select {
		case <-session.done:
		case <-time.After(2 * time.Second):
			_ = command.Process.Kill()
			<-session.done
		}
	})

	return session
}

// respondToTerminalQueries answers the OSC 11 background-color query and the
// cursor-position report that termenv sends at startup. A real terminal answers
// these; without a reply the program blocks for several seconds and may consume
// keystrokes as query responses.
func (s *ptySession) respondToTerminalQueries() {
	output := s.output.String()

	s.writeMu.Lock()
	defer s.writeMu.Unlock()

	if count := strings.Count(output, "\x1b]11;?"); count > s.oscResponses {
		for index := s.oscResponses; index < count; index++ {
			_, _ = s.master.Write([]byte("\x1b]11;rgb:0000/0000/0000\x1b\\"))
		}
		s.oscResponses = count
	}

	if count := strings.Count(output, "\x1b[6n"); count > s.cprResponses {
		for index := s.cprResponses; index < count; index++ {
			_, _ = s.master.Write([]byte("\x1b[1;1R"))
		}
		s.cprResponses = count
	}
}

func environmentWith(overrides map[string]string) []string {
	environment := os.Environ()
	filtered := make([]string, 0, len(environment))

	for _, entry := range environment {
		key := entry
		if index := strings.IndexByte(entry, '='); index >= 0 {
			key = entry[:index]
		}
		if _, overridden := overrides[key]; overridden {
			continue
		}
		filtered = append(filtered, entry)
	}

	for key, value := range overrides {
		filtered = append(filtered, key+"="+value)
	}

	return filtered
}

func (s *ptySession) send(input string) {
	s.t.Helper()
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	if _, err := s.master.Write([]byte(input)); err != nil {
		s.t.Fatalf("write %q: %v", input, err)
	}
}

func (s *ptySession) waitFor(text string, timeout time.Duration) {
	s.t.Helper()
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		if strings.Contains(s.Output(), text) {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}

	s.t.Fatalf("timed out waiting for %q\noutput:\n%s", text, s.Output())
}

func (s *ptySession) waitExit(timeout time.Duration) error {
	s.t.Helper()
	select {
	case <-s.done:
		return s.exitErr
	case <-time.After(timeout):
		s.t.Fatalf("qpq did not exit within %s\noutput:\n%s", timeout, s.Output())
		return nil
	}
}

func (s *ptySession) Output() string {
	return s.output.String()
}

func markerConfig(home string) Config {
	return Config{
		Commands: []Command{
			{
				ID:      1,
				Name:    "Alpha Command",
				Command: "printf alpha > " + filepath.Join(home, "alpha.txt"),
			},
			{
				ID:      2,
				Name:    "Beta Command",
				Command: "printf beta > " + filepath.Join(home, "beta.txt"),
			},
		},
		NextID: 3,
	}
}

func TestPTYStartupRendersMenuAndQuits(t *testing.T) {
	home := t.TempDir()
	session := startPTYSession(t, home, markerConfig(home))

	session.waitFor("Alpha Command", 10*time.Second)
	session.waitFor("Beta Command", 10*time.Second)

	session.send("q")
	if err := session.waitExit(10 * time.Second); err != nil {
		t.Fatalf("qpq exited with %v\noutput:\n%s", err, session.Output())
	}

	output := session.Output()
	for _, sequence := range []string{"\x1b[?1049h", "\x1b[?1049l", "\x1b[?25h"} {
		if !strings.Contains(output, sequence) {
			t.Errorf("terminal output is missing %q", sequence)
		}
	}

	for _, marker := range []string{"alpha.txt", "beta.txt"} {
		if _, err := os.Stat(filepath.Join(home, marker)); err == nil {
			t.Errorf("%s was created; quitting must not run a command", marker)
		}
	}
}

func TestPTYArrowKeysRunSelectedCommand(t *testing.T) {
	home := t.TempDir()
	session := startPTYSession(t, home, markerConfig(home))

	session.waitFor("Alpha Command", 10*time.Second)
	session.send("\x1b[B")
	session.send("\r")

	if err := session.waitExit(10 * time.Second); err != nil {
		t.Fatalf("qpq exited with %v\noutput:\n%s", err, session.Output())
	}

	content, err := os.ReadFile(filepath.Join(home, "beta.txt"))
	if err != nil {
		t.Fatalf("read beta marker: %v\noutput:\n%s", err, session.Output())
	}
	if string(content) != "beta" {
		t.Errorf("beta marker = %q, want %q", content, "beta")
	}
	if _, err := os.Stat(filepath.Join(home, "alpha.txt")); err == nil {
		t.Error("alpha marker was created; the down arrow did not move the selection")
	}
}

func TestPTYSearchRunsFilteredCommand(t *testing.T) {
	home := t.TempDir()
	session := startPTYSession(t, home, markerConfig(home))

	session.waitFor("Alpha Command", 10*time.Second)
	session.send("/")
	session.waitFor("Search Commands", 10*time.Second)
	session.send("beta")
	session.waitFor("> beta", 10*time.Second)
	session.send("\r")

	if err := session.waitExit(10 * time.Second); err != nil {
		t.Fatalf("qpq exited with %v\noutput:\n%s", err, session.Output())
	}

	content, err := os.ReadFile(filepath.Join(home, "beta.txt"))
	if err != nil {
		t.Fatalf("read beta marker: %v\noutput:\n%s", err, session.Output())
	}
	if string(content) != "beta" {
		t.Errorf("beta marker = %q, want %q", content, "beta")
	}
	if _, err := os.Stat(filepath.Join(home, "alpha.txt")); err == nil {
		t.Error("alpha marker was created; search did not filter the menu")
	}
}

func TestPTYTemplateFlow(t *testing.T) {
	home := t.TempDir()
	target := filepath.Join(home, "greeting.txt")

	config := Config{
		Commands: []Command{
			{
				ID:      1,
				Name:    "Greet",
				Command: "printf '%s' {name:1} > " + target,
			},
		},
		NextID: 2,
	}

	session := startPTYSession(t, home, config)

	session.waitFor("Greet", 10*time.Second)
	session.send("\r")
	session.waitFor("Template Variables", 10*time.Second)
	session.waitFor("name:", 10*time.Second)
	session.send("hello")
	session.send("\r")

	if err := session.waitExit(10 * time.Second); err != nil {
		t.Fatalf("qpq exited with %v\noutput:\n%s", err, session.Output())
	}

	content, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("read template output: %v\noutput:\n%s", err, session.Output())
	}
	if string(content) != "hello" {
		t.Errorf("template output = %q, want %q", content, "hello")
	}
}
