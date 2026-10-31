package main

import (
	"os"
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
	if m.screen != searchScreen {
		t.Fatal("expected search screen")
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

func TestTemplateFlow(t *testing.T) {
	m, _ := testModel(t, []Command{
		{ID: 1, Name: "Deploy", Command: "echo {tag:2}-{env:1}"},
	})

	m, _ = sendKey(m, tea.KeyMsg{Type: tea.KeyEnter})
	if m.screen != templateScreen || m.template == nil {
		t.Fatal("expected template screen")
	}
	if len(m.template.fields) != 2 || m.template.fields[0].label != "env" {
		t.Fatalf("template fields = %+v", m.template.fields)
	}

	m, _ = sendText(m, "prod")
	m, _ = sendKey(m, tea.KeyMsg{Type: tea.KeyEnter})
	m, _ = sendText(m, "v1")
	m, cmd := sendKey(m, tea.KeyMsg{Type: tea.KeyEnter})

	if cmd == nil {
		t.Fatal("expected quit command")
	}
	if m.pendingCommand != "echo v1-prod" {
		t.Fatalf("pending command = %q", m.pendingCommand)
	}
}

func TestAddCommandFromHistory(t *testing.T) {
	m, path := testModel(t, []Command{{ID: 1, Name: "Alpha", Command: "echo alpha"}})

	m, cmd := sendText(m, "a")
	if cmd == nil || m.screen != addHistoryScreen {
		t.Fatal("expected history loading")
	}

	m, _ = sendMessage(m, historyLoadedMsg{commands: []string{"echo one", "git status"}})
	if !m.historyLoaded || len(m.history) != 2 {
		t.Fatalf("history = %v", m.history)
	}

	m, _ = sendKey(m, tea.KeyMsg{Type: tea.KeyEnter})
	if m.screen != commandFormScreen || m.form == nil {
		t.Fatal("expected command form")
	}
	if m.form.fields[1].value != "echo one" {
		t.Fatalf("command field = %q", m.form.fields[1].value)
	}

	for index := 0; index < 4; index++ {
		m, _ = sendKey(m, tea.KeyMsg{Type: tea.KeyEnter})
	}

	if m.screen != menuScreen {
		t.Fatalf("screen = %v, want menu", m.screen)
	}
	if len(m.cfg.Commands) != 2 {
		t.Fatalf("commands = %v", m.cfg.Commands)
	}
	if m.cfg.Commands[1].Name != "echo one" {
		t.Fatalf("added command = %+v", m.cfg.Commands[1])
	}

	saved, err := loadConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(saved.Commands) != 2 {
		t.Fatalf("saved commands = %v", saved.Commands)
	}
}

func TestEditCommandForm(t *testing.T) {
	m, _ := testModel(t, []Command{{ID: 1, Name: "Alpha", Command: "echo alpha"}})

	m, _ = sendText(m, "e")
	if m.screen != commandFormScreen || m.form == nil {
		t.Fatal("expected edit form")
	}
	if m.form.title != "Edit Command" {
		t.Fatalf("title = %q", m.form.title)
	}

	m, _ = sendKey(m, tea.KeyMsg{Type: tea.KeySpace})
	m, _ = sendText(m, "updated")
	for index := 0; index < 4; index++ {
		m, _ = sendKey(m, tea.KeyMsg{Type: tea.KeyEnter})
	}

	if m.cfg.Commands[0].Name != "Alpha updated" {
		t.Fatalf("command name = %q", m.cfg.Commands[0].Name)
	}
}

func TestDuplicateCommand(t *testing.T) {
	m, _ := testModel(t, []Command{{ID: 1, Name: "Alpha", Command: "echo alpha"}})

	m, _ = sendText(m, "c")

	if len(m.cfg.Commands) != 2 {
		t.Fatalf("commands = %v", m.cfg.Commands)
	}
	if m.cfg.Commands[1].Name != "Alpha (Copy)" {
		t.Fatalf("copy name = %q", m.cfg.Commands[1].Name)
	}
	if m.selected() == nil || m.selected().ID != 1 {
		t.Fatalf("selection = %+v", m.selected())
	}
}

func TestDeleteConfirmation(t *testing.T) {
	m, _ := testModel(t, []Command{
		{ID: 1, Name: "Alpha", Command: "echo alpha"},
		{ID: 2, Name: "Beta", Command: "echo beta"},
	})
	m.cfg.Favorites = []int{1}
	m.cfg.Recent = []RecentEntry{{ID: 1, Timestamp: 100}}
	m.refresh()

	m, _ = sendText(m, "d")
	if m.screen != deleteScreen {
		t.Fatal("expected delete screen")
	}

	m, _ = sendText(m, "y")
	if m.screen != menuScreen {
		t.Fatalf("screen = %v", m.screen)
	}
	if len(m.cfg.Commands) != 1 || m.cfg.Commands[0].ID != 2 {
		t.Fatalf("commands = %v", m.cfg.Commands)
	}
	if len(m.cfg.Favorites) != 0 || len(m.cfg.Recent) != 0 {
		t.Fatalf("favorites/recent = %v / %v", m.cfg.Favorites, m.cfg.Recent)
	}
}

func TestDuplicateNameValidation(t *testing.T) {
	m, _ := testModel(t, []Command{
		{ID: 1, Name: "Alpha", Command: "echo alpha"},
		{ID: 2, Name: "Beta", Command: "echo beta"},
	})

	m.form = newCommandForm(&Command{Name: "Alpha", Command: "echo new"})
	m.screen = commandFormScreen
	for index := 0; index < 4; index++ {
		m, _ = sendKey(m, tea.KeyMsg{Type: tea.KeyEnter})
	}

	if m.screen != commandFormScreen {
		t.Fatal("expected to stay on the form")
	}
	if !strings.Contains(m.form.err, "already exists") {
		t.Fatalf("error = %q", m.form.err)
	}
	if len(m.cfg.Commands) != 2 {
		t.Fatalf("commands = %v", m.cfg.Commands)
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

func TestErrorScreenDismisses(t *testing.T) {
	m, _ := testModel(t, []Command{{ID: 1, Name: "Alpha", Command: "echo alpha"}})
	m.uiErr = &uiError{message: "save failed"}
	m.screen = errorScreen

	view := m.View()
	if !strings.Contains(view, "save failed") {
		t.Fatalf("view = %q", view)
	}

	m, _ = sendKey(m, tea.KeyMsg{Type: tea.KeyEscape})
	if m.screen != menuScreen || m.uiErr != nil {
		t.Fatalf("screen = %v, error = %v", m.screen, m.uiErr)
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

func TestConfigFileIsWritten(t *testing.T) {
	m, path := testModel(t, []Command{{ID: 1, Name: "Alpha", Command: "echo alpha"}})
	m.cfg.Favorites = []int{1}
	if err := saveConfig(path, m.cfg); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatal(err)
	}
}

func TestSearchSupportsSpaces(t *testing.T) {
	m, _ := testModel(t, []Command{
		{ID: 1, Name: "Git Status", Command: "git status"},
		{ID: 2, Name: "Other", Command: "echo nope"},
	})

	m, _ = sendText(m, "/")
	m, _ = sendText(m, "git")
	m, _ = sendKey(m, tea.KeyMsg{Type: tea.KeySpace})
	m, _ = sendText(m, "status")

	if len(m.filtered) != 1 || m.filtered[0].ID != 1 {
		t.Fatalf("filtered = %+v", m.filtered)
	}
}
