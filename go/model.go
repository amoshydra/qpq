package main

import (
	"fmt"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type mode int

const (
	menuMode mode = iota
	searchMode
)

var (
	titleStyle    = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("6"))
	selectedStyle = lipgloss.NewStyle().Reverse(true)
	favoriteStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("3"))
	dimStyle      = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
	statusStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("1"))
)

type model struct {
	cfg            Config
	configPath     string
	ordered        []Command
	filtered       []Command
	cursor         int
	mode           mode
	query          string
	width          int
	height         int
	status         string
	pendingCommand string
	saveErr        error
}

func newModel(cfg Config, configPath string) model {
	m := model{
		cfg:        cfg,
		configPath: configPath,
	}
	m.refresh()
	return m
}

func (m model) Init() tea.Cmd {
	return nil
}

func (m *model) refresh() {
	m.ordered = orderedCommands(m.cfg)
	if m.mode == searchMode {
		m.filtered = filterCommands(m.ordered, m.query)
	} else {
		m.filtered = m.ordered
	}

	if len(m.filtered) == 0 {
		m.cursor = 0
	} else if m.cursor >= len(m.filtered) {
		m.cursor = len(m.filtered) - 1
	}
	if m.cursor < 0 {
		m.cursor = 0
	}
}

func (m model) selected() *Command {
	if len(m.filtered) == 0 {
		return nil
	}
	return &m.filtered[m.cursor]
}

func (m *model) move(delta int) {
	if len(m.filtered) == 0 {
		m.cursor = 0
		return
	}
	m.cursor += delta
	if m.cursor < 0 {
		m.cursor = 0
	}
	if m.cursor >= len(m.filtered) {
		m.cursor = len(m.filtered) - 1
	}
}

func (m *model) setCursorByID(commandID int) {
	for index, command := range m.filtered {
		if command.ID == commandID {
			m.cursor = index
			return
		}
	}
	m.move(0)
}

func (m model) Update(message tea.Msg) (tea.Model, tea.Cmd) {
	switch message := message.(type) {
	case tea.WindowSizeMsg:
		m.width = message.Width
		m.height = message.Height
		return m, nil
	case tea.KeyMsg:
		if message.Type == tea.KeyCtrlC {
			return m, tea.Quit
		}
		if m.mode == searchMode {
			return m.updateSearch(message)
		}
		return m.updateMenu(message)
	default:
		return m, nil
	}
}

func (m model) updateMenu(message tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch message.String() {
	case "q", "esc":
		return m, tea.Quit
	case "/":
		m.mode = searchMode
		m.query = ""
		m.refresh()
		m.cursor = 0
		m.status = ""
		return m, nil
	case "up", "k":
		m.move(-1)
		m.status = ""
		return m, nil
	case "down", "j":
		m.move(1)
		m.status = ""
		return m, nil
	case "f":
		return m.toggleSelectedFavorite()
	case "enter":
		return m.runSelected()
	}

	if message.Type == tea.KeyRunes && len(message.Runes) == 1 {
		r := message.Runes[0]
		if r >= '1' && r <= '9' {
			index := int(r - '1')
			if index < len(m.filtered) {
				m.cursor = index
				return m.runSelected()
			}
		}
	}

	return m, nil
}

func (m model) updateSearch(message tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch message.String() {
	case "esc":
		m.mode = menuMode
		m.query = ""
		m.refresh()
		m.cursor = 0
		m.status = ""
		return m, nil
	case "up":
		m.move(-1)
		return m, nil
	case "down":
		m.move(1)
		return m, nil
	case "enter":
		return m.runSelected()
	case "backspace":
		runes := []rune(m.query)
		if len(runes) > 0 {
			m.query = string(runes[:len(runes)-1])
			m.refresh()
			m.cursor = 0
		}
		return m, nil
	case "ctrl+u":
		m.query = ""
		m.refresh()
		m.cursor = 0
		return m, nil
	}

	if message.Type == tea.KeyRunes && len(message.Runes) > 0 {
		m.query += string(message.Runes)
		m.refresh()
		m.cursor = 0
	}

	return m, nil
}

