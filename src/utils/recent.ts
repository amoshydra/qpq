import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Command } from '../types/command.js';

function getConfigDir(): string {
  const platform = os.platform();
  const homeDir = os.homedir();

  switch (platform) {
    case 'win32':
      return path.join(homeDir, 'AppData', 'Roaming', 'tui-launcher');
    case 'darwin':
      return path.join(homeDir, 'Library', 'Application Support', 'tui-launcher');
    default:
      return path.join(homeDir, '.local', 'tiny-launcher');
  }
}

const RECENT_COMMANDS_FILE = path.join(getConfigDir(), 'recent.json');
const MAX_RECENT = 20;

interface RecentCommand {
  name: string;
  timestamp: number;
}

async function ensureDir(): Promise<void> {
  const dir = getConfigDir();
  try {
    await fs.promises.access(dir);
  } catch {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

export async function saveRecent(command: Command): Promise<void> {
  await ensureDir();
  
  let recent: RecentCommand[] = [];
  try {
    const content = await fs.promises.readFile(RECENT_COMMANDS_FILE, 'utf-8');
    recent = JSON.parse(content);
  } catch {
    // File doesn't exist or is invalid, start fresh
  }

  const existing = recent.findIndex(r => r.name === command.name);
  if (existing >= 0) {
    recent.splice(existing, 1);
  }

  recent.unshift({
    name: command.name,
    timestamp: Date.now(),
  });

  recent = recent.slice(0, MAX_RECENT);

  await fs.promises.writeFile(RECENT_COMMANDS_FILE, JSON.stringify(recent, null, 2));
}

export async function loadRecent(allCommands: Command[]): Promise<Command[]> {
  try {
    const content = await fs.promises.readFile(RECENT_COMMANDS_FILE, 'utf-8');
    const recent: RecentCommand[] = JSON.parse(content);

    const recentCommands = recent.map(r => allCommands.find(c => c.name === r.name)).filter(Boolean) as Command[];
    return recentCommands;
  } catch {
    return [];
  }
}

export async function loadRecentWithTimestamps(): Promise<RecentCommand[]> {
  try {
    const content = await fs.promises.readFile(RECENT_COMMANDS_FILE, 'utf-8');
    const recent: RecentCommand[] = JSON.parse(content);
    return recent;
  } catch {
    return [];
  }
}

export async function clearRecent(): Promise<void> {
  try {
    await fs.promises.unlink(RECENT_COMMANDS_FILE);
  } catch {
    // Ignore if file doesn't exist
  }
}