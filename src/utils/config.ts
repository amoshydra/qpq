import * as fs from 'fs';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import type { Command } from '../types/command.js';
import type { Config, RecentCommand } from '../types/config.js';
import { getConfigDir } from './configDir.js';

const DEFAULT_CONFIG_FILENAME = 'config.json';
const LEGACY_FAV_FILENAME = 'fav.json';
const LEGACY_FAVORITES_FILENAME = 'favorites.json';
const LEGACY_RECENT_FILENAME = 'recent.json';

function getConfigPath(customPath?: string): string {
  return customPath || path.join(getConfigDir(), DEFAULT_CONFIG_FILENAME);
}

function getLegacyFavPath(): string {
  return path.join(getConfigDir(), LEGACY_FAV_FILENAME);
}

function getLegacyFavoritesPath(): string {
  return path.join(getConfigDir(), LEGACY_FAVORITES_FILENAME);
}

function getLegacyRecentPath(): string {
  return path.join(getConfigDir(), LEGACY_RECENT_FILENAME);
}

async function ensureConfigDir(): Promise<void> {
  const configDir = getConfigDir();
  try {
    await fs.promises.access(configDir);
  } catch {
    await fs.promises.mkdir(configDir, { recursive: true });
  }
}

function ensureIds(config: Config): Config {
  let nextId = config.nextId || 1;
  const commandIdMap = new Map<string, number>();

  for (const cmd of config.commands) {
    if (cmd.id === undefined) {
      cmd.id = nextId++;
    }
    commandIdMap.set(cmd.name, cmd.id);
  }

  config.nextId = nextId;

  config.favorites = config.favorites
    .map(fav => {
      if (typeof fav === 'string') {
        return commandIdMap.get(fav);
      }
      return fav;
    })
    .filter((id): id is number => id !== undefined && id !== null);

  config.recent = config.recent
    .map(rec => {
      if ('name' in rec && typeof rec.name === 'string') {
        const id = commandIdMap.get(rec.name);
        if (id !== undefined) {
          return { id, timestamp: rec.timestamp };
        }
        return null;
      }
      return rec;
    })
    .filter((rec): rec is RecentCommand => rec !== null);

  return config;
}

async function initConfigFile(configPath: string): Promise<void> {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const samplePath = path.join(dir, '../../sample-commands.json');

  const sampleContent = await fs.promises.readFile(samplePath, 'utf-8');
  const sampleConfig = JSON.parse(sampleContent);

  let nextId = 1;
  const commands = sampleConfig.commands.map((cmd: Command) => ({
    ...cmd,
    id: nextId++
  }));

  const newConfig: Config = {
    commands,
    favorites: [],
    recent: [],
    nextId,
    historyBufferSize: sampleConfig.historyBufferSize
  };

  await fs.promises.writeFile(configPath, JSON.stringify(newConfig, null, 2));
}

function loadConfigSafely(content: string, filePath: string): Config | null {
  try {
    const config = JSON.parse(content);
    if (config && typeof config === 'object' && 'commands' in config) {
      return config as Config;
    }
    return null;
  } catch {
    return null;
  }
}

async function migrateFromLegacyFiles(configPath: string): Promise<Config | null> {
  const legacyFavPath = getLegacyFavPath();
  const legacyFavoritesPath = getLegacyFavoritesPath();
  const legacyRecentPath = getLegacyRecentPath();

  let needsMigration = false;

  try {
    await fs.promises.access(legacyFavPath);
    needsMigration = true;
  } catch {
    // File doesn't exist
  }

  if (!needsMigration) {
    return null;
  }

  try {
    let commands: Config['commands'] = [];
    try {
      const favContent = await fs.promises.readFile(legacyFavPath, 'utf-8');
      const favConfig = loadConfigSafely(favContent, legacyFavPath);
      if (favConfig) {
        commands = favConfig.commands;
      }
    } catch {
      // If we can't read fav.json, we'll create a new config
    }

    let favorites: number[] = [];
    try {
      await fs.promises.access(legacyFavoritesPath);
      const favContent = await fs.promises.readFile(legacyFavoritesPath, 'utf-8');
      const favData = JSON.parse(favContent);
      favorites = (favData.favNames || []).map((name: string) => {
        const cmd = commands.find(c => c.name === name);
        return cmd?.id || 0;
      }).filter((id: number) => id !== 0);
    } catch {
      // File doesn't exist or is invalid
    }

    let recent: RecentCommand[] = [];
    try {
      await fs.promises.access(legacyRecentPath);
      const recentContent = await fs.promises.readFile(legacyRecentPath, 'utf-8');
      const oldRecent = JSON.parse(recentContent);
      recent = oldRecent.map((rec: { name: string; timestamp: number }) => {
        const cmd = commands.find(c => c.name === rec.name);
        return cmd ? { id: cmd.id, timestamp: rec.timestamp } : null;
      }).filter((r: RecentCommand | null): r is RecentCommand => r !== null);
    } catch {
      // File doesn't exist or is invalid
    }

    let nextId = 1;
    const commandIdMap = new Map<string, number>();
    commands = commands.map(cmd => {
      if (cmd.id === undefined) {
        cmd.id = nextId++;
      }
      commandIdMap.set(cmd.name, cmd.id);
      return cmd;
    });

    favorites = favorites.map(fav => {
      const cmd = commands.find(c => c.id === fav);
      return cmd?.id || 0;
    }).filter((id: number) => id !== 0);

    recent = recent.map(rec => {
      const cmd = commands.find(c => c.id === rec.id);
      return cmd ? { id: cmd.id, timestamp: rec.timestamp } : null;
    }).filter((r: RecentCommand | null): r is RecentCommand => r !== null);

    const unifiedConfig: Config = {
      commands,
      favorites,
      recent,
      nextId,
      historyBufferSize: undefined
    };

    await fs.promises.writeFile(configPath, JSON.stringify(unifiedConfig, null, 2), 'utf-8');

    await Promise.all([
      fs.promises.unlink(legacyFavPath).catch(() => {}),
      fs.promises.unlink(legacyFavoritesPath).catch(() => {}),
      fs.promises.unlink(legacyRecentPath).catch(() => {})
    ]);

    console.log('Migrated from legacy separate files to unified config');
    return unifiedConfig;
  } catch (error) {
    console.error(`Failed to migrate from legacy files: ${error}`);
    return null;
  }
}