func (m model) toggleSelectedFavorite() (tea.Model, tea.Cmd) {
	selected := m.selected()
	if selected == nil {
		return m, nil
	}

	commandID := selected.ID
	if !toggleFavorite(&m.cfg, commandID) {
		return m, nil
	}

	m.refresh()
	m.setCursorByID(commandID)

	if err := saveConfig(m.configPath, m.cfg); err != nil {
		m.status = "Could not save favorite: " + err.Error()
	}

	return m, nil
}

func (m model) runSelected() (tea.Model, tea.Cmd) {
	selected := m.selected()
	if selected == nil {
		return m, nil
	}

	if hasPlaceholders(selected.Command) {
		m.status = "Template placeholders are not supported in the Go prototype yet."
		return m, nil
	}

	touchRecent(&m.cfg, selected.ID, time.Now().UnixMilli())
	if err := saveConfig(m.configPath, m.cfg); err != nil {
		m.saveErr = err
	}
	m.pendingCommand = selected.Command

	return m, tea.Quit
}

func (m model) View() string {
	width := m.width
	if width <= 0 {
		width = 80
	}
	height := m.height
	if height <= 0 {
		height = 24
	}

	listHeight := height - 7
	if listHeight < 3 {
		listHeight = 3
	}

	lines := make([]string, 0, height)
	if m.mode == searchMode {
		lines = append(lines, titleStyle.Render("Search Commands"))
		lines = append(lines, "> "+m.query+"█")
	} else {
		lines = append(lines, titleStyle.Render("My Commands"))
	}
	lines = append(lines, "")

	if len(m.ordered) == 0 {
		lines = append(lines, dimStyle.Render("No commands yet. Edit "+m.configPath))
	} else if len(m.filtered) == 0 {
		lines = append(lines, dimStyle.Render("No matches."))
	} else {
		start := 0
		if m.cursor >= listHeight {
			start = m.cursor - listHeight + 1
		}
		end := start + listHeight
		if end > len(m.filtered) {
			end = len(m.filtered)
		}

		nameWidth := 28
		if width < 72 {
			nameWidth = width - 24
			if nameWidth < 12 {
				nameWidth = 12
			}
		}
		descriptionWidth := width - nameWidth - 8
		if descriptionWidth < 10 {
			descriptionWidth = 10
		}

		for index := start; index < end; index++ {
			command := m.filtered[index]
			marker := " "
			if isFavorite(m.cfg, command.ID) {
				marker = "*"
			}

			line := fmt.Sprintf(
				"%s %2d. %-*s %s",
				marker,
				index+1,
				nameWidth,
				truncate(command.Name, nameWidth),
				truncate(command.Description, descriptionWidth),
			)
			line = strings.TrimRight(line, " ")

			switch {
			case index == m.cursor:
				line = selectedStyle.Render(line)
			case isFavorite(m.cfg, command.ID):
				line = favoriteStyle.Render(line)
			}

			lines = append(lines, line)
		}
	}

	if m.status != "" {
		lines = append(lines, "")
		lines = append(lines, statusStyle.Render(m.status))
	}

	lines = append(lines, "")
	if m.mode == searchMode {
		lines = append(lines, dimStyle.Render("type to filter • ↑↓ navigate • enter run • esc back • ctrl+c quit"))
	} else {
		lines = append(lines, dimStyle.Render("↑↓/jk navigate • enter run • f favorite • / search • q quit"))
	}

	return strings.Join(lines, "\n")
}

func truncate(value string, width int) string {
	if width <= 0 {
		return ""
	}

	runes := []rune(value)
	if len(runes) <= width {
		return value
	}
	if width == 1 {
		return string(runes[:1])
	}

	return string(runes[:width-1]) + "…"
}
