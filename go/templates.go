package main

import (
	"regexp"
	"sort"
	"strconv"
)

type Placeholder struct {
	Name      string
	SortIndex int
	Position  int
}

var templatePlaceholderPattern = regexp.MustCompile(`\{([A-Za-z0-9_]+)(?::([0-9]+))?\}`)

func extractPlaceholders(template string) []Placeholder {
	matches := templatePlaceholderPattern.FindAllStringSubmatchIndex(template, -1)
	placeholders := make([]Placeholder, 0, len(matches))
	seen := make(map[string]bool, len(matches))

	for _, match := range matches {
		name := template[match[2]:match[3]]
		if seen[name] {
			continue
		}
		seen[name] = true

		sortIndex := 0
		if match[4] >= 0 && match[5] >= 0 {
			parsed, err := strconv.Atoi(template[match[4]:match[5]])
			if err == nil {
				sortIndex = parsed
			}
		}

		placeholders = append(placeholders, Placeholder{
			Name:      name,
			SortIndex: sortIndex,
			Position:  match[0],
		})
	}

	sort.SliceStable(placeholders, func(left, right int) bool {
		if placeholders[left].SortIndex != placeholders[right].SortIndex {
			return placeholders[left].SortIndex < placeholders[right].SortIndex
		}
		return placeholders[left].Position < placeholders[right].Position
	})

	return placeholders
}

func fillTemplate(template string, values map[string]string) string {
	return templatePlaceholderPattern.ReplaceAllStringFunc(template, func(match string) string {
		submatch := templatePlaceholderPattern.FindStringSubmatch(match)
		name := submatch[1]
		if value, ok := values[name]; ok {
			return value
		}
		return "{" + name + "}"
	})
}
