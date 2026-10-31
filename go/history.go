package main

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
)

type shellKind string

const (
	shellZsh        shellKind = "zsh"
	shellBash       shellKind = "bash"
	shellFish       shellKind = "fish"
	shellPowerShell shellKind = "powershell"
)

var (
	zshHistoryPattern       = regexp.MustCompile(`^: \d+:\d+;(.*)$`)
	numericTimestampPattern = regexp.MustCompile(`^#\d+$`)
	numericPrefixPattern    = regexp.MustCompile(`^[ \t]*\d+[ \t]+`)
)

func detectShell() shellKind {
	shell := strings.ToLower(os.Getenv("SHELL") + " " + os.Getenv("COMSPEC"))

	switch {
	case strings.Contains(shell, "zsh"):
		return shellZsh
	case strings.Contains(shell, "bash"):
		return shellBash
	case strings.Contains(shell, "fish"):
		return shellFish
	case strings.Contains(shell, "powershell"), strings.Contains(shell, "pwsh"):
		return shellPowerShell
	case runtime.GOOS == "windows":
		return shellPowerShell
	default:
		return shellZsh
	}
}

func historyFilePath(shell shellKind) string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}

	switch shell {
	case shellZsh:
		return filepath.Join(home, ".zsh_history")
	case shellBash:
		return filepath.Join(home, ".bash_history")
	case shellFish:
		return filepath.Join(home, ".local", "share", "fish", "fish_history")
	case shellPowerShell:
		appData := os.Getenv("APPDATA")
		if appData == "" {
			return ""
		}
		return filepath.Join(appData, "Microsoft", "Windows", "PowerShell", "PSReadLine", "ConsoleHost_history.txt")
	default:
		return ""
	}
}

func parseHistoryContent(content string, shell shellKind) []string {
	lines := strings.Split(content, "\n")
	commands := make([]string, 0, len(lines))

	switch shell {
	case shellZsh:
		for _, line := range lines {
			match := zshHistoryPattern.FindStringSubmatch(line)
			if match != nil {
				commands = append(commands, match[1])
			}
		}
	case shellFish:
		for _, line := range lines {
			if strings.HasPrefix(line, "- cmd:") {
				commands = append(commands, strings.TrimSpace(strings.TrimPrefix(line, "- cmd:")))
			}
		}
	default:
		for _, line := range lines {
			if line == "" || numericTimestampPattern.MatchString(line) {
				continue
			}
			commands = append(commands, line)
		}
	}

	return commands
}

func toNewestFirst(oldestFirst []string) []string {
	seen := make(map[string]bool, len(oldestFirst))
	result := make([]string, 0, len(oldestFirst))

	for index := len(oldestFirst) - 1; index >= 0; index-- {
		command := strings.TrimSpace(oldestFirst[index])
		if command == "" || seen[command] {
			continue
		}
		seen[command] = true
		result = append(result, command)
	}

	return result
}

func readHistoryFiles(count int) []string {
	shell := detectShell()
	path := historyFilePath(shell)
	if path == "" {
		return nil
	}

	content, err := os.ReadFile(path)
	if err != nil {
		return nil
	}

	commands := toNewestFirst(parseHistoryContent(string(content), shell))
	if len(commands) > count {
		commands = commands[:count]
	}
	return commands
}

func runHistoryCommand(name string, args []string) string {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	command := exec.CommandContext(ctx, name, args...)
	output, err := command.Output()
	if err != nil {
		return ""
	}
	return string(output)
}

func historyFromSubprocess(count int) []string {
	shell := detectShell()
	var output string

	switch shell {
	case shellZsh:
		output = runHistoryCommand("zsh", []string{"-c", "history | tail -n " + strconv.Itoa(count)})
	case shellBash:
		output = runHistoryCommand("bash", []string{"-c", "history | tail -n " + strconv.Itoa(count)})
	case shellFish:
		output = runHistoryCommand("fish", []string{"-c", "history"})
	case shellPowerShell:
		command := "Get-History -Count " + strconv.Itoa(count) + " | ForEach-Object { $_.CommandLine }"
		output = runHistoryCommand("pwsh", []string{"-NoProfile", "-Command", command})
		if output == "" {
			output = runHistoryCommand("powershell.exe", []string{"-NoProfile", "-Command", command})
		}
	}

	if output == "" {
		return nil
	}

	lines := strings.Split(strings.TrimSpace(output), "\n")
	commands := make([]string, 0, len(lines))
	for _, line := range lines {
		if line == "" {
			continue
		}
		if shell == shellZsh || shell == shellBash {
			line = numericPrefixPattern.ReplaceAllString(line, "")
		}
		commands = append(commands, line)
	}

	commands = toNewestFirst(commands)
	if len(commands) > count {
		commands = commands[:count]
	}
	return commands
}

func getLastCommands(count int) []string {
	if commands := readHistoryFiles(count); len(commands) > 0 {
		return commands
	}
	return historyFromSubprocess(count)
}
