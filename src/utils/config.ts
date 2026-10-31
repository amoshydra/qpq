import * as fs from 'fs';
import * as path from 'path';
import type { Command } from '../types/command.js';
import type { Config, RecentCommand } from '../types/config.js';
import { getConfigDir } from './configDir.js';

const DEFAULT_CONFIG_FILENAME = 'config.json';
const LEGACY_FAV_FILENAME = 'fav.json';
const LEGACY_FAVORITES_FILENAME = 'favorites.json';
const LEGACY_RECENT_FILENAME = 'recent.json';
const MAX_RECENT = 20;

let temporaryFileCounter = 0;

interface RawConfig {
  commands: RawCommand[];
  favorites: unknown[];
  recent: unknown[];
  nextId: number;
}

type RawCommand = Omit<Command, 'id'> & { id?: number };

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

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isCommandRecord(value: unknown): value is RawCommand {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.name === 'string' &&
    typeof value.command === 'string' &&
    (value.id === undefined || typeof value.id === 'number') &&
    (value.description === undefined || typeof value.description === 'string') &&
    (value.tags === undefined || isStringArray(value.tags)) &&
    (value.aliases === undefined || isStringArray(value.aliases))
  );
}

function parseConfig(content: string): RawConfig | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.commands) ||
    !parsed.commands.every(isCommandRecord)
  ) {
    return null;
  }

  if (parsed.favorites !== undefined && !Array.isArray(parsed.favorites)) {
    return null;
  }

  if (parsed.recent !== undefined && !Array.isArray(parsed.recent)) {
    return null;
  }

  return {
    commands: parsed.commands,
    favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
    recent: Array.isArray(parsed.recent) ? parsed.recent : [],
    nextId: typeof parsed.nextId === 'number' ? parsed.nextId : 0,
  };
}

function normalizeConfig(raw: RawConfig): Config {
  const commands: Command[] = raw.commands.map((command) => ({
    ...command,
    id: command.id ?? 0,
  }));
  const usedIds = new Set<number>();
  let nextId = Number.isInteger(raw.nextId) && raw.nextId > 0 ? raw.nextId : 1;

  for (const command of commands) {
    if (
      typeof command.id !== 'number' ||
      !Number.isInteger(command.id) ||
      command.id < 1 ||
      usedIds.has(command.id)
    ) {
      command.id = nextId;
    }

    usedIds.add(command.id);
    nextId = Math.max(nextId, command.id + 1);
  }

  const idByName = new Map(commands.map((command) => [command.name, command.id]));
  const favorites: number[] = [];

  for (const favorite of raw.favorites) {
    const id = typeof favorite === 'string' ? idByName.get(favorite) : favorite;

    if (typeof id === 'number' && usedIds.has(id) && !favorites.includes(id)) {
      favorites.push(id);
    }
  }

  const recent: RecentCommand[] = [];
  const recentIds = new Set<number>();

  for (const entry of raw.recent) {
    if (!isRecord(entry)) {
      continue;
    }

    const id = typeof entry.name === 'string' ? idByName.get(entry.name) : entry.id;

    if (typeof id === 'number' && usedIds.has(id) && !recentIds.has(id)) {
      const timestamp =
        typeof entry.timestamp === 'number' && Number.isFinite(entry.timestamp)
          ? entry.timestamp
          : 0;

      recent.push({ id, timestamp });
      recentIds.add(id);
    }
  }

  return {
    commands,
    favorites,
    recent,
    nextId,
  };
}

