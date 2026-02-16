import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
    });

    it('should load valid JSON config', async () => {
      const { loadConfig } = await import('../utils/config');
      const testConfig = {
        commands: [
          { name: 'Test Command', command: 'echo test' }
        ]
      };
      const configPath = path.join(testDir, 'fav.json');
      await fs.promises.writeFile(configPath, JSON.stringify(testConfig));

      const config = await loadConfig();
      expect(config?.commands).toHaveLength(1);
      expect(config?.commands[0].name).toBe('Test Command');
    });

    it('should return null for invalid JSON config', async () => {
      const { loadConfig } = await import('../utils/config');
      const configPath = path.join(testDir, 'fav.json');
      await fs.promises.writeFile(configPath, 'not valid json');

      const config = await loadConfig();
      expect(config).toBeNull();
    });

    it('should return null for config without commands array', async () => {
      const { loadConfig } = await import('../utils/config');
      const configPath = path.join(testDir, 'fav.json');
      await fs.promises.writeFile(configPath, JSON.stringify({ name: 'invalid' }));

      const config = await loadConfig();
      expect(config).toBeNull();
    });
  });

  describe('saveConfig', () => {
    it('should save config as JSON', async () => {
      const { saveConfig } = await import('../utils/config');
      const testConfig = {
        commands: [
          { name: 'Saved Command', command: 'echo saved' }
        ]
      };

      await saveConfig(testConfig as any);

      const configPath = path.join(testDir, 'fav.json');
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      
      expect(parsed.commands).toHaveLength(1);
      expect(parsed.commands[0].name).toBe('Saved Command');
    });
  });
});
