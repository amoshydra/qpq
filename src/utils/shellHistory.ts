import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const HISTORY_TIMEOUT_MS = 3000;
const MAX_BUFFER_BYTES = 1024 * 1024;

type SupportedShell = 'zsh' | 'bash' | 'fish' | 'powershell';

function detectShell(): SupportedShell {
  const shell = process.env.SHELL || process.env.COMSPEC || '';

  if (shell.includes('zsh')) {
    return 'zsh';
  }
  if (shell.includes('bash')) {
    return 'bash';
  }
  if (shell.includes('fish')) {
    return 'fish';
  }
  if (shell.includes('powershell') || shell.includes('pwsh')) {
    return 'powershell';
  }

  return os.platform() === 'win32' ? 'powershell' : 'zsh';
}

/**
 * Convert shell history entries from oldest-first order to newest-first,
 * removing duplicates while keeping the newest occurrence.
 */
export function toNewestFirst(oldestFirst: string[]): string[] {
  const seen = new Set<string>();
  const newestFirst: string[] = [];

  for (let index = oldestFirst.length - 1; index >= 0; index -= 1) {
    const command = oldestFirst[index].trim();

    if (command && !seen.has(command)) {
      seen.add(command);
      newestFirst.push(command);
    }
  }

  return newestFirst;
}

export function parseHistoryFile(content: string, shell: SupportedShell): string[] {
  if (shell === 'zsh') {
    return content
      .split('\n')
      .filter((line) => line.startsWith(': '))
      .map((line) => {
        const match = line.match(/^: \d+:\d+;(.*)$/);
        return match ? match[1] : null;
      })
      .filter((command): command is string => command !== null);
  }

  if (shell === 'fish') {
    return content
      .split('\n')
      .filter((line) => line.startsWith('- cmd:'))
      .map((line) => line.slice('- cmd:'.length).trim())
      .filter(Boolean);
  }

  return content.split('\n').filter((line) => line.length > 0 && !/^#\d+$/.test(line));
}

function getHistoryFilePath(shell: SupportedShell): string | null {
  const home = os.homedir();

  switch (shell) {
    case 'zsh':
      return path.join(home, '.zsh_history');
    case 'bash':
      return path.join(home, '.bash_history');
    case 'fish':
      return path.join(home, '.local', 'share', 'fish', 'fish_history');
    case 'powershell': {
      const appData = process.env.APPDATA;
      return appData
        ? path.join(
            appData,
            'Microsoft',
            'Windows',
            'PowerShell',
            'PSReadLine',
            'ConsoleHost_history.txt',
          )
        : null;
    }
  }
}

async function readHistoryFiles(count: number = 30): Promise<string[]> {
  const shell = detectShell();
  const historyPath = getHistoryFilePath(shell);

  if (!historyPath) {
    return [];
  }

  try {
    const content = await fs.promises.readFile(historyPath, 'utf-8');
    return toNewestFirst(parseHistoryFile(content, shell)).slice(0, count);
  } catch {
    return [];
  }
}

async function runHistoryCommand(file: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(file, args, {
      encoding: 'utf-8',
      timeout: HISTORY_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER_BYTES,
      windowsHide: true,
    });

    return stdout;
  } catch {
    return '';
  }
}

function parseSubprocessOutput(output: string, shell: SupportedShell): string[] {
  const lines = output.trim().split('\n').filter(Boolean);

  if (shell === 'zsh' || shell === 'bash') {
    return lines.map((line) => line.replace(/^[ \t]*\d+[ \t]+/, ''));
  }

  return lines;
}

async function getHistoryFromSubprocess(count: number): Promise<string[]> {
  const shell = detectShell();
  let output = '';

  switch (shell) {
    case 'zsh':
      output = await runHistoryCommand('zsh', ['-c', `history | tail -n ${count}`]);
      break;
    case 'bash':
      output = await runHistoryCommand('bash', ['-c', `history | tail -n ${count}`]);
      break;
    case 'fish':
      output = await runHistoryCommand('fish', ['-c', 'history']);
      break;
    case 'powershell': {
      const command = `Get-History -Count ${count} | ForEach-Object { $_.CommandLine }`;
      output = await runHistoryCommand('pwsh', ['-NoProfile', '-Command', command]);

      if (!output) {
        output = await runHistoryCommand('powershell.exe', ['-NoProfile', '-Command', command]);
      }
      break;
    }
  }

  return toNewestFirst(parseSubprocessOutput(output, shell)).slice(0, count);
}

function dedupeNewestFirst(commands: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const command of commands) {
    const trimmed = command.trim();

    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }

  return result;
}

export async function getLastCommands(count: number = 30): Promise<string[]> {
  const [subprocessCommands, fileCommands] = await Promise.all([
    getHistoryFromSubprocess(count),
    readHistoryFiles(count),
  ]);

  return dedupeNewestFirst([...subprocessCommands, ...fileCommands]).slice(0, count);
}
