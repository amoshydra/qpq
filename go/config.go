package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
)

const maxRecent = 20

type Command struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Command     string   `json:"command"`
	Description string   `json:"description,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	Aliases     []string `json:"aliases,omitempty"`
}

type RecentEntry struct {
	ID        int   `json:"id"`
	Timestamp int64 `json:"timestamp"`
}

type Config struct {
	Commands  []Command     `json:"commands"`
	Favorites []int         `json:"favorites"`
	Recent    []RecentEntry `json:"recent"`
	NextID    int           `json:"nextId"`
}

type rawConfig struct {
	Commands  []Command         `json:"commands"`
	Favorites []json.RawMessage `json:"favorites"`
	Recent    []json.RawMessage `json:"recent"`
	NextID    int               `json:"nextId"`
}

type rawRecent struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Timestamp int64  `json:"timestamp"`
}

var placeholderPattern = regexp.MustCompile(`\{[A-Za-z0-9_]+\}`)

func configPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("could not determine home directory: %w", err)
	}

	switch runtime.GOOS {
	case "windows":
		base := os.Getenv("LOCALAPPDATA")
		if base == "" {
			base = filepath.Join(home, "AppData", "Local")
		}
		return filepath.Join(base, "qpq", "config.json"), nil
	case "darwin":
		return filepath.Join(home, "Library", "Application Support", "qpq", "config.json"), nil
	default:
		return filepath.Join(home, ".local", "state", "qpq", "config.json"), nil
	}
}

func defaultConfig() Config {
	return Config{
		Commands: []Command{
			{
				ID:          1,
				Name:        "Git Status",
				Command:     "git status",
				Description: "Show working tree status",
				Tags:        []string{"git"},
			},
			{
				ID:          2,
				Name:        "List Files",
				Command:     "ls -la",
				Description: "List files with details",
				Tags:        []string{"system"},
			},
			{
				ID:          3,
				Name:        "Show Path",
				Command:     "echo $PATH",
				Description: "Show PATH environment variable",
				Tags:        []string{"system"},
			},
		},
		Favorites: []int{},
		Recent:    []RecentEntry{},
		NextID:    4,
	}
}

func loadConfig(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		cfg := defaultConfig()
		if saveErr := saveConfig(path, cfg); saveErr != nil {
			return Config{}, fmt.Errorf("create config: %w", saveErr)
		}
		return cfg, nil
	}
	if err != nil {
		return Config{}, fmt.Errorf("read config %s: %w", path, err)
	}

	var raw rawConfig
	if err := json.Unmarshal(data, &raw); err != nil {
		return Config{}, fmt.Errorf("parse config %s: %w", path, err)
	}

	return normalizeConfig(raw)
}

func normalizeConfig(raw rawConfig) (Config, error) {
	cfg := Config{
		Commands:  raw.Commands,
		Favorites: []int{},
		Recent:    []RecentEntry{},
		NextID:    raw.NextID,
	}
	if cfg.Commands == nil {
		cfg.Commands = []Command{}
	}
	if cfg.NextID < 1 {
		cfg.NextID = 1
	}

	usedIDs := make(map[int]bool, len(cfg.Commands))
	for index := range cfg.Commands {
		command := &cfg.Commands[index]
		command.Name = strings.TrimSpace(command.Name)
		command.Command = strings.TrimSpace(command.Command)
		if command.Name == "" || command.Command == "" {
			return Config{}, fmt.Errorf("command %d is missing a name or command", index+1)
		}
		if command.ID < 1 || usedIDs[command.ID] {
			command.ID = cfg.NextID
		}
		usedIDs[command.ID] = true
		if command.ID >= cfg.NextID {
			cfg.NextID = command.ID + 1
		}
	}

	idByName := make(map[string]int, len(cfg.Commands))
	for _, command := range cfg.Commands {
		idByName[command.Name] = command.ID
	}

	favoriteIDs := make(map[int]bool, len(raw.Favorites))
	for _, rawFavorite := range raw.Favorites {
		var id int
		if err := json.Unmarshal(rawFavorite, &id); err != nil {
			var name string
			if err := json.Unmarshal(rawFavorite, &name); err != nil {
				continue
			}
			id = idByName[name]
		}
		if id > 0 && usedIDs[id] && !favoriteIDs[id] {
			favoriteIDs[id] = true
			cfg.Favorites = append(cfg.Favorites, id)
		}
	}

	recentIDs := make(map[int]bool, len(raw.Recent))
	for _, rawEntry := range raw.Recent {
		var entry rawRecent
		if err := json.Unmarshal(rawEntry, &entry); err != nil {
			continue
		}
		id := entry.ID
		if entry.Name != "" {
			id = idByName[entry.Name]
		}
		if id < 1 || !usedIDs[id] || recentIDs[id] {
			continue
		}
		recentIDs[id] = true
		cfg.Recent = append(cfg.Recent, RecentEntry{ID: id, Timestamp: entry.Timestamp})
	}

	return cfg, nil
}

func saveConfig(path string, cfg Config) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create config directory: %w", err)
	}

	if cfg.Commands == nil {
		cfg.Commands = []Command{}
	}
	if cfg.Favorites == nil {
		cfg.Favorites = []int{}
	}
	if cfg.Recent == nil {
		cfg.Recent = []RecentEntry{}
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("encode config: %w", err)
	}
	data = append(data, '\n')

	temporary, err := os.CreateTemp(filepath.Dir(path), ".qpq-*.tmp")
	if err != nil {
		return fmt.Errorf("create temporary config: %w", err)
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)

	if _, err := temporary.Write(data); err != nil {
		temporary.Close()
		return fmt.Errorf("write temporary config: %w", err)
	}
	if err := temporary.Chmod(0o644); err != nil {
		temporary.Close()
		return fmt.Errorf("set config permissions: %w", err)
	}
	if err := temporary.Close(); err != nil {
		return fmt.Errorf("close temporary config: %w", err)
	}
	if err := os.Rename(temporaryPath, path); err != nil {
		return fmt.Errorf("replace config: %w", err)
	}

	return nil
}

func orderedCommands(cfg Config) []Command {
	favorites := make(map[int]bool, len(cfg.Favorites))
	for _, id := range cfg.Favorites {
		favorites[id] = true
	}

	recent := make(map[int]int64, len(cfg.Recent))
	for _, entry := range cfg.Recent {
		if entry.Timestamp > recent[entry.ID] {
			recent[entry.ID] = entry.Timestamp
		}
	}

	ordered := make([]Command, 0, len(cfg.Commands))
	others := make([]Command, 0, len(cfg.Commands))
	for _, command := range cfg.Commands {
		if favorites[command.ID] {
			ordered = append(ordered, command)
		} else {
			others = append(others, command)
		}
	}

	sort.SliceStable(others, func(left, right int) bool {
		leftTime := recent[others[left].ID]
		rightTime := recent[others[right].ID]

		if leftTime == 0 && rightTime == 0 {
			return strings.ToLower(others[left].Name) < strings.ToLower(others[right].Name)
		}
		if leftTime == 0 {
			return false
		}
		if rightTime == 0 {
			return true
		}
		return leftTime > rightTime
	})

	return append(ordered, others...)
}

func filterCommands(commands []Command, query string) []Command {
	query = strings.ToLower(query)
	if query == "" {
		return commands
	}

	filtered := make([]Command, 0, len(commands))
	for _, command := range commands {
		if matches(command, query) {
			filtered = append(filtered, command)
		}
	}

	return filtered
}

func matches(command Command, query string) bool {
	if strings.Contains(strings.ToLower(command.Name), query) {
		return true
	}
	if strings.Contains(strings.ToLower(command.Command), query) {
		return true
	}
	if strings.Contains(strings.ToLower(command.Description), query) {
		return true
	}
	for _, tag := range command.Tags {
		if strings.Contains(strings.ToLower(tag), query) {
			return true
		}
	}
	for _, alias := range command.Aliases {
		if strings.Contains(strings.ToLower(alias), query) {
			return true
		}
	}
	return false
}

func hasPlaceholders(command string) bool {
	return placeholderPattern.MatchString(command)
}

func isFavorite(cfg Config, commandID int) bool {
	for _, id := range cfg.Favorites {
		if id == commandID {
			return true
		}
	}
	return false
}

func toggleFavorite(cfg *Config, commandID int) bool {
	found := false
	for _, command := range cfg.Commands {
		if command.ID == commandID {
			found = true
			break
		}
	}
	if !found {
		return false
	}

	for index, id := range cfg.Favorites {
		if id == commandID {
			cfg.Favorites = append(cfg.Favorites[:index], cfg.Favorites[index+1:]...)
			return true
		}
	}

	cfg.Favorites = append(cfg.Favorites, commandID)
	return true
}

func touchRecent(cfg *Config, commandID int, timestamp int64) {
	found := false
	for _, command := range cfg.Commands {
		if command.ID == commandID {
			found = true
			break
		}
	}
	if !found {
		return
	}

	recent := make([]RecentEntry, 0, len(cfg.Recent)+1)
	recent = append(recent, RecentEntry{ID: commandID, Timestamp: timestamp})
	for _, entry := range cfg.Recent {
		if entry.ID != commandID {
			recent = append(recent, entry)
		}
	}
	if len(recent) > maxRecent {
		recent = recent[:maxRecent]
	}
	cfg.Recent = recent
}
