 import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import type { Config } from '../types/config.js';
import { getConfigDir } from './configDir.js';

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
   // Get the absolute path from import.meta.url using Node.js built-in
   const dir = path.dirname(fileURLToPath(import.meta.url));
   const samplePath = path.join(dir, '../../sample-commands.yaml');

   await fs.promises.copyFile(samplePath, configPath);
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

  // Check if it's a file not found error
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
      // File doesn't exist, create it
      await initConfigFile(configPath);
    } else {
      // File exists, check if it's valid
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const config = loadConfigSafely(content, configPath);

      if (config === null) {
        console.error(formatConfigError(new Error('Invalid or corrupted config file'), configPath));
        return null;
      }

      return config;
    }

    // After creating file, load it
    const content = await fs.promises.readFile(configPath, 'utf-8');
    const config = loadConfigSafely(content, configPath);

    if (config === null) {
      // If newly created config is invalid, this shouldn't happen
      console.error(formatConfigError(new Error('Created config file is invalid'), configPath));
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