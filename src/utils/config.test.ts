import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/configDir', () => ({
  getConfigDir: () => testDir,
}));

let testDir: string;

describe('config', () => {
  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `qpq-test-${Date.now()}`);
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('loadConfig', () => {
    it('should create config from sample if no config exists', async () => {
      const { loadConfig } = await import('../utils/config');
      const config = await loadConfig();
      expect(config).toBeDefined();
      expect(config?.commands).toBeInstanceOf(Array);
      expect(config?.favorites).toBeInstanceOf(Array);
      expect(config?.recent).toBeInstanceOf(Array);
    });

    it('should load valid JSON config with new structure', async () => {
      const { loadConfig } = await import('../utils/config');
      const testConfig = {
        commands: [
          { id: 1, name: 'Test Command', command: 'echo test' }
        ],
        favorites: [1],
        recent: []
      };
      const configPath = path.join(testDir, 'config.json');
      await fs.promises.writeFile(configPath, JSON.stringify(testConfig));

      const config = await loadConfig();
      expect(config?.commands).toHaveLength(1);
      expect(config?.commands[0].name).toBe('Test Command');
      expect(config?.favorites).toHaveLength(1);
      expect(config?.favorites[0]).toBe(1);
      expect(config?.recent).toHaveLength(0);
    });

    it('should return null for invalid JSON config', async () => {
      const { loadConfig } = await import('../utils/config');
      const configPath = path.join(testDir, 'config.json');
      await fs.promises.writeFile(configPath, 'not valid json');

      const config = await loadConfig();
      expect(config).toBeNull();
    });

    it('should return null for config without commands array', async () => {
      const { loadConfig } = await import('../utils/config');
      const configPath = path.join(testDir, 'config.json');
      await fs.promises.writeFile(configPath, JSON.stringify({ name: 'invalid' }));

      const config = await loadConfig();
      expect(config).toBeNull();
    });
  });

  describe('saveConfig', () => {
    it('should save config as JSON with new structure', async () => {
      const { saveConfig } = await import('../utils/config');
      const testConfig = {
        commands: [
          { id: 1, name: 'Saved Command', command: 'echo saved' }
        ],
        favorites: [1],
        recent: [],
        nextId: 2
      };

      await saveConfig(testConfig);

      const configPath = path.join(testDir, 'config.json');
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.commands).toHaveLength(1);
      expect(parsed.commands[0].name).toBe('Saved Command');
      expect(parsed.favorites).toHaveLength(1);
      expect(parsed.favorites[0]).toBe(1);
      expect(parsed.recent).toHaveLength(0);
    });
  });
});
