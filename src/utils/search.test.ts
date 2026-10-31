import { describe, expect, it } from 'vitest';
import type { Command } from '../types/command.js';
import { searchCommands } from './search.js';

const commands: Command[] = [
  {
    id: 1,
    name: 'Git Status',
    command: 'git status',
    description: 'Show working tree status',
    tags: ['vcs'],
    aliases: ['gs'],
  },
  {
    id: 2,
    name: 'Deploy',
    command: './scripts/deploy.sh production',
    description: 'Ship it',
    tags: ['infra'],
  },
  {
    id: 3,
    name: 'Kill Port',
    command: 'fuser -k 3000/tcp',
    tags: ['network'],
    aliases: ['free-port'],
  },
];

describe('searchCommands', () => {
  it('returns every command for an empty query', () => {
    expect(searchCommands(commands, '')).toEqual(commands);
  });

  it('matches names case-insensitively', () => {
    expect(searchCommands(commands, 'GIT').map(command => command.id)).toEqual([1]);
  });

  it('matches descriptions', () => {
    expect(searchCommands(commands, 'working tree').map(command => command.id)).toEqual([1]);
  });

  it('matches tags and aliases', () => {
    expect(searchCommands(commands, 'infra').map(command => command.id)).toEqual([2]);
    expect(searchCommands(commands, 'free-port').map(command => command.id)).toEqual([3]);
  });

  it('matches the command text', () => {
    expect(searchCommands(commands, 'fuser').map(command => command.id)).toEqual([3]);
  });

  it('preserves input order and returns no matches for unknown queries', () => {
    expect(searchCommands(commands, 'e').map(command => command.id)).toEqual([1, 2, 3]);
    expect(searchCommands(commands, 'not-a-command')).toEqual([]);
  });
});
