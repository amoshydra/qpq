package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"runtime"

	tea "github.com/charmbracelet/bubbletea"
)

const version = "0.3.0-go-prototype"

func main() {
	path, err := configPath()
	if err != nil {
		fmt.Fprintf(os.Stderr, "qpq-go: %v\n", err)
		os.Exit(1)
	}

	args := os.Args[1:]
	for _, arg := range args {
		switch arg {
		case "--version", "-v":
			fmt.Printf("qpq-go %s\n", version)
			return
		case "--paths":
			fmt.Printf("Configuration paths:\n")
			fmt.Printf("  Main config file: %s\n", path)
			return
		case "--help", "-h":
			printHelp()
			return
		default:
			fmt.Fprintf(os.Stderr, "qpq-go: unknown option %q\n\n", arg)
			printHelp()
			os.Exit(2)
		}
	}

	cfg, err := loadConfig(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "qpq-go: %v\n", err)
		os.Exit(1)
	}

	program := tea.NewProgram(newModel(cfg, path), tea.WithAltScreen())
	result, err := program.Run()
	if err != nil {
		fmt.Fprintf(os.Stderr, "qpq-go: %v\n", err)
		os.Exit(1)
	}

	final, ok := result.(model)
	if !ok {
		fmt.Fprintln(os.Stderr, "qpq-go: unexpected program state")
		os.Exit(1)
	}

	if final.saveErr != nil {
		fmt.Fprintf(os.Stderr, "qpq-go: warning: could not save recent history: %v\n", final.saveErr)
	}

	if final.pendingCommand != "" {
		os.Exit(runCommand(final.pendingCommand))
	}
}

func printHelp() {
	fmt.Print(`Usage: qpq-go [options]

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
		fmt.Fprintf(os.Stderr, "qpq-go: %v\n", err)
		return 1
	}

	return 0
}
