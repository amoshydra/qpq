package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	tea "github.com/charmbracelet/bubbletea"
)

var version = "dev"

func main() {
	path, err := configPath()
	if err != nil {
		fmt.Fprintf(os.Stderr, "qpq: %v\n", err)
		os.Exit(1)
	}

	args := os.Args[1:]
	for _, arg := range args {
		switch arg {
		case "--version", "-v":
			fmt.Printf("qpq %s\n", version)
			return
		case "--paths":
			fmt.Printf("Configuration paths:\n")
			fmt.Printf("  Config directory: %s\n", filepath.Dir(path))
			fmt.Printf("  Main config file: %s\n", path)
			return
		case "--help", "-h":
			printHelp()
			return
		default:
			fmt.Fprintf(os.Stderr, "qpq: unknown option %q\n\n", arg)
			printHelp()
			os.Exit(2)
		}
	}

	cfg, err := loadConfig(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "qpq: %v\n", err)
		os.Exit(1)
	}

	program := tea.NewProgram(newModel(cfg, path), tea.WithAltScreen())
	result, err := program.Run()
	if err != nil {
		fmt.Fprintf(os.Stderr, "qpq: %v\n", err)
		os.Exit(1)
	}

	final, ok := result.(model)
	if !ok {
		fmt.Fprintln(os.Stderr, "qpq: unexpected program state")
		os.Exit(1)
	}

	if final.saveErr != nil {
		fmt.Fprintf(os.Stderr, "qpq: warning: could not save recent history: %v\n", final.saveErr)
	}

	if final.pendingCommand != "" {
		os.Exit(runCommand(final.pendingCommand))
	}
}

func printHelp() {
	fmt.Print(`Usage: qpq [options]

A native TUI launcher prototype built with Go and Bubble Tea.

Options:
  -v, --version    Show version number
  -h, --help       Show this help message
  --paths          Show configuration paths

Run without arguments to launch the interactive menu.
`)
}

func runCommand(command string) int {
	name := "sh"
	args := []string{"-c", command}

	if runtime.GOOS == "windows" {
		name = "powershell.exe"
		args = []string{"-NoProfile", "-Command", command}
	} else if shell := os.Getenv("SHELL"); shell != "" {
		if _, err := exec.LookPath(shell); err == nil {
			name = shell
		}
	}

	cmd := exec.Command(name, args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		var exitError *exec.ExitError
		if errors.As(err, &exitError) {
			return exitError.ExitCode()
		}
		fmt.Fprintf(os.Stderr, "qpq: %v\n", err)
		return 1
	}

	return 0
}
