import type { Command } from '../types/command.js';

export function orderCommands(
  commands: Command[],
  favorites: number[],
  timestamps: Map<number, number>,
): Command[] {
  const favoriteCommands = commands.filter((command) => favorites.includes(command.id));

  const otherCommands = commands
    .filter((command) => !favorites.includes(command.id))
    .sort((a, b) => {
      const aTime = timestamps.get(a.id) || 0;
      const bTime = timestamps.get(b.id) || 0;

      if (aTime === 0 && bTime === 0) {
        return a.name.localeCompare(b.name);
      }
      if (aTime === 0) {
        return 1;
      }
      if (bTime === 0) {
        return -1;
      }
      return bTime - aTime;
    });

  return [...favoriteCommands, ...otherCommands];
}

export function getSelectedIndex(commands: Command[], selectedId: number | null): number {
  if (selectedId === null) {
    return 0;
  }

  const index = commands.findIndex((command) => command.id === selectedId);

  return index >= 0 ? index : 0;
}
