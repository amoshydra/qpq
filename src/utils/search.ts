import type { Command } from '../types/command.js';

export function searchCommands(
  commands: Command[],
  query: string
): Command[] {
  if (!query) {
    return commands;
  }

  const queryLower = query.toLowerCase();

  return commands.filter(command => {
    if (command.name.toLowerCase().includes(queryLower)) {
      return true;
    }

    if (command.command.toLowerCase().includes(queryLower)) {
      return true;
    }

    if (command.description?.toLowerCase().includes(queryLower)) {
      return true;
    }

    if (command.tags?.some(tag => tag.toLowerCase().includes(queryLower))) {
      return true;
    }

    if (command.aliases?.some(alias => alias.toLowerCase().includes(queryLower))) {
      return true;
    }

    return false;
  });
}
