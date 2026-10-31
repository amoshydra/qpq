import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getRecentWithCommands,
  loadConfig,
  mutateConfig,
  saveConfig,
  saveRecent,
} from './config.js';

vi.mock('../utils/configDir.js', () => ({
  getConfigDir: () => testDir,
}));

let testDir: string;

describe('config', () => {
  beforeEach(async () => {
    testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'qpq-test-'));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  describe('loadConfig', () => {
    it('creates a config from the sample when no config exists', async () => {
      const config = await loadConfig();

      expect(config?.commands.length).toBeGreaterThan(0);
      expect(config?.favorites).toEqual([]);
      expect(config?.recent).toEqual([]);
      expect(config?.commands.every(command => command.id > 0)).toBe(true);
    });

    it('loads a valid config', async () => {
      const testConfig = {
        commands: [{ id: 1, name: 'Test Command', command: 'echo test' }],
        favorites: [1],
        recent: [],
        nextId: 2,
      };
      await fs.promises.writeFile(path.join(testDir, 'config.json'), JSON.stringify(testConfig));

      const config = await loadConfig();

      expect(config?.commands).toHaveLength(1);
      expect(config?.commands[0].name).toBe('Test Command');
      expect(config?.favorites).toEqual([1]);
      expect(config?.recent).toEqual([]);
      expect(config?.nextId).toBe(2);
    });

    it('normalizes missing ids, string favorites, and name-based recent entries', async () => {
      const testConfig = {
        commands: [
          { name: 'Alpha', command: 'echo alpha' },
          { name: 'Beta', command: 'echo beta' },
        ],
        favorites: ['Beta'],
        recent: [{ name: 'Alpha', timestamp: 123 }],
      };
      await fs.promises.writeFile(path.join(testDir, 'config.json'), JSON.stringify(testConfig));

      const config = await loadConfig();

      expect(config?.commands.map(command => command.id)).toEqual([1, 2]);
      expect(config?.favorites).toEqual([2]);
      expect(config?.recent).toEqual([{ id: 1, timestamp: 123 }]);
      expect(config?.nextId).toBe(3);
    });

    it('reassigns duplicate ids', async () => {
      const testConfig = {
        commands: [
          { id: 1, name: 'Alpha', command: 'echo alpha' },
          { id: 1, name: 'Beta', command: 'echo beta' },
        ],
        favorites: [],
        recent: [],
      };
      await fs.promises.writeFile(path.join(testDir, 'config.json'), JSON.stringify(testConfig));

      const config = await loadConfig();

      expect(config?.commands.map(command => command.id)).toEqual([1, 2]);
      expect(config?.nextId).toBe(3);
    });

    it('defaults missing favorites and recent arrays', async () => {
      const testConfig = {
        commands: [{ name: 'Alpha', command: 'echo alpha' }],
      };
      await fs.promises.writeFile(path.join(testDir, 'config.json'), JSON.stringify(testConfig));

      const config = await loadConfig();

      expect(config?.favorites).toEqual([]);
      expect(config?.recent).toEqual([]);
      expect(config?.commands[0].id).toBe(1);
    });

    it('returns null for invalid JSON', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await fs.promises.writeFile(path.join(testDir, 'config.json'), 'not valid json');

      await expect(loadConfig()).resolves.toBeNull();
    });

    it('returns null when commands are not an array', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await fs.promises.writeFile(
        path.join(testDir, 'config.json'),
        JSON.stringify({ name: 'invalid' }),
      );

      await expect(loadConfig()).resolves.toBeNull();
    });

    it('returns null when a command is missing its command string', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await fs.promises.writeFile(
        path.join(testDir, 'config.json'),
        JSON.stringify({ commands: [{ name: 'invalid' }] }),
      );

      await expect(loadConfig()).resolves.toBeNull();
    });

    it('migrates legacy separate files', async () => {
      await fs.promises.writeFile(
        path.join(testDir, 'fav.json'),
        JSON.stringify({ commands: [{ name: 'Alpha', command: 'echo alpha' }] }),
      );
      await fs.promises.writeFile(
        path.join(testDir, 'favorites.json'),
        JSON.stringify({ favNames: ['Alpha'] }),
      );
      await fs.promises.writeFile(
        path.join(testDir, 'recent.json'),
        JSON.stringify([{ name: 'Alpha', timestamp: 123 }]),
      );

      const config = await loadConfig();

      expect(config).toMatchObject({
        commands: [{ id: 1, name: 'Alpha', command: 'echo alpha' }],
        favorites: [1],
        recent: [{ id: 1, timestamp: 123 }],
      });
      await expect(fs.promises.access(path.join(testDir, 'fav.json'))).rejects.toThrow();
      await expect(fs.promises.access(path.join(testDir, 'favorites.json'))).rejects.toThrow();
      await expect(fs.promises.access(path.join(testDir, 'recent.json'))).rejects.toThrow();
    });

    it('does not delete legacy files when migration fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const legacyPath = path.join(testDir, 'fav.json');
      await fs.promises.writeFile(legacyPath, 'not valid json');

      await expect(loadConfig()).resolves.toBeNull();
      await expect(fs.promises.access(legacyPath)).resolves.toBeUndefined();
      await expect(fs.promises.access(path.join(testDir, 'config.json'))).rejects.toThrow();
    });
  });

  describe('saveConfig', () => {
    it('writes normalized config without leaving temporary files behind', async () => {
      const testConfig = {
        commands: [{ id: 7, name: 'Saved Command', command: 'echo saved' }],
        favorites: [7],
        recent: [],
        nextId: 1,
      };

      await saveConfig(testConfig);

      const entries = await fs.promises.readdir(testDir);
      expect(entries).toEqual(['config.json']);

      const content = await fs.promises.readFile(path.join(testDir, 'config.json'), 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.commands).toHaveLength(1);
      expect(parsed.commands[0].name).toBe('Saved Command');
      expect(parsed.favorites).toEqual([7]);
      expect(parsed.nextId).toBe(8);
    });

    it('replaces an existing config atomically', async () => {
      await fs.promises.writeFile(path.join(testDir, 'config.json'), 'old content');

      await saveConfig({
        commands: [{ id: 1, name: 'New', command: 'echo new' }],
        favorites: [],
        recent: [],
        nextId: 2,
      });

      const parsed = JSON.parse(await fs.promises.readFile(path.join(testDir, 'config.json'), 'utf-8'));
      expect(parsed.commands[0].name).toBe('New');
    });
  });

  describe('getRecentWithCommands', () => {
    it('returns recent commands in order and ignores stale ids', () => {
      const config = {
        commands: [
          { id: 1, name: 'Alpha', command: 'echo alpha' },
          { id: 2, name: 'Beta', command: 'echo beta' },
        ],
        favorites: [],
        recent: [
          { id: 2, timestamp: 200 },
          { id: 99, timestamp: 150 },
          { id: 1, timestamp: 100 },
        ],
        nextId: 3,
      };

      const result = getRecentWithCommands(config);

      expect(result.commands.map(command => command.id)).toEqual([2, 1]);
      expect(result.timestamps).toEqual([
        { id: 2, timestamp: 200 },
        { id: 1, timestamp: 100 },
      ]);
    });
  });

  describe('saveRecent', () => {
    it('moves the command to the front without duplicating or reordering the rest', async () => {
      const config = {
        commands: [
          { id: 1, name: 'Alpha', command: 'echo alpha' },
          { id: 2, name: 'Beta', command: 'echo beta' },
        ],
        favorites: [],
        recent: [
          { id: 2, timestamp: 200 },
          { id: 1, timestamp: 100 },
        ],
        nextId: 3,
      };
      await fs.promises.writeFile(path.join(testDir, 'config.json'), JSON.stringify(config));

      await saveRecent({ id: 1 });

      const saved = JSON.parse(await fs.promises.readFile(path.join(testDir, 'config.json'), 'utf-8'));
      expect(saved.recent.map((entry: { id: number }) => entry.id)).toEqual([1, 2]);
      expect(saved.recent).toHaveLength(2);
      expect(saved.recent[0].timestamp).toBeGreaterThan(100);
    });

    it('does nothing for an unknown command', async () => {
      const config = {
        commands: [{ id: 1, name: 'Alpha', command: 'echo alpha' }],
        favorites: [],
        recent: [],
        nextId: 2,
      };
      await fs.promises.writeFile(path.join(testDir, 'config.json'), JSON.stringify(config));

      await saveRecent({ id: 99 });

      const saved = JSON.parse(await fs.promises.readFile(path.join(testDir, 'config.json'), 'utf-8'));
      expect(saved.recent).toEqual([]);
    });
  });

  describe('mutateConfig', () => {
    it('serializes concurrent read-modify-write operations', async () => {
      const config = {
        commands: [{ id: 1, name: 'Alpha', command: 'echo alpha' }],
        favorites: [],
        recent: [],
        nextId: 2,
      };
      await fs.promises.writeFile(path.join(testDir, 'config.json'), JSON.stringify(config));

      await Promise.all([
        mutateConfig(current => ({
          ...current,
          commands: [...current.commands, { id: 2, name: 'Beta', command: 'echo beta' }],
          nextId: 3,
        })),
        mutateConfig(current => ({
          ...current,
          commands: [...current.commands, { id: 3, name: 'Gamma', command: 'echo gamma' }],
          nextId: 4,
        })),
      ]);

      const saved = JSON.parse(await fs.promises.readFile(path.join(testDir, 'config.json'), 'utf-8'));
      expect(saved.commands.map((command: { id: number }) => command.id)).toEqual([1, 2, 3]);
      expect(saved.nextId).toBe(4);
    });

    it('returns null when the config cannot be loaded', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await fs.promises.writeFile(path.join(testDir, 'config.json'), 'not valid json');

      await expect(mutateConfig(current => current)).resolves.toBeNull();
    });
  });
});
