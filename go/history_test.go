package main

import (
	"reflect"
	"testing"
)

func TestParseZshHistory(t *testing.T) {
	content := ": 1700000000:0;ls\n: 1700000001:0;git status\n: 1700000002:0;echo one; echo two"

	commands := parseHistoryContent(content, shellZsh)
	want := []string{"ls", "git status", "echo one; echo two"}

	if !reflect.DeepEqual(commands, want) {
		t.Fatalf("commands = %v, want %v", commands, want)
	}
}

func TestParseBashHistory(t *testing.T) {
	content := "ls\n#1700000000\ngit status\n\n"

	commands := parseHistoryContent(content, shellBash)
	want := []string{"ls", "git status"}

	if !reflect.DeepEqual(commands, want) {
		t.Fatalf("commands = %v, want %v", commands, want)
	}
}

func TestParseFishHistory(t *testing.T) {
	content := "- cmd: ls\n  when: 1700000000\n- cmd: git status\n  when: 1700000001\n"

	commands := parseHistoryContent(content, shellFish)
	want := []string{"ls", "git status"}

	if !reflect.DeepEqual(commands, want) {
		t.Fatalf("commands = %v, want %v", commands, want)
	}
}

func TestToNewestFirst(t *testing.T) {
	got := toNewestFirst([]string{"old", "new", "old", "oldest"})
	want := []string{"oldest", "old", "new"}

	if !reflect.DeepEqual(got, want) {
		t.Fatalf("commands = %v, want %v", got, want)
	}
}
