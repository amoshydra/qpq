import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as os from 'os';
import * as path from 'path';
import type { Config } from '../types/config.js';

function getConfigDir(): string {
  const platform = os.platform();
  const homeDir = os.homedir();

  switch (platform) {
    case 'win32':
      return path.join(homeDir, 'AppData', 'Roaming', 'qpq');

    case 'darwin':
      return path.join(homeDir, 'Library', 'Application Support', 'qpq');

    default:
      return path.join(homeDir, '.local', 'qpq');
  }
}

const DEFAULT_CONFIG_FILENAME = 'fav.yaml';

function getConfigPath(customPath?: string): string {
  return customPath || path.join(getConfigDir(), DEFAULT_CONFIG_FILENAME);
}

async function ensureConfigDir(): Promise<void> {
  const configDir = getConfigDir();
  try {
    await fs.promises.access(configDir);
  } catch {
    await fs.promises.mkdir(configDir, { recursive: true });
  }
}

async function initConfigFile(configPath: string): Promise<void> {
  const samplePath = path.join(process.cwd(), 'src', 'data', 'sample-commands.yaml');
  try {
    await fs.promises.copyFile(samplePath, configPath);
  } catch (error) {
    throw new Error(`Failed to initialize config file: ${String(error)}`);
  }
}

function loadConfigSafely(content: string, filePath: string): Config | null {
  try {
    const config = yaml.load(content);
    if (config && typeof config === 'object' && 'commands' in config) {
      return config as Config;
    }
    return null;
  } catch {
    return null;
  }
}

function formatConfigError(error: Error, filePath: string): string {
  if (error instanceof yaml.YAMLException) {
    return `Failed to parse config file at ${filePath}\n${error.message}`;
  }
  return `Error loading config file at ${filePath}: ${error.message}`;
}

export async function loadConfig(customPath?: string): Promise<Config | null> {
  const configPath = getConfigPath(customPath);

  try {
    await ensureConfigDir();

    try {
      await fs.promises.access(configPath);
    } catch {
      await initConfigFile(configPath);
    }

    const content = await fs.promises.readFile(configPath, 'utf-8');
    const config = loadConfigSafely(content, configPath);

    if (config === null) {
      console.error(formatConfigError(new Error('Invalid or corrupted config file'), configPath));
      return null;
    }

    return config;
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
  const content = yaml.dump(config);
  await fs.promises.writeFile(configPath, content, 'utf-8');
}