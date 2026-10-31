import { describe, expect, it } from 'vitest';
import type { Command } from '../types/command.js';
import { getSelectedIndex, orderCommands } from './commandOrder.js';

const commands: Command[] = [
  { id: 1, name: 'Zulu', command: 'echo zulu' },
  { id: 2, name: 'Alpha', command: 'echo alpha' },
  { id: 3, name: 'Mike', command: 'echo mike' },
  { id: 4, name: 'Bravo', command: 'echo bravo' },
];

describe('orderCommands', () => {
  it('places favorites first in config order, then sorts the rest by recency', () => {
    const ordered = orderCommands(
      commands,
      [3, 1],
      new Map([
        [2, 200],
        [4, 100],
      ]),
    );

    expect(ordered.map(command => command.name)).toEqual([
      'Zulu',
      'Mike',
      'Alpha',
      'Bravo',
    ]);
  });

  it('sorts commands without timestamps alphabetically at the bottom', () => {
    const ordered = orderCommands(
      commands,
      [],
      new Map([[4, 100]]),
    );

    expect(ordered.map(command => command.name)).toEqual([
      'Bravo',
      'Alpha',
      'Mike',
      'Zulu',
    ]);
  });

  it('does not mutate the input array', () => {
    const original = [...commands];
    orderCommands(commands, [], new Map());

    expect(commands).toEqual(original);
  });
});

describe('getSelectedIndex', () => {
  it('returns the index of the selected id', () => {
    expect(getSelectedIndex(commands, 3)).toBe(2);
  });

  it('falls back to the first command for null or missing ids', () => {
    expect(getSelectedIndex(commands, null)).toBe(0);
    expect(getSelectedIndex(commands, 99)).toBe(0);
  });
});
