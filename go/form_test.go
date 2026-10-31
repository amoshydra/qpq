package main

import "testing"

func TestBuildCommandFromForm(t *testing.T) {
	existing := []Command{
		{ID: 1, Name: "Alpha", Command: "echo alpha"},
		{ID: 2, Name: "Beta", Command: "echo beta"},
	}

	command, errMessage := buildCommandFromForm(commandFormValues{
		Name:        "  New Command  ",
		Command:     "  echo new  ",
		Description: "  description  ",
		Tags:        " one, one, two ",
	}, existing, 0, []string{"alias"})

	if errMessage != "" {
		t.Fatalf("unexpected error: %s", errMessage)
	}
	if command.Name != "New Command" || command.Command != "echo new" {
		t.Fatalf("command = %+v", command)
	}
	if command.Description != "description" {
		t.Fatalf("description = %q", command.Description)
	}
	if len(command.Tags) != 2 || command.Tags[0] != "one" || command.Tags[1] != "two" {
		t.Fatalf("tags = %v", command.Tags)
	}
	if len(command.Aliases) != 1 || command.Aliases[0] != "alias" {
		t.Fatalf("aliases = %v", command.Aliases)
	}
}

func TestBuildCommandFallsBackToCommandText(t *testing.T) {
	command, errMessage := buildCommandFromForm(commandFormValues{
		Command: "echo hello",
	}, nil, 0, nil)

	if errMessage != "" {
		t.Fatalf("unexpected error: %s", errMessage)
	}
	if command.Name != "echo hello" {
		t.Fatalf("name = %q", command.Name)
	}
}

func TestBuildCommandRequiresCommand(t *testing.T) {
	_, errMessage := buildCommandFromForm(commandFormValues{Command: "   "}, nil, 0, nil)
	if errMessage != "Command is required." {
		t.Fatalf("error = %q", errMessage)
	}
}

func TestBuildCommandRejectsDuplicateName(t *testing.T) {
	existing := []Command{{ID: 1, Name: "Alpha", Command: "echo alpha"}}

	_, errMessage := buildCommandFromForm(commandFormValues{
		Name:    "alpha",
		Command: "echo different",
	}, existing, 0, nil)

	if errMessage != `A command named "alpha" already exists.` {
		t.Fatalf("error = %q", errMessage)
	}
}

func TestBuildCommandAllowsEditingSameName(t *testing.T) {
	existing := []Command{{ID: 1, Name: "Alpha", Command: "echo alpha"}}

	_, errMessage := buildCommandFromForm(commandFormValues{
		Name:    "Alpha",
		Command: "echo updated",
	}, existing, 1, nil)

	if errMessage != "" {
		t.Fatalf("unexpected error: %s", errMessage)
	}
}
