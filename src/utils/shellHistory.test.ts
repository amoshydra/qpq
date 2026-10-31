import { describe, expect, it } from 'vitest';
import { parseHistoryFile, toNewestFirst } from './shellHistory.js';

describe('parseHistoryFile', () => {
  it('parses zsh extended history and keeps semicolons in commands', () => {
    const content = [
      ': 1700000000:0;ls',
      ': 1700000001:0;git status',
      ': 1700000002:0;echo one; echo two',
    ].join('\n');

    expect(parseHistoryFile(content, 'zsh')).toEqual([
      'ls',
      'git status',
      'echo one; echo two',
    ]);
  });

  it('parses bash history and ignores timestamp lines', () => {
    const content = 'ls\n#1700000000\ngit status\n\n';

    expect(parseHistoryFile(content, 'bash')).toEqual(['ls', 'git status']);
  });

  it('parses fish history command lines', () => {
    const content = [
      '- cmd: ls',
      '  when: 1700000000',
      '- cmd: git status',
      '  when: 1700000001',
    ].join('\n');

    expect(parseHistoryFile(content, 'fish')).toEqual(['ls', 'git status']);
  });

  it('parses powershell history as plain lines', () => {
    expect(parseHistoryFile('ls\ngit status\n', 'powershell')).toEqual(['ls', 'git status']);
  });
});

describe('toNewestFirst', () => {
  it('reverses oldest-first input and removes duplicates keeping the newest', () => {
    expect(toNewestFirst(['old', 'new', 'old', 'oldest'])).toEqual(['oldest', 'old', 'new']);
  });

  it('trims entries and drops empty commands', () => {
    expect(toNewestFirst(['  ls  ', '', '   ', 'git status'])).toEqual(['git status', 'ls']);
  });

  it('returns an empty array for empty input', () => {
    expect(toNewestFirst([])).toEqual([]);
  });
});
