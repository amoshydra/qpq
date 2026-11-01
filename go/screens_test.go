//go:build !windows

package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/amoshydra/qpq/go/internal/termframe"
)

const (
	screenColumns = 120
	screenRows    = 24
)

var (
	updateGolden  = flag.Bool("update", false, "rewrite golden screen files")
	updateScreens = flag.Bool("update-screens", false, "rewrite documentation screenshots")
)

type screenStep struct {
	send    string
	waitFor string
}

type screenScenario struct {
	name      string
	favorites []int
	history   []string
	steps     []screenStep
}

func screenScenarios() []screenScenario {
	return []screenScenario{
		{
			name: "menu",
			steps: []screenStep{
				{waitFor: "My Commands"},
				{waitFor: "Show Path"},
			},
		},
		{
			name:      "favorites",
			favorites: []int{1, 2},
			steps: []screenStep{
				{waitFor: "My Commands"},
				{waitFor: "Disk Usage"},
			},
		},
		{
			name:      "search",
			favorites: []int{1, 2},
			steps: []screenStep{
				{waitFor: "My Commands"},
				{waitFor: "Show Path"},
				{send: "/"},
				{waitFor: "Search Commands"},
				{send: "git"},
				{waitFor: "> git"},
			},
		},
		{
			name:      "add-history",
			favorites: []int{1, 2},
			history: []string{
				"qpq",
				"npm i -g qpq@latest",
				"echo",
				"ssh root@192.168.0.1",
				"cd ~/Desktop",
				"clear",
				"ls",
				"cd ../termux",
			},
			steps: []screenStep{
				{waitFor: "My Commands"},
				{waitFor: "Show Path"},
				{send: "a"},
				{waitFor: "Shell History"},
				{waitFor: "npm i -g qpq@latest"},
			},
		},
		{
			name:      "edit",
			favorites: []int{1, 2},
			steps: []screenStep{
				{waitFor: "My Commands"},
				{waitFor: "Show Path"},
				{send: "e"},
				{waitFor: "Edit Command"},
			},
		},
		{
			name:      "template",
			favorites: []int{1, 2},
			steps: []screenStep{
				{waitFor: "My Commands"},
				{waitFor: "Show Path"},
				{send: "/"},
				{waitFor: "Search Commands"},
				{send: "pull"},
				{waitFor: "> pull"},
				{send: "\r"},
				{waitFor: "Template Variables"},
			},
		},
	}
}

func screenConfig(favorites []int) Config {
	return Config{
		Commands: []Command{
			{ID: 1, Name: "List Files", Command: "ls -la", Description: "List all files with details", Tags: []string{"files"}},
			{ID: 2, Name: "Disk Usage", Command: "df -h", Description: "Show disk usage", Tags: []string{"disk"}},
			{ID: 3, Name: "Docker Build", Command: "docker build -t app .", Description: "Build Docker image with tag", Tags: []string{"docker"}},
			{ID: 4, Name: "Docker Run", Command: "docker run -it app", Description: "Run Docker container interactively", Tags: []string{"docker"}},
			{ID: 5, Name: "Git Pull", Command: "git pull origin {branch}", Description: "Pull from remote branch", Tags: []string{"git"}},
			{ID: 6, Name: "Git Push", Command: "git push origin main", Description: "Push to remote branch", Tags: []string{"git"}},
			{ID: 7, Name: "Git Status", Command: "git status", Description: "Show git status", Tags: []string{"git"}},
			{ID: 8, Name: "NPM Install", Command: "npm install", Description: "Install npm package", Tags: []string{"npm"}},
			{ID: 9, Name: "Show Path", Command: "echo $PATH", Description: "Show PATH environment variable", Tags: []string{"env"}},
		},
		Favorites: favorites,
		NextID:    10,
	}
}

func TestPTYScreens(t *testing.T) {
	for _, scenario := range screenScenarios() {
		scenario := scenario
		t.Run(scenario.name, func(t *testing.T) {
			home := t.TempDir()
			seedShellHistory(t, home, scenario.history)
			session := startPTYSession(t, home, screenConfig(scenario.favorites))

			for _, step := range scenario.steps {
				if step.send != "" {
					session.send(step.send)
				}
				if step.waitFor != "" {
					session.waitFor(step.waitFor, 10*time.Second)
				}
			}

			frame := settledFrame(t, session)

			if *updateScreens {
				writeScreenshot(t, scenario.name, frame)
			}
			checkGolden(t, scenario.name, frame.Text())

			for _, key := range scenario.exitKeys() {
				session.send(key)
				time.Sleep(100 * time.Millisecond)
			}
			if err := session.waitExit(5 * time.Second); err != nil {
				t.Fatalf("qpq exited with %v", err)
			}
		})
	}
}

