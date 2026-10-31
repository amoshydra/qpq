package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestLoadConfigCreatesDefault(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")

	cfg, err := loadConfig(path)
	if err != nil {
		t.Fatalf("loadConfig: %v", err)
	}
	if len(cfg.Commands) == 0 {
		t.Fatal("expected default commands")
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("expected config file: %v", err)
	}
}

func TestLoadConfigNormalizesLegacyValues(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	content := `{
  "commands": [
    {"name": "Alpha", "command": "echo alpha"},
    {"name": "Beta", "command": "echo beta"}
  ],
  "favorites": ["Beta", 1],
  "recent": [
    {"name": "Alpha", "timestamp": 123},
    {"id": 2, "timestamp": 50}
  ]
}`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	cfg, err := loadConfig(path)
	if err != nil {
		t.Fatalf("loadConfig: %v", err)
	}

	if got := cfg.Commands[0].ID; got != 1 {
		t.Fatalf("Alpha id = %d, want 1", got)
	}
	if got := cfg.Commands[1].ID; got != 2 {
		t.Fatalf("Beta id = %d, want 2", got)
	}
	if len(cfg.Favorites) != 2 || cfg.Favorites[0] != 2 || cfg.Favorites[1] != 1 {
		t.Fatalf("favorites = %v, want [2 1]", cfg.Favorites)
	}
	if len(cfg.Recent) != 2 || cfg.Recent[0].ID != 1 || cfg.Recent[0].Timestamp != 123 {
		t.Fatalf("recent = %v", cfg.Recent)
	}
	if cfg.NextID != 3 {
		t.Fatalf("nextId = %d, want 3", cfg.NextID)
	}
}

func TestLoadConfigRejectsInvalidCommand(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	if err := os.WriteFile(path, []byte(`{"commands":[{"name":"Broken"}]}`), 0o644); err != nil {
		t.Fatal(err)
	}

	if _, err := loadConfig(path); err == nil {
		t.Fatal("expected an error for a command without a command string")
	}
}

func TestSaveConfigAtomic(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	cfg := defaultConfig()

	if err := saveConfig(path, cfg); err != nil {
		t.Fatalf("saveConfig: %v", err)
	}
	if err := saveConfig(path, cfg); err != nil {
		t.Fatalf("second saveConfig: %v", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	for _, entry := range entries {
		if entry.Name() != "config.json" {
			t.Fatalf("unexpected leftover file %q", entry.Name())
		}
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var decoded Config
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("saved config is not valid JSON: %v", err)
	}
}

func TestOrderedCommands(t *testing.T) {
	cfg := Config{
		Commands: []Command{
			{ID: 1, Name: "Alpha", Command: "echo alpha"},
			{ID: 2, Name: "Beta", Command: "echo beta"},
			{ID: 3, Name: "Gamma", Command: "echo gamma"},
			{ID: 4, Name: "Delta", Command: "echo delta"},
		},
		Favorites: []int{2},
		Recent: []RecentEntry{
			{ID: 1, Timestamp: 200},
			{ID: 3, Timestamp: 100},
		},
	}

	ordered := orderedCommands(cfg)
	names := make([]string, len(ordered))
	for index, command := range ordered {
		names[index] = command.Name
	}

	want := []string{"Beta", "Alpha", "Gamma", "Delta"}
	for index := range want {
		if names[index] != want[index] {
			t.Fatalf("order = %v, want %v", names, want)
		}
	}
}

func TestFilterCommands(t *testing.T) {
	commands := []Command{
		{ID: 1, Name: "Git Status", Command: "git status", Description: "working tree", Tags: []string{"vcs"}},
		{ID: 2, Name: "Deploy", Command: "./deploy.sh", Aliases: []string{"ship"}},
	}

	if got := filterCommands(commands, "GIT"); len(got) != 1 || got[0].ID != 1 {
		t.Fatalf("name search = %v", got)
	}
	if got := filterCommands(commands, "working"); len(got) != 1 || got[0].ID != 1 {
		t.Fatalf("description search = %v", got)
	}
	if got := filterCommands(commands, "vcs"); len(got) != 1 || got[0].ID != 1 {
		t.Fatalf("tag search = %v", got)
	}
	if got := filterCommands(commands, "ship"); len(got) != 1 || got[0].ID != 2 {
		t.Fatalf("alias search = %v", got)
	}
	if got := filterCommands(commands, "deploy"); len(got) != 1 || got[0].ID != 2 {
		t.Fatalf("command search = %v", got)
	}
	if got := filterCommands(commands, ""); len(got) != len(commands) {
		t.Fatalf("empty search = %v", got)
	}
}

func TestToggleFavorite(t *testing.T) {
	cfg := defaultConfig()
	commandID := cfg.Commands[0].ID

	if !toggleFavorite(&cfg, commandID) {
		t.Fatal("expected toggle to succeed")
	}
	if !isFavorite(cfg, commandID) {
		t.Fatal("expected command to be favorite")
	}
	if !toggleFavorite(&cfg, commandID) {
		t.Fatal("expected second toggle to succeed")
	}
	if isFavorite(cfg, commandID) {
		t.Fatal("expected command to no longer be favorite")
	}
}

func TestTouchRecent(t *testing.T) {
	cfg := defaultConfig()
	first := cfg.Commands[0].ID
	second := cfg.Commands[1].ID

	touchRecent(&cfg, first, 100)
	touchRecent(&cfg, second, 200)
	touchRecent(&cfg, first, 300)

	if len(cfg.Recent) != 2 {
		t.Fatalf("recent length = %d, want 2", len(cfg.Recent))
	}
	if cfg.Recent[0].ID != first || cfg.Recent[0].Timestamp != 300 {
		t.Fatalf("recent[0] = %+v", cfg.Recent[0])
	}
	if cfg.Recent[1].ID != second {
		t.Fatalf("recent[1] = %+v", cfg.Recent[1])
	}
}

func TestHasPlaceholders(t *testing.T) {
	if !hasPlaceholders("git push origin {branch}") {
		t.Fatal("expected placeholder")
	}
	if hasPlaceholders("git push origin main") {
		t.Fatal("unexpected placeholder")
	}
}
