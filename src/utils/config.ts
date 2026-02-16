import * as fs from 'fs';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import type { Config } from '../types/config.js';
import { getConfigDir } from './configDir.js';

const DEFAULT_CONFIG_FILENAME = 'fav.json';
const LEGACY_CONFIG_FILENAME = 'fav.yaml';

function getConfigPath(customPath?: string): string {
  return customPath || path.join(getConfigDir(), DEFAULT_CONFIG_FILENAME);
}

function getLegacyConfigPath(): string {
  return path.join(getConfigDir(), LEGACY_CONFIG_FILENAME);
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
   const dir = path.dirname(fileURLToPath(import.meta.url));
   const samplePath = path.join(dir, '../../sample-commands.json');

   await fs.promises.copyFile(samplePath, configPath);
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

 async function migrateFromYaml(configPath: string): Promise<Config | null> {
   const yamlPath = getLegacyConfigPath();

   try {
     await fs.promises.access(yamlPath);
   } catch {
     return null;
   }

   try {
     const yaml = await import('js-yaml');
     const yamlContent = await fs.promises.readFile(yamlPath, 'utf-8');
     const config = yaml.load(yamlContent) as Config;

     if (config && typeof config === 'object' && 'commands' in config) {
       const jsonContent = JSON.stringify(config, null, 2);
       await fs.promises.writeFile(configPath, jsonContent, 'utf-8');
       await fs.promises.unlink(yamlPath);
       console.log(`Migrated config from YAML to JSON: ${yamlPath} → ${configPath}`);
       return config;
     }
     return null;
   } catch (error) {
     console.error(`Failed to migrate YAML config: ${error}`);
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
      const migratedConfig = await migrateFromYaml(configPath);
      if (migratedConfig) {
        return migratedConfig;
      }
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
  const content = JSON.stringify(config, null, 2);
  await fs.promises.writeFile(configPath, content, 'utf-8');
}