async function writeConfigFile(configPath: string, config: Config): Promise<void> {
  const content = JSON.stringify(config, null, 2);
  temporaryFileCounter += 1;
  const temporaryPath = `${configPath}.${process.pid}.${temporaryFileCounter}.tmp`;

  try {
    await fs.promises.writeFile(temporaryPath, content, 'utf-8');
    await fs.promises.rename(temporaryPath, configPath);
  } catch (error) {
    await fs.promises.rm(temporaryPath, { force: true }).catch(() => {});
    throw new Error(
      `Failed to write config file at ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function initConfigFile(configPath: string): Promise<void> {
  const sampleModule = await import('./sample-commands.js');
  const sampleConfig: { commands: Array<Omit<Command, 'id'>> } = sampleModule.default;

  const commands = sampleConfig.commands.map((command, index) => ({
    ...command,
    id: index + 1,
  }));

  const newConfig: Config = {
    commands,
    favorites: [],
    recent: [],
    nextId: commands.length + 1,
  };

  await writeConfigFile(configPath, newConfig);
}

function formatConfigError(error: Error, filePath: string): string {
  const errorCode = (error as { code?: string }).code;

  if (errorCode === 'ENOENT') {
    return `Config file not found at ${filePath}`;
  }

  return `Error loading config file at ${filePath}: ${error.message}`;
}

async function migrateFromLegacyFiles(configPath: string): Promise<Config | null> {
  const legacyFavPath = getLegacyFavPath();
  const legacyFavoritesPath = getLegacyFavoritesPath();
  const legacyRecentPath = getLegacyRecentPath();

  if (!(await fileExists(legacyFavPath))) {
    return null;
  }

  try {
    const favContent = await fs.promises.readFile(legacyFavPath, 'utf-8');
    const favConfig = parseConfig(favContent);

    if (!favConfig) {
      throw new Error(`Invalid legacy config file at ${legacyFavPath}`);
    }

    let favorites: unknown[] = [];

    if (await fileExists(legacyFavoritesPath)) {
      const favoritesContent = await fs.promises.readFile(legacyFavoritesPath, 'utf-8');
      const favoritesData: unknown = JSON.parse(favoritesContent);

      if (!isRecord(favoritesData) || !Array.isArray(favoritesData.favNames)) {
        throw new Error(`Invalid legacy favorites file at ${legacyFavoritesPath}`);
      }

      favorites = favoritesData.favNames;
    }

    let recent: unknown[] = [];

    if (await fileExists(legacyRecentPath)) {
      const recentContent = await fs.promises.readFile(legacyRecentPath, 'utf-8');
      const recentData: unknown = JSON.parse(recentContent);

      if (!Array.isArray(recentData)) {
        throw new Error(`Invalid legacy recent file at ${legacyRecentPath}`);
      }

      recent = recentData;
    }

    const unifiedConfig = normalizeConfig({
      commands: favConfig.commands,
      favorites,
      recent,
      nextId: 1,
    });

    await writeConfigFile(configPath, unifiedConfig);

    await Promise.all([
      fs.promises.unlink(legacyFavPath).catch(() => {}),
      fs.promises.unlink(legacyFavoritesPath).catch(() => {}),
      fs.promises.unlink(legacyRecentPath).catch(() => {}),
    ]);

    return unifiedConfig;
  } catch (error) {
    throw new Error(
      `Failed to migrate legacy config files: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function loadConfig(customPath?: string): Promise<Config | null> {
  const configPath = getConfigPath(customPath);

  try {
    await ensureConfigDir();

    if (!(await fileExists(configPath))) {
      const migratedConfig = await migrateFromLegacyFiles(configPath);

      if (migratedConfig) {
        return migratedConfig;
      }

      await initConfigFile(configPath);
    }

    const content = await fs.promises.readFile(configPath, 'utf-8');
    const config = parseConfig(content);

    if (config === null) {
      console.error(formatConfigError(new Error('Invalid or corrupted config file'), configPath));
      return null;
    }

    return normalizeConfig(config);
  } catch (error) {
    console.error(formatConfigError(error as Error, configPath));
    return null;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();
  await ensureConfigDir();
  await writeConfigFile(
    configPath,
    normalizeConfig({
      commands: config.commands,
      favorites: config.favorites,
      recent: config.recent,
      nextId: config.nextId,
    }),
  );
}

let mutationQueue: Promise<void> = Promise.resolve();

export async function mutateConfig(mutator: (config: Config) => Config): Promise<Config | null> {
  const result = mutationQueue.then(async () => {
    const config = await loadConfig();

    if (!config) {
      return null;
    }

    const updatedConfig = mutator(config);

    if (updatedConfig !== config) {
      await saveConfig(updatedConfig);
    }

    return updatedConfig;
  });

  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

export function getDefaultConfigPath(): string {
  return getConfigPath();
}

export function getRecentWithCommands(config: Config): {
  commands: Command[];
  timestamps: RecentCommand[];
} {
  const commandsById = new Map(config.commands.map((command) => [command.id, command]));
  const validRecent = config.recent.filter((entry) => commandsById.has(entry.id));
  const commands = validRecent
    .map((entry) => commandsById.get(entry.id))
    .filter((command): command is Command => command !== undefined);

  return { commands, timestamps: validRecent };
}

export async function saveRecent(command: { id: number }): Promise<void> {
  await mutateConfig((config) => {
    if (!config.commands.some((existing) => existing.id === command.id)) {
      return config;
    }

    const recent = config.recent.filter((entry) => entry.id !== command.id);

    recent.unshift({
      id: command.id,
      timestamp: Date.now(),
    });

    return {
      ...config,
      recent: recent.slice(0, MAX_RECENT),
    };
  });
}
