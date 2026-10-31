package main

import (
	"fmt"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type screenMode int

const (
	menuScreen screenMode = iota
	searchScreen
	addHistoryScreen
	commandFormScreen
	deleteScreen
	templateScreen
	errorScreen
)

var (
	titleStyle    = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("6"))
	selectedStyle = lipgloss.NewStyle().Reverse(true)
	favoriteStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("3"))
	dimStyle      = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
	statusStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("1"))
	activeStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("2"))
)

type textField struct {
	label  string
	value  string
	cursor int
}

type commandFormState struct {
	title     string
	fields    []textField
	focus     int
	editingID int
	aliases   []string
	err       string
}

type templateState struct {
	command      Command
	placeholders []Placeholder
	fields       []textField
	focus        int
}

type uiError struct {
	message string
}

type historyLoadedMsg struct {
	commands []string
}

type model struct {
	cfg            Config
	configPath     string
	ordered        []Command
	filtered       []Command
	cursor         int
	screen         screenMode
	query          string
	width          int
	height         int
	status         string
	pendingCommand string
	saveErr        error

	history       []string
	historyCursor int
	historyLoaded bool
	historyErr    string

	form         *commandFormState
	deleteTarget *Command
	template     *templateState
	uiErr        *uiError
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
	if m.screen == searchScreen {
		m.filtered = filterCommands(searchOrderedCommands(m.cfg), m.query)
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

func cloneConfig(cfg Config) Config {
	cloned := Config{
		Commands:  make([]Command, len(cfg.Commands)),
		Favorites: append([]int(nil), cfg.Favorites...),
		Recent:    append([]RecentEntry(nil), cfg.Recent...),
		NextID:    cfg.NextID,
	}
	for index, command := range cfg.Commands {
		cloned.Commands[index] = command
		cloned.Commands[index].Tags = append([]string(nil), command.Tags...)
		cloned.Commands[index].Aliases = append([]string(nil), command.Aliases...)
	}
	return cloned
}

func (m model) Update(message tea.Msg) (tea.Model, tea.Cmd) {
	switch message := message.(type) {
	case tea.WindowSizeMsg:
		m.width = message.Width
		m.height = message.Height
		return m, nil
	case historyLoadedMsg:
		if m.screen == addHistoryScreen {
			m.history = message.commands
			m.historyLoaded = true
			m.historyCursor = 0
			if len(m.history) == 0 {
				m.historyErr = "No command history found"
			}
		}
		return m, nil
	case tea.KeyMsg:
		if message.Type == tea.KeyCtrlC {
			return m, tea.Quit
		}
		if m.screen == errorScreen {
			if message.String() == "enter" || message.String() == "esc" {
				m.uiErr = nil
				m.screen = menuScreen
				m.form = nil
				m.deleteTarget = nil
				m.template = nil
				m.refresh()
			}
			return m, nil
		}

		switch m.screen {
		case searchScreen:
			return m.updateSearch(message)
		case addHistoryScreen:
			return m.updateAddHistory(message)
		case commandFormScreen:
			return m.updateCommandForm(message)
		case deleteScreen:
			return m.updateDelete(message)
		case templateScreen:
			return m.updateTemplate(message)
		default:
			return m.updateMenu(message)
		}
	default:
		return m, nil
	}
}

func (m model) updateMenu(message tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch message.String() {
	case "q", "esc":
		return m, tea.Quit
	case "/":
		m.screen = searchScreen
		m.query = ""
		m.refresh()
		m.cursor = 0
		m.status = ""
		return m, nil
	case "a":
		m.screen = addHistoryScreen
		m.history = nil
		m.historyCursor = 0
		m.historyLoaded = false
		m.historyErr = ""
		return m, loadHistoryCmd()
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
	case "d":
		selected := m.selected()
		if selected == nil {
			return m, nil
		}
		target := *selected
		m.deleteTarget = &target
		m.screen = deleteScreen
		return m, nil
	case "e":
		selected := m.selected()
		if selected == nil {
			return m, nil
		}
		m.form = newCommandForm(selected)
		m.screen = commandFormScreen
		return m, nil
	case "c":
		selected := m.selected()
		if selected == nil {
			return m, nil
		}
		next := cloneConfig(m.cfg)
		if _, ok := duplicateCommand(&next, *selected); !ok {
			return m, nil
		}
		return m.commitConfig(next, "duplicate the command", selected.ID, 0)
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
		m.screen = menuScreen
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
	case "backspace", "delete":
		runes := []rune(m.query)
		if len(runes) > 0 {
			m.query = string(runes[:len(runes)-1])
			m.refresh()
			m.cursor = 0
		}
		return m, nil
	case " ":
		m.query += " "
		m.refresh()
		m.cursor = 0
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

func (m model) updateAddHistory(message tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch message.String() {
	case "esc":
		m.screen = menuScreen
		return m, nil
	case "n":
		m.form = newCommandForm(nil)
		m.screen = commandFormScreen
		return m, nil
	case "enter":
		if len(m.history) > 0 {
			index := m.historyCursor
			if index >= len(m.history) {
				index = len(m.history) - 1
			}
			command := m.history[index]
			m.form = newCommandForm(&Command{Command: command})
			m.screen = commandFormScreen
		}
		return m, nil
	case "up", "k":
		if len(m.history) > 0 {
			m.historyCursor--
			if m.historyCursor < 0 {
				m.historyCursor = 0
			}
		}
		return m, nil
	case "down", "j":
		if len(m.history) > 0 {
			m.historyCursor++
			if m.historyCursor >= len(m.history) {
				m.historyCursor = len(m.history) - 1
			}
		}
		return m, nil
	}

	return m, nil
}

func (m model) updateCommandForm(message tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.form == nil {
		m.screen = menuScreen
		return m, nil
	}

	switch message.String() {
	case "esc":
		m.form = nil
		m.screen = menuScreen
		return m, nil
	case "up":
		m.form.focus--
		if m.form.focus < 0 {
			m.form.focus = 0
		}
		m.form.fields[m.form.focus].cursor = len([]rune(m.form.fields[m.form.focus].value))
		return m, nil
	case "down":
		m.form.focus++
		if m.form.focus >= len(m.form.fields) {
			m.form.focus = len(m.form.fields) - 1
		}
		m.form.fields[m.form.focus].cursor = len([]rune(m.form.fields[m.form.focus].value))
		return m, nil
	case "enter":
		if m.form.focus < len(m.form.fields)-1 {
			m.form.focus++
			m.form.fields[m.form.focus].cursor = len([]rune(m.form.fields[m.form.focus].value))
			return m, nil
		}
		return m.submitCommandForm()
	}

	return m.updateTextField(message)
}

func (m model) updateTemplate(message tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.template == nil {
		m.screen = menuScreen
		return m, nil
	}

	switch message.String() {
	case "esc":
		m.template = nil
		m.screen = menuScreen
		return m, nil
	case "up":
		if len(m.template.fields) > 0 {
			m.template.focus--
			if m.template.focus < 0 {
				m.template.focus = len(m.template.fields) - 1
			}
			m.template.fields[m.template.focus].cursor = len([]rune(m.template.fields[m.template.focus].value))
		}
		return m, nil
	case "down":
		if len(m.template.fields) > 0 {
			m.template.focus++
			if m.template.focus >= len(m.template.fields) {
				m.template.focus = 0
			}
			m.template.fields[m.template.focus].cursor = len([]rune(m.template.fields[m.template.focus].value))
		}
		return m, nil
	case "enter":
		if m.template.focus < len(m.template.fields)-1 {
			m.template.focus++
			m.template.fields[m.template.focus].cursor = len([]rune(m.template.fields[m.template.focus].value))
			return m, nil
		}
		return m.submitTemplate()
	}

	return m.updateTemplateTextField(message)
}

func (m model) updateTemplateTextField(message tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.template == nil || len(m.template.fields) == 0 {
		return m, nil
	}

	field := &m.template.fields[m.template.focus]
	field.update(message)
	return m, nil
}

func (m model) updateTextField(message tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.form == nil || len(m.form.fields) == 0 {
		return m, nil
	}

	field := &m.form.fields[m.form.focus]
	field.update(message)
	return m, nil
}

func (m model) updateDelete(message tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.deleteTarget == nil {
		m.screen = menuScreen
		return m, nil
	}

	switch message.String() {
	case "y", "Y", "enter":
		next := cloneConfig(m.cfg)
		if !removeCommand(&next, m.deleteTarget.ID) {
			m.screen = menuScreen
			m.deleteTarget = nil
			return m, nil
		}
		return m.commitConfig(next, "delete the command", 0, 0)
	case "n", "N", "esc":
		m.deleteTarget = nil
		m.screen = menuScreen
		return m, nil
	}

	return m, nil
}

func (m model) toggleSelectedFavorite() (tea.Model, tea.Cmd) {
	selected := m.selected()
	if selected == nil {
		return m, nil
	}

	next := cloneConfig(m.cfg)
	if !toggleFavorite(&next, selected.ID) {
		return m, nil
	}
	return m.commitConfig(next, "save favorite", selected.ID, selected.ID)
}

func (m model) commitConfig(next Config, action string, selectedID int, newID int) (tea.Model, tea.Cmd) {
	if err := saveConfig(m.configPath, next); err != nil {
		m.uiErr = &uiError{message: fmt.Sprintf("Failed to %s: %v", action, err)}
		m.screen = errorScreen
		return m, nil
	}

	m.cfg = next
	m.screen = menuScreen
	m.form = nil
	m.deleteTarget = nil
	m.template = nil
	m.status = ""
	m.refresh()
	if newID > 0 {
		m.setCursorByID(newID)
	} else if selectedID > 0 {
		m.setCursorByID(selectedID)
	}
	return m, nil
}

func (m model) submitCommandForm() (tea.Model, tea.Cmd) {
	if m.form == nil {
		return m, nil
	}

	values := commandFormValues{
		Name:        m.form.fields[0].value,
		Command:     m.form.fields[1].value,
		Description: m.form.fields[2].value,
		Tags:        m.form.fields[3].value,
	}
	command, errMessage := buildCommandFromForm(values, m.cfg.Commands, m.form.editingID, m.form.aliases)
	if errMessage != "" {
		m.form.err = errMessage
		return m, nil
	}

	next := cloneConfig(m.cfg)
	var saved Command
	if m.form.editingID > 0 {
		if !updateCommand(&next, command) {
			m.form.err = "Could not find the command being edited."
			return m, nil
		}
		saved = command
	} else {
		saved = addCommand(&next, command)
	}

	return m.commitConfig(next, "save the command", saved.ID, saved.ID)
}

func (m model) runSelected() (tea.Model, tea.Cmd) {
	selected := m.selected()
	if selected == nil {
		return m, nil
	}

	if len(extractPlaceholders(selected.Command)) > 0 {
		m.template = newTemplateState(*selected)
		m.screen = templateScreen
		return m, nil
	}

	next := cloneConfig(m.cfg)
	touchRecent(&next, selected.ID, time.Now().UnixMilli())
	if err := saveConfig(m.configPath, next); err != nil {
		m.saveErr = err
	} else {
		m.cfg = next
	}
	m.pendingCommand = selected.Command
	return m, tea.Quit
}

func (m model) submitTemplate() (tea.Model, tea.Cmd) {
	if m.template == nil {
		return m, nil
	}

	values := make(map[string]string, len(m.template.fields))
	for index, field := range m.template.fields {
		values[m.template.placeholders[index].Name] = field.value
	}
	filled := fillTemplate(m.template.command.Command, values)

	next := cloneConfig(m.cfg)
	touchRecent(&next, m.template.command.ID, time.Now().UnixMilli())
	if err := saveConfig(m.configPath, next); err != nil {
		m.saveErr = err
	} else {
		m.cfg = next
	}
	m.pendingCommand = filled
	return m, tea.Quit
}

func newCommandForm(command *Command) *commandFormState {
	fields := []textField{
		{label: "Name"},
		{label: "Command"},
		{label: "Description"},
		{label: "Tags"},
	}
	form := &commandFormState{
		title:  "Add New Command",
		fields: fields,
	}

	if command == nil {
		return form
	}

	form.editingID = command.ID
	form.aliases = append([]string(nil), command.Aliases...)
	if command.ID > 0 {
		form.title = "Edit Command"
	}
	form.fields[0].value = command.Name
	form.fields[1].value = command.Command
	form.fields[2].value = command.Description
	form.fields[3].value = strings.Join(command.Tags, ", ")
	for index := range form.fields {
		form.fields[index].cursor = len([]rune(form.fields[index].value))
	}
	return form
}

func newTemplateState(command Command) *templateState {
	placeholders := extractPlaceholders(command.Command)
	fields := make([]textField, len(placeholders))
	for index, placeholder := range placeholders {
		fields[index] = textField{label: placeholder.Name}
	}
	return &templateState{
		command:      command,
		placeholders: placeholders,
		fields:       fields,
	}
}

func loadHistoryCmd() tea.Cmd {
	return func() tea.Msg {
		return historyLoadedMsg{commands: getLastCommands(30)}
	}
}

func (f *textField) update(message tea.KeyMsg) {
	switch message.String() {
	case "left":
		if f.cursor > 0 {
			f.cursor--
		}
		return
	case "right":
		if f.cursor < len([]rune(f.value)) {
			f.cursor++
		}
		return
	case "home":
		f.cursor = 0
		return
	case "end":
		f.cursor = len([]rune(f.value))
		return
	case "backspace":
		f.backspace()
		return
	case "delete":
		f.deleteForward()
		return
	case " ":
		f.insert(" ")
		return
	case "ctrl+u":
		f.value = ""
		f.cursor = 0
		return
	}

	if message.Type == tea.KeyRunes && len(message.Runes) > 0 {
		f.insert(string(message.Runes))
	}
}

func (f *textField) insert(text string) {
	runes := []rune(f.value)
	if f.cursor > len(runes) {
		f.cursor = len(runes)
	}
	insert := []rune(text)
	updated := make([]rune, 0, len(runes)+len(insert))
	updated = append(updated, runes[:f.cursor]...)
	updated = append(updated, insert...)
	updated = append(updated, runes[f.cursor:]...)
	f.value = string(updated)
	f.cursor += len(insert)
}

func (f *textField) backspace() {
	runes := []rune(f.value)
	if f.cursor <= 0 || f.cursor > len(runes) {
		return
	}
	f.value = string(append(runes[:f.cursor-1], runes[f.cursor:]...))
	f.cursor--
}

func (f *textField) deleteForward() {
	runes := []rune(f.value)
	if f.cursor < 0 || f.cursor >= len(runes) {
		return
	}
	f.value = string(append(runes[:f.cursor], runes[f.cursor+1:]...))
}

func (m model) View() string {
	switch m.screen {
	case searchScreen:
		return m.viewSearch()
	case addHistoryScreen:
		return m.viewAddHistory()
	case commandFormScreen:
		return m.viewCommandForm()
	case deleteScreen:
		return m.viewDelete()
	case templateScreen:
		return m.viewTemplate()
	case errorScreen:
		return m.viewError()
	default:
		return m.viewMenu()
	}
}

func (m model) viewMenu() string {
	width := m.terminalWidth()
	height := m.terminalHeight()
	lines := []string{titleStyle.Render("My Commands"), ""}

	if len(m.ordered) == 0 {
		lines = append(lines, dimStyle.Render("No commands yet. Press a to add one."))
	} else {
		lines = append(lines, m.renderCommandList(m.filtered, m.cursor, maxInt(3, height-7), width)...)
	}

	lines = append(lines, "")
	if m.status != "" {
		lines = append(lines, statusStyle.Render(m.status))
	}
	lines = append(lines, dimStyle.Render("↑↓: Navigate | Enter/1-9: Select | f: Favorite | a: Add | d: Delete | e: Edit | c: Clone | /: Search | Ctrl+C: Quit"))
	return strings.Join(lines, "\n")
}

func (m model) viewSearch() string {
	width := m.terminalWidth()
	height := m.terminalHeight()
	lines := []string{
		titleStyle.Render("Search Commands"),
		"> " + m.query + "█",
		"",
	}

	if len(m.filtered) == 0 {
		lines = append(lines, dimStyle.Render("No commands found"))
	} else {
		lines = append(lines, m.renderCommandList(m.filtered, m.cursor, maxInt(3, height-8), width)...)
	}

	lines = append(lines, "")
	lines = append(lines, dimStyle.Render("↑↓: Navigate | Enter: Select | Escape: Menu | Ctrl+C: Quit"))
	return strings.Join(lines, "\n")
}

func (m model) viewAddHistory() string {
	height := m.terminalHeight()
	lines := []string{titleStyle.Render("Add Command - Shell History"), ""}

	switch {
	case !m.historyLoaded:
		lines = append(lines, dimStyle.Render("Loading shell history..."))
	case len(m.history) == 0:
		lines = append(lines, dimStyle.Render(m.historyErr))
	default:
		listHeight := maxInt(3, height-7)
		start, end := windowBounds(len(m.history), m.historyCursor, listHeight)
		for index := start; index < end; index++ {
			prefix := "  "
			line := fmt.Sprintf("%s%2d. %s", prefix, index+1, truncate(m.history[index], m.terminalWidth()-8))
			if index == m.historyCursor {
				line = selectedStyle.Render(line)
			}
			lines = append(lines, line)
		}
	}

	lines = append(lines, "")
	lines = append(lines, dimStyle.Render("↑↓: Navigate | Enter: Select | n: New command | Escape: Cancel"))
	return strings.Join(lines, "\n")
}

func (m model) viewCommandForm() string {
	if m.form == nil {
		return ""
	}

	lines := []string{titleStyle.Render(m.form.title), ""}
	fieldWidth := maxInt(10, m.terminalWidth()-20)
	for index, field := range m.form.fields {
		label := fmt.Sprintf("%-12s", field.label+":")
		value := field.display(fieldWidth, index == m.form.focus)
		if index == m.form.focus {
			label = activeStyle.Render(label)
		}
		lines = append(lines, label+" "+value)
	}

	if m.form.err != "" {
		lines = append(lines, "")
		lines = append(lines, statusStyle.Render(m.form.err))
	}

	lines = append(lines, "")
	lines = append(lines, dimStyle.Render("↑/↓ to navigate | Escape to cancel | Enter on last field to submit"))
	return strings.Join(lines, "\n")
}

func (m model) viewDelete() string {
	lines := []string{titleStyle.Render("Delete Command"), ""}
	if m.deleteTarget != nil {
		lines = append(lines, "Delete \""+m.deleteTarget.Name+"\"?")
		lines = append(lines, dimStyle.Render("Command: "+m.deleteTarget.Command))
		lines = append(lines, "")
		lines = append(lines, "This will remove it from config, favorites, and recent.")
	}
	lines = append(lines, "")
	lines = append(lines, dimStyle.Render("[Enter/Y] Confirm | [N] Cancel | Escape: Back"))
	return strings.Join(lines, "\n")
}

func (m model) viewTemplate() string {
	if m.template == nil {
		return ""
	}

	height := m.terminalHeight()
	listHeight := maxInt(3, height-7)
	start, end := windowBounds(len(m.template.fields), m.template.focus, listHeight)
	fieldWidth := maxInt(10, m.terminalWidth()-24)

	lines := []string{titleStyle.Render("Template Variables"), ""}
	for index := start; index < end; index++ {
		field := m.template.fields[index]
		label := fmt.Sprintf("%-12s", field.label+":")
		value := field.display(fieldWidth, index == m.template.focus)
		if index == m.template.focus {
			label = activeStyle.Render(label)
		}
		lines = append(lines, label+" "+value)
	}
	lines = append(lines, "")
	lines = append(lines, dimStyle.Render("↑/↓ to navigate | Escape to cancel | Enter on last field to submit"))
	return strings.Join(lines, "\n")
}

func (m model) viewError() string {
	lines := []string{titleStyle.Render("Error"), ""}
	if m.uiErr != nil {
		lines = append(lines, statusStyle.Render(m.uiErr.message))
	}
	lines = append(lines, "")
	lines = append(lines, dimStyle.Render("Press Enter or Escape to return to the menu."))
	return strings.Join(lines, "\n")
}

func (m model) renderCommandList(commands []Command, cursor int, listHeight int, width int) []string {
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

	start, end := windowBounds(len(commands), cursor, listHeight)
	lines := make([]string, 0, end-start)
	for index := start; index < end; index++ {
		command := commands[index]
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
		case index == cursor:
			line = selectedStyle.Render(line)
		case isFavorite(m.cfg, command.ID):
			line = favoriteStyle.Render(line)
		}
		lines = append(lines, line)
	}
	return lines
}

func (m model) terminalWidth() int {
	if m.width > 0 {
		return m.width
	}
	return 80
}

func (m model) terminalHeight() int {
	if m.height > 0 {
		return m.height
	}
	return 24
}

func windowBounds(length int, cursor int, window int) (int, int) {
	if length == 0 {
		return 0, 0
	}
	if window < 1 {
		window = 1
	}
	if cursor < 0 {
		cursor = 0
	}
	if cursor >= length {
		cursor = length - 1
	}

	start := 0
	if cursor >= window {
		start = cursor - window + 1
	}
	end := start + window
	if end > length {
		end = length
	}
	return start, end
}

func (f textField) display(width int, focused bool) string {
	if width <= 0 {
		return ""
	}
	if !focused {
		return truncate(f.value, width)
	}

	runes := []rune(f.value)
	if f.cursor < 0 {
		f.cursor = 0
	}
	if f.cursor > len(runes) {
		f.cursor = len(runes)
	}

	start := 0
	if f.cursor >= width {
		start = f.cursor - width + 1
	}
	end := start + width
	if end > len(runes) {
		end = len(runes)
	}

	before := string(runes[start:f.cursor])
	cursorRune := " "
	after := ""
	if f.cursor < len(runes) {
		cursorRune = string(runes[f.cursor])
		if f.cursor+1 < end {
			after = string(runes[f.cursor+1 : end])
		}
	}

	return before + selectedStyle.Render(cursorRune) + after
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

func maxInt(left int, right int) int {
	if left > right {
		return left
	}
	return right
}
