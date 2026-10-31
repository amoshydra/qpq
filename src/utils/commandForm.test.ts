import { describe, expect, it } from 'vitest';
import type { Command } from '../types/command.js';
import { buildCommandFromForm } from './commandForm.js';

const existingCommands: Command[] = [
  { id: 1, name: 'Git Status', command: 'git status' },
  { id: 2, name: 'Deploy', command: 'deploy.sh' },
];

function values(overrides: Partial<{ name: string; command: string; description: string; tags: string }> = {}) {
  return {
    name: 'Git Log',
    command: 'git log',
    description: '',
    tags: '',
    ...overrides,
  };
}

describe('buildCommandFromForm', () => {
  it('builds a command and trims input', () => {
    const result = buildCommandFromForm(values({
      name: '  Git Log  ',
      command: '  git log  ',
      description: '  Show history  ',
      tags: ' git, log ',
    }), existingCommands);

    expect(result).toEqual({
      ok: true,
      command: {
        name: 'Git Log',
        command: 'git log',
        description: 'Show history',
        tags: ['git', 'log'],
      },
    });
  });

  it('requires a command', () => {
    const result = buildCommandFromForm(values({ command: '   ' }), existingCommands);

    expect(result).toEqual({ ok: false, error: 'Command is required.' });
  });

  it('falls back to the command text when the name is empty', () => {
    const result = buildCommandFromForm(values({ name: ' ', command: 'echo hello' }), existingCommands);

    expect(result).toEqual({
      ok: true,
      command: {
        name: 'echo hello',
        command: 'echo hello',
        description: undefined,
        tags: undefined,
      },
    });
  });

  it('rejects duplicate names case-insensitively', () => {
    const result = buildCommandFromForm(values({ name: 'git status', command: 'git status --short' }), existingCommands);

    expect(result).toEqual({ ok: false, error: 'A command named "git status" already exists.' });
  });

  it('allows the current command to keep its name while editing', () => {
    const result = buildCommandFromForm(
      values({ name: 'Deploy', command: 'deploy.sh --prod' }),
      existingCommands,
      2,
    );

    expect(result.ok).toBe(true);
  });

  it('still rejects another command name while editing', () => {
    const result = buildCommandFromForm(
      values({ name: 'Git Status', command: 'deploy.sh' }),
      existingCommands,
      2,
    );

    expect(result).toEqual({ ok: false, error: 'A command named "Git Status" already exists.' });
  });

  it('deduplicates tags and omits empty optional fields', () => {
    const result = buildCommandFromForm(values({
      name: 'Tagged',
      command: 'tagged',
      tags: 'one, one, two',
    }), existingCommands);

    expect(result.ok && result.command.tags).toEqual(['one', 'two']);
    expect(result.ok && result.command.description).toBeUndefined();
  });
});
