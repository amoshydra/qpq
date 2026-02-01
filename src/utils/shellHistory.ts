import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Buffer size strategy for shell history capture
//
// For typical developer usage with light duplication (20-30% duplicates):
// - Display limit: 25-30 unique commands shown to user
// - Buffer capture: 40 commands (1.6x multiplier) accounts for duplicates
// - Result: ~25-30 unique commands displayed from 40 captured
//
// Configurable via bufferMultiplier formula:
//   bufferCount = max(count, round(count * bufferMultiplier))
//   - If user wants 30 commands shown, buffer becomes max(30, 48) = 48
//   - If wrapper captures less, we use what's available
//
// DEFAULT_HISTORY_BUFFER_SIZE of 40 used directly in wrapper script:
//   tail -n 40 captures last 40 shell commands before launching tui-launcher

export const DEFAULT_HISTORY_BUFFER_SIZE = 40;

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

function dedupeCommands(commands: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const cmd of commands) {
    const trimmed = cmd.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }

  return result;
}

function getHistoryFromEnvVar(): string[] | null {
  const envHistory = process.env.QPQ_SHELL_HISTORY;
  if (!envHistory || envHistory === '') {
    return null;
  }

  try {
    // Decode base64 → pipe-separated string
    const decoded = Buffer.from(envHistory, 'base64').toString();

    // Split by pipe delimiter, then reverse order (newest first)
    const commands = decoded.split('|').filter(Boolean).reverse();

    if (commands.length > 0) {
      return commands;
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function readHistoryFiles(count: number = 30): Promise<string[]> {
  const home = os.homedir();
  const shell = detectShell();
  let historyPath: string;

  if (shell === 'zsh') {
    historyPath = path.join(home, '.zsh_history');
  } else if (shell === 'bash') {
    historyPath = path.join(home, '.bash_history');
  } else if (shell === 'fish') {
    historyPath = path.join(home, '.local/share/fish/fish_history');
  } else {
    return [];
  }

  try {
    const content = await fs.promises.readFile(historyPath, 'utf-8');
    // Reverse to show newest first
    return parseHistoryFile(content, shell).reverse().slice(0, count);
  } catch {
    return [];
  }
}

function parseHistoryFile(content: string, shell: string): string[] {
  if (shell === 'zsh') {
    // zsh format: : timestamp:duration;command
    return content
      .split('\n')
      .filter(line => line.startsWith(': '))
      .map(line => line.split(';')[1])
      .filter(Boolean);
  }

  // bash/fish: plain text, one command per line
  return content.split('\n').filter(Boolean);
}

function getSubprocessHistory(count: number = 30): string[] {
  const shell = detectShell();

  try {
    let output = '';

    switch (shell) {
      case 'zsh':
      case 'bash':
        output = execSync('history | tail -n ' + count, { encoding: 'utf-8' });
        break;
      case 'fish':
        output = execSync('history', { encoding: 'utf-8' });
        break;
      case 'powershell':
        output = execSync('Get-History | Select-Object -Last ' + count + ' | Select-Object -ExpandProperty CommandLine', { encoding: 'utf-8', shell: 'powershell.exe' });
        break;
      default:
        output = execSync('history | tail -n ' + count, { encoding: 'utf-8' });
    }

    // Parse output based on shell type
    let commands: string[];
    if (shell === 'zsh' || shell === 'bash') {
      commands = output.trim().split('\n')
        .map(line => line.replace(/^[ \t]*\d+[ \t]+/, ''));
    } else {
      commands = output.trim().split('\n');
    }

    return dedupeCommands(commands).slice(0, count);
  } catch {
    return [];
  }
}

function getHistoryFromSubprocess(count: number = 30): string[] {
  try {
    const shell = detectShell();
    let output = '';

    switch (shell) {
      case 'zsh':
      case 'bash':
        output = execSync('history | tail -n ' + count, { encoding: 'utf-8' });
        break;
      case 'fish':
        output = execSync('history', { encoding: 'utf-8' });
        break;
      case 'powershell':
        output = execSync('Get-History | Select-Object -Last ' + count + ' | Select-Object -ExpandProperty CommandLine', { encoding: 'utf-8', shell: 'powershell.exe' });
        break;
      default:
        output = execSync('history | tail -n ' + count, { encoding: 'utf-8' });
    }

    let commands: string[];
    if (shell === 'zsh' || shell === 'bash') {
      commands = output.trim().split('\n')
        .map(line => line.replace(/^[ \t]*\d+[ \t]+/, ''));
    } else {
      commands = output.trim().split('\n');
    }

    return dedupeCommands(commands).slice(0, count);
  } catch {
    return [];
  }
}

export async function getLastCommands(count: number = 30, bufferMultiplier: number = 1.6): Promise<string[]> {
  const bufferCount = Math.max(count, Math.round(count * bufferMultiplier));

  // Method 1: Environment variable (primary - has in-memory history from wrapper)
  const envCommands = getHistoryFromEnvVar();
  if (envCommands && envCommands.length > 0) {
    return dedupeCommands(envCommands).slice(0, count);
  }

  // Method 2: Shell history files (file-based)
  const fileCommands = await readHistoryFiles(bufferCount);
  if (fileCommands.length > 0) {
    return dedupeCommands(fileCommands).slice(0, count);
  }

  // Method 3: Subprocess (unlikely to work, but try anyway as fallback)
  return getHistoryFromSubprocess(count);
}