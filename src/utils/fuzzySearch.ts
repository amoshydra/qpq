import Fuse from 'fuse.js';
import type { Command } from '../types/command.js';

export function fuzzySearch(
  commands: Command[],
  query: string
): Command[] {
  if (!query || query.length < 1) {
    return commands;
  }

  const fuse = new Fuse(commands, {
    keys: ['name', 'description', 'tags', 'aliases'],
    threshold: 0.4,
    ignoreLocation: true,
  });

  const results = fuse.search(query);
  return results.map(result => result.item);
}