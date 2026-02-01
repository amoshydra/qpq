#!/usr/bin/env node

import { execSync } from 'child_process';
import * as os from 'os';

function detectShell(): string {
  const shell = process.env.SHELL || process.env.COMSPEC;

  if (shell && shell.includes('zsh')) {
    return 'zsh';
  }
  if (shell && shell.includes('bash')) {
    return 'bash';
  }
  if (shell && shell.includes('fish')) {
    return 'fish';
  }
  if (shell && (shell.includes('powershell') || shell.includes('pwsh'))) {
    return 'powershell';
  }

  const platform = os.platform();
  if (platform === 'win32') {
    return 'powershell';
  }

  return 'zsh';
}

function captureShellHistory(count: number = 40): string[] {
  const shell = detectShell();

  try {
    let output = '';

    switch (shell) {
      case 'zsh':
        output = execSync('zsh -c "history | tail -n ' + count + '"', { encoding: 'utf-8' });
        break;
      case 'bash':
        output = execSync('bash -c "history | tail -n ' + count + '"', { encoding: 'utf-8' });
        break;
      case 'fish':
        output = execSync('fish -c "history"', { encoding: 'utf-8' });
        break;
      case 'powershell':
        output = execSync('pwsh -c "Get-History -Count ' + count + ' | ForEach-Object { $_.CommandLine }"', { encoding: 'utf-8' });
        break;
      default:
        output = execSync('history | tail -n ' + count, { encoding: 'utf-8' });
    }

    let commands: string[];
    if (shell === 'zsh' || shell === 'bash') {
      commands = output.trim().split('\n')
        .map(line => line.replace(/^[ \t]*\d+[ \t]+/, ''))
        .filter(Boolean);
    } else {
      commands = output.trim().split('\n').filter(Boolean);
    }

    return commands;
  } catch {
    return [];
  }
}

function dedupeCommands(commands: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const cmd of commands.reverse()) {
    const trimmed = cmd.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }

  return result.reverse();
}

const historyCommands = captureShellHistory(40);

if (historyCommands.length > 0) {
  const uniqueCommands = dedupeCommands(historyCommands);
  const historyString = uniqueCommands.join('|');
  process.env.QPQ_SHELL_HISTORY = Buffer.from(historyString).toString('base64');
}

import { render } from 'ink';
import { App } from './components/App.js';

const program = render(<App />);
await program.waitUntilExit();
