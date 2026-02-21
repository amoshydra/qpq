import type { Command } from '../types/command.js';

export function fuzzySearch(
  commands: Command[],
  query: string
): Command[] {
  if (!query || query.length < 1) {
    return commands;
  }

  const queryLower = query.toLowerCase();

  return commands.filter(command => {
    // Search in name
    if (command.name.toLowerCase().includes(queryLower)) {
      return true;
    }

    // Search in description
    if (command.description && command.description.toLowerCase().includes(queryLower)) {
      return true;
    }

    // Search in tags
    if (command.tags && command.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
      return true;
    }

    // Search in aliases
    if (command.aliases && command.aliases.some(alias => alias.toLowerCase().includes(queryLower))) {
      return true;
    }

    return false;
  });
}