function formatConfigError(error: Error, filePath: string): string {
  const errorCode = (error as { code?: string }).code;
  if (errorCode === 'ENOENT') {
    return `Config file not found at ${filePath}`;
  }

  return `Error loading config file at ${filePath}: ${error.message}`;
}

export async function loadConfig(customPath?: string): Promise<Config | null> {
  const configPath = getConfigPath(customPath);

  try {
    await ensureConfigDir();

    let fileExists = false;
    try {
      await fs.promises.access(configPath);
      fileExists = true;
    } catch {
      fileExists = false;
    }

    if (!fileExists) {
      const migratedConfig = await migrateFromLegacyFiles(configPath);
      if (migratedConfig) {
        return ensureIds(migratedConfig);
      }
      await initConfigFile(configPath);
    }

    const content = await fs.promises.readFile(configPath, 'utf-8');
    const config = loadConfigSafely(content, configPath);

    if (config === null) {
      console.error(formatConfigError(new Error('Invalid or corrupted config file'), configPath));
      return null;
    }

    return ensureIds(config);
  } catch (error) {
    console.error(formatConfigError(error as Error, configPath));
    return null;
  }
}

export function getDefaultConfigPath(): string {
  return getConfigPath();
}

export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();
  await ensureConfigDir();
  
  if (!config.nextId) {
    let maxId = 0;
    for (const cmd of config.commands) {
      if (cmd.id > maxId) maxId = cmd.id;
    }
    config.nextId = maxId + 1;
  }
  
  const content = JSON.stringify(config, null, 2);
  await fs.promises.writeFile(configPath, content, 'utf-8');
}

export async function loadFavorites(): Promise<number[]> {
  const config = await loadConfig();
  return config?.favorites || [];
}

export async function saveFavorites(favIds: number[]): Promise<void> {
  const config = await loadConfig();
  if (config) {
    const validIds = config.commands.map(c => c.id);
    config.favorites = favIds.filter(id => validIds.includes(id));
    await saveConfig(config);
  }
}

export async function toggleFavorite(commandId: number): Promise<number[]> {
  const config = await loadConfig();
  if (!config) return [];

  const validIds = config.commands.map(c => c.id);
  if (!validIds.includes(commandId)) return [];

  const index = config.favorites.indexOf(commandId);

  if (index >= 0) {
    config.favorites.splice(index, 1);
  } else {
    config.favorites.push(commandId);
  }

  await saveConfig(config);
  return config.favorites;
}

export function isFavorite(commandId: number, favorites: number[]): boolean {
  return favorites.includes(commandId);
}

export async function clearFavorites(): Promise<void> {
  const config = await loadConfig();
  if (config) {
    config.favorites = [];
    await saveConfig(config);
  }
}

export async function saveRecent(command: { id: number }): Promise<void> {
  const config = await loadConfig();
  if (!config) return;

  const validIds = config.commands.map(c => c.id);
  if (!validIds.includes(command.id)) return;

  const MAX_RECENT = 20;
  const existing = config.recent.findIndex(r => r.id === command.id);

  if (existing >= 0) {
    config.recent.splice(existing, 1);
  }

  config.recent.unshift({
    id: command.id,
    timestamp: Date.now()
  });

  config.recent = config.recent.slice(0, MAX_RECENT);
  await saveConfig(config);
}

export async function loadRecentWithCommands(allCommands: Command[]): Promise<{
  commands: Command[];
  timestamps: RecentCommand[];
}> {
  const config = await loadConfig();
  if (!config) return { commands: [], timestamps: [] };

  const validIds = new Set(config.commands.map(c => c.id));
  const validRecent = config.recent.filter(r => validIds.has(r.id));

  const recentCommands = validRecent
    .map(r => allCommands.find(c => c.id === r.id))
    .filter(Boolean) as Command[];
  
  return { commands: recentCommands, timestamps: validRecent };
}

export async function loadRecent(allCommands: Command[]): Promise<Command[]> {
  const result = await loadRecentWithCommands(allCommands);
  return result.commands;
}

export async function loadRecentWithTimestamps(): Promise<RecentCommand[]> {
  const config = await loadConfig();
  if (!config) return [];

  const validIds = new Set(config.commands.map(c => c.id));
  return config.recent.filter(r => validIds.has(r.id));
}

export async function clearRecent(): Promise<void> {
  const config = await loadConfig();
  if (config) {
    config.recent = [];
    await saveConfig(config);
  }
}
