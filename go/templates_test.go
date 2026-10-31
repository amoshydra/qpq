package main

import (
	"reflect"
	"testing"
)

func TestExtractPlaceholders(t *testing.T) {
	placeholders := extractPlaceholders("adb pair {ip:3}; adb connect {host:1}:{port}")

	if len(placeholders) != 3 {
		t.Fatalf("placeholders = %+v", placeholders)
	}
	want := []string{"port", "host", "ip"}
	for index, name := range want {
		if placeholders[index].Name != name {
			t.Fatalf("placeholder %d = %q, want %q", index, placeholders[index].Name, name)
		}
	}
}

func TestExtractPlaceholdersDeduplicates(t *testing.T) {
	placeholders := extractPlaceholders("{host}:{port} {host}")

	if len(placeholders) != 2 {
		t.Fatalf("placeholders = %+v", placeholders)
	}
	if placeholders[0].Name != "host" || placeholders[1].Name != "port" {
		t.Fatalf("placeholders = %+v", placeholders)
	}
}

func TestFillTemplate(t *testing.T) {
	filled := fillTemplate("adb connect {host}:{port}", map[string]string{
		"host": "localhost",
		"port": "5555",
	})

	if filled != "adb connect localhost:5555" {
		t.Fatalf("filled = %q", filled)
	}
}

func TestFillTemplatePreservesMissingValues(t *testing.T) {
	filled := fillTemplate("echo {host}:{port}", map[string]string{"host": "localhost"})

	if filled != "echo localhost:{port}" {
		t.Fatalf("filled = %q", filled)
	}
}

func TestPlaceholderOrderTieBreaksByPosition(t *testing.T) {
	placeholders := extractPlaceholders("{z}{a}{m}")
	names := make([]string, len(placeholders))
	for index, placeholder := range placeholders {
		names[index] = placeholder.Name
	}

	if !reflect.DeepEqual(names, []string{"z", "a", "m"}) {
		t.Fatalf("names = %v", names)
	}
}
