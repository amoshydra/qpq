package main

import (
	"path/filepath"
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

func testModel(t *testing.T, commands []Command) (model, string) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "config.json")
	cfg := Config{
		Commands:  commands,
		Favorites: []int{},
		Recent:    []RecentEntry{},
		NextID:    len(commands) + 1,
	}
	return newModel(cfg, path), path
}

func sendMessage(m model, msg tea.Msg) (model, tea.Cmd) {
	updated, cmd := m.Update(msg)
	return updated.(model), cmd
}

func sendKey(m model, key tea.KeyMsg) (model, tea.Cmd) {
	return sendMessage(m, key)
}

func sendText(m model, text string) (model, tea.Cmd) {
	return sendKey(m, tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(text)})
}

func TestMenuNavigationAndRun(t *testing.T) {
	m, _ := testModel(t, []Command{
		{ID: 1, Name: "Alpha", Command: "echo alpha"},
		{ID: 2, Name: "Beta", Command: "echo beta"},
	})

	m, _ = sendKey(m, tea.KeyMsg{Type: tea.KeyDown})
	if m.cursor != 1 {
		t.Fatalf("cursor = %d, want 1", m.cursor)
	}

	m, cmd := sendKey(m, tea.KeyMsg{Type: tea.KeyEnter})
	if cmd == nil {
		t.Fatal("expected quit command")
	}
	if m.pendingCommand != "echo beta" {
		t.Fatalf("pending command = %q", m.pendingCommand)
	}
	if len(m.cfg.Recent) != 1 || m.cfg.Recent[0].ID != 2 {
		t.Fatalf("recent = %v", m.cfg.Recent)
	}
}

func TestSearchFiltersAndRuns(t *testing.T) {
	m, _ := testModel(t, []Command{
		{ID: 1, Name: "Port", Command: "echo found-3000"},
		{ID: 2, Name: "Other", Command: "echo nope"},
	})

	m, _ = sendText(m, "/")
	if m.mode != searchMode {
		t.Fatal("expected search mode")
	}

	for _, character := range "3000" {
		m, _ = sendText(m, string(character))
	}
	if len(m.filtered) != 1 || m.filtered[0].ID != 1 {
		t.Fatalf("filtered = %v", m.filtered)
	}

	m, cmd := sendKey(m, tea.KeyMsg{Type: tea.KeyEnter})
	if cmd == nil || m.pendingCommand != "echo found-3000" {
		t.Fatalf("pending = %q", m.pendingCommand)
	}
}

func TestFavoriteTogglePreservesSelection(t *testing.T) {
	m, _ := testModel(t, []Command{
		{ID: 1, Name: "Alpha", Command: "echo alpha"},
		{ID: 2, Name: "Beta", Command: "echo beta"},
	})

	m, _ = sendKey(m, tea.KeyMsg{Type: tea.KeyDown})
	m, _ = sendText(m, "f")

	if !isFavorite(m.cfg, 2) {
		t.Fatalf("favorites = %v, want [2]", m.cfg.Favorites)
	}
	if m.selected() == nil || m.selected().ID != 2 {
		t.Fatalf("selection changed after favorite toggle: %+v", m.selected())
	}
}

func TestTemplatesAreNotExecuted(t *testing.T) {
	m, _ := testModel(t, []Command{
		{ID: 1, Name: "Git Push", Command: "git push origin {branch}"},
	})

	m, cmd := sendKey(m, tea.KeyMsg{Type: tea.KeyEnter})
	if cmd != nil {
		t.Fatal("template command should not quit")
	}
	if m.pendingCommand != "" {
		t.Fatalf("pending command = %q", m.pendingCommand)
	}
	if !strings.Contains(m.status, "Template") {
		t.Fatalf("status = %q", m.status)
	}
}

func TestQuit(t *testing.T) {
	m, _ := testModel(t, []Command{{ID: 1, Name: "Alpha", Command: "echo alpha"}})

	m, cmd := sendText(m, "q")
	if cmd == nil {
		t.Fatal("expected quit command")
	}
	if m.pendingCommand != "" {
		t.Fatalf("pending command = %q", m.pendingCommand)
	}
}

func TestViewRendersCommands(t *testing.T) {
	m, _ := testModel(t, []Command{
		{ID: 1, Name: "Alpha", Command: "echo alpha"},
		{ID: 2, Name: "Beta", Command: "echo beta"},
	})
	m, _ = sendMessage(m, tea.WindowSizeMsg{Width: 100, Height: 30})

	view := m.View()
	if !strings.Contains(view, "My Commands") {
		t.Fatalf("view missing title: %q", view)
	}
	if !strings.Contains(view, "Alpha") || !strings.Contains(view, "Beta") {
		t.Fatalf("view missing commands: %q", view)
	}
}