func (s screenScenario) exitKeys() []string {
	switch s.name {
	case "menu", "favorites":
		return []string{"q"}
	default:
		return []string{"\x1b", "q"}
	}
}

func TestPTYScreensUseStyles(t *testing.T) {
	home := t.TempDir()
	session := startPTYSession(t, home, screenConfig([]int{1, 2}))
	session.waitFor("My Commands", 10*time.Second)
	session.waitFor("Show Path", 10*time.Second)
	frame := settledFrame(t, session)

	title := findRow(frame, "My Commands")
	if title < 0 {
		t.Fatal("title row not found")
	}
	if got := frame.At(title, 0).Style.Foreground; got != 6 {
		t.Errorf("title foreground = %d, want 6 (cyan)", got)
	}

	selected := findRow(frame, "List Files")
	if selected < 0 {
		t.Fatal("selected row not found")
	}
	if !frame.At(selected, 0).Style.Reverse {
		t.Error("selected row is not rendered in reverse video")
	}

	favorite := findRow(frame, "Disk Usage")
	if favorite < 0 {
		t.Fatal("favorite row not found")
	}
	if got := frame.At(favorite, 0).Style.Foreground; got != 3 {
		t.Errorf("favorite foreground = %d, want 3 (yellow)", got)
	}

	session.send("q")
	if err := session.waitExit(5 * time.Second); err != nil {
		t.Fatalf("qpq exited with %v", err)
	}
}

func findRow(frame *termframe.Frame, text string) int {
	for row := 0; row < frame.Rows(); row++ {
		var builder strings.Builder
		for column := 0; column < frame.Columns(); column++ {
			builder.WriteRune(frame.At(row, column).Rune)
		}
		if strings.Contains(builder.String(), text) {
			return row
		}
	}
	return -1
}

func settledFrame(t *testing.T, session *ptySession) *termframe.Frame {
	t.Helper()

	var previous *termframe.Frame
	for attempt := 0; attempt < 40; attempt++ {
		current := termframe.Parse([]byte(session.Output()), screenColumns, screenRows)
		if previous != nil && current.Text() == previous.Text() {
			return current
		}
		previous = current
		time.Sleep(25 * time.Millisecond)
	}

	return previous
}

func seedShellHistory(t *testing.T, home string, commands []string) {
	t.Helper()
	if len(commands) == 0 {
		return
	}

	lines := make([]string, 0, len(commands))
	for index, command := range commands {
		lines = append(lines, fmt.Sprintf(": %d:0;%s", 1700000000+index, command))
	}

	path := filepath.Join(home, ".zsh_history")
	if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o644); err != nil {
		t.Fatalf("seed shell history: %v", err)
	}
}

func checkGolden(t *testing.T, name, text string) {
	t.Helper()

	path := filepath.Join("testdata", "screens", name+".golden")
	want := text + "\n"

	if *updateGolden {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatalf("create golden directory: %v", err)
		}
		if err := os.WriteFile(path, []byte(want), 0o644); err != nil {
			t.Fatalf("write golden %s: %v", path, err)
		}
		return
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read golden %s (run go test -run TestPTYScreens -update): %v", path, err)
	}

	got := string(data)
	if got != want {
		t.Errorf("golden mismatch for %s\n%s", name, firstDifference(got, want))
	}
}

func firstDifference(want, got string) string {
	wantLines := strings.Split(want, "\n")
	gotLines := strings.Split(got, "\n")
	limit := len(wantLines)
	if len(gotLines) > limit {
		limit = len(gotLines)
	}

	for index := 0; index < limit; index++ {
		wantLine, gotLine := "<missing>", "<missing>"
		if index < len(wantLines) {
			wantLine = wantLines[index]
		}
		if index < len(gotLines) {
			gotLine = gotLines[index]
		}
		if wantLine != gotLine {
			return fmt.Sprintf("line %d:\n  want: %q\n  got:  %q", index+1, wantLine, gotLine)
		}
	}

	return "frames differ"
}

func writeScreenshot(t *testing.T, name string, frame *termframe.Frame) {
	t.Helper()

	directory := filepath.Join("..", "docs", "screenshots")
	if err := os.MkdirAll(directory, 0o755); err != nil {
		t.Fatalf("create screenshot directory: %v", err)
	}

	path := filepath.Join(directory, name+".svg")
	if err := os.WriteFile(path, []byte(frame.SVG("qpq "+name)), 0o644); err != nil {
		t.Fatalf("write screenshot %s: %v", path, err)
	}
}
