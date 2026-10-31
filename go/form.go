package main

import (
	"fmt"
	"strings"
)

type commandFormValues struct {
	Name        string
	Command     string
	Description string
	Tags        string
}

func buildCommandFromForm(values commandFormValues, existing []Command, editingID int, aliases []string) (Command, string) {
	commandText := strings.TrimSpace(values.Command)
	if commandText == "" {
		return Command{}, "Command is required."
	}

	name := strings.TrimSpace(values.Name)
	if name == "" {
		name = commandText
	}

	for _, command := range existing {
		if command.ID != editingID && strings.EqualFold(strings.TrimSpace(command.Name), name) {
			return Command{}, fmt.Sprintf("A command named %q already exists.", name)
		}
	}

	tags := []string{}
	seenTags := map[string]bool{}
	for _, tag := range strings.Split(values.Tags, ",") {
		tag = strings.TrimSpace(tag)
		if tag == "" || seenTags[tag] {
			continue
		}
		seenTags[tag] = true
		tags = append(tags, tag)
	}

	description := strings.TrimSpace(values.Description)

	command := Command{
		ID:          editingID,
		Name:        name,
		Command:     commandText,
		Description: description,
		Tags:        tags,
		Aliases:     append([]string(nil), aliases...),
	}
	if len(tags) == 0 {
		command.Tags = nil
	}

	return command, ""
}
