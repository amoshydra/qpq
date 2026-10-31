import { describe, expect, it } from 'vitest';
import type { Command } from '../types/command.js';
import type { Config } from '../types/config.js';
import {
  addCommand,
  duplicateCommand,
  removeCommand,
  toggleFavorite,
  updateCommand,
} from './configMutations.js';

function makeCommand(id: number, name: string): Command {
  return { id, name, command: `echo ${name.toLowerCase()}` };
}

function makeConfig(): Config {
  return {
    commands: [
      makeCommand(1, 'Alpha'),
      makeCommand(2, 'Beta'),
      makeCommand(3, 'Gamma'),
    ],
    favorites: [2],
    recent: [
      { id: 3, timestamp: 300 },
      { id: 1, timestamp: 100 },
    ],
    nextId: 4,
  };
}

describe('addCommand', () => {
  it('assigns the next id and preserves favorites and recent history', () => {
    const config = makeConfig();
    const updated = addCommand(config, { id: 0, name: 'Delta', command: 'echo delta' });

    expect(updated.commands).toHaveLength(4);
    expect(updated.commands[3]).toEqual({ id: 4, name: 'Delta', command: 'echo delta' });
    expect(updated.favorites).toEqual(config.favorites);
    expect(updated.recent).toEqual(config.recent);
    expect(updated.nextId).toBe(5);
  });

  it('uses an id above the highest existing id even when nextId is stale', () => {
    const config = { ...makeConfig(), nextId: 1 };
    const updated = addCommand(config, { id: 0, name: 'Delta', command: 'echo delta' });

    expect(updated.commands[3].id).toBe(4);
    expect(updated.nextId).toBe(5);
  });
});

describe('duplicateCommand', () => {
  it('creates a uniquely named copy and preserves favorites and recent history', () => {
    const config = makeConfig();
    const updated = duplicateCommand(config, config.commands[1]);

    expect(updated.commands).toHaveLength(4);
    expect(updated.commands[3]).toMatchObject({
      id: 4,
      name: 'Beta (Copy)',
      command: 'echo beta',
    });
    expect(updated.favorites).toEqual(config.favorites);
    expect(updated.recent).toEqual(config.recent);
  });

  it('increments the copy suffix when the name is already taken', () => {
    const config = makeConfig();
    const firstCopy = duplicateCommand(config, config.commands[1]);
    const secondCopy = duplicateCommand(firstCopy, config.commands[1]);

    expect(secondCopy.commands.map(command => command.name)).toContain('Beta (Copy 2)');
  });
});

describe('updateCommand', () => {
  it('replaces the command without touching favorites or recent history', () => {
    const config = makeConfig();
    const updated = updateCommand(config, {
      id: 2,
      name: 'Beta Updated',
      command: 'echo beta-updated',
    });

    expect(updated.commands[1].name).toBe('Beta Updated');
    expect(updated.favorites).toEqual(config.favorites);
    expect(updated.recent).toEqual(config.recent);
    expect(updated.recent.map(entry => entry.timestamp)).toEqual([300, 100]);
  });

  it('leaves commands unchanged when the id does not exist', () => {
    const config = makeConfig();
    const updated = updateCommand(config, makeCommand(99, 'Missing'));

    expect(updated.commands).toEqual(config.commands);
  });
});

describe('removeCommand', () => {
  it('removes the command from commands, favorites, and recent while preserving order', () => {
    const config = makeConfig();
    const updated = removeCommand(config, 3);

    expect(updated.commands.map(command => command.id)).toEqual([1, 2]);
    expect(updated.favorites).toEqual([2]);
    expect(updated.recent).toEqual([{ id: 1, timestamp: 100 }]);
  });

  it('removes a favorited command from favorites', () => {
    const config = makeConfig();
    const updated = removeCommand(config, 2);

    expect(updated.favorites).toEqual([]);
    expect(updated.recent).toEqual(config.recent);
  });

  it('is a no-op for an unknown id', () => {
    const config = makeConfig();
    const updated = removeCommand(config, 99);

    expect(updated.commands).toEqual(config.commands);
    expect(updated.favorites).toEqual(config.favorites);
    expect(updated.recent).toEqual(config.recent);
  });
});

describe('toggleFavorite', () => {
  it('adds and removes favorites', () => {
    const config = makeConfig();
    const added = toggleFavorite(config, 1);
    const removed = toggleFavorite(added, 2);

    expect(added.favorites).toEqual([2, 1]);
    expect(removed.favorites).toEqual([1]);
  });

  it('returns the original config for an unknown command', () => {
    const config = makeConfig();

    expect(toggleFavorite(config, 99)).toBe(config);
  });

  it('does not mutate the input config', () => {
    const config = makeConfig();
    toggleFavorite(config, 1);

    expect(config.favorites).toEqual([2]);
  });
});
