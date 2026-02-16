import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const globalTestDir = { value: '' };

vi.mock('../utils/configDir', () => ({
  getConfigDir: () => globalTestDir.value,
}));

describe('recent', () => {
  let testDir: string;
  let recentModule: typeof import('../utils/recent');

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `qpq-test-recent-${Date.now()}`);
    await fs.promises.mkdir(testDir, { recursive: true });
    globalTestDir.value = testDir;
    
    recentModule = await import('../utils/recent');
  });

  afterEach(async () => {
    vi.resetModules();
    globalTestDir.value = '';
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('loadRecentWithCommands', () => {
    it('should return empty array if no recent file exists', async () => {
      const result = await recentModule.loadRecentWithCommands([]);
      expect(result.commands).toEqual([]);
      expect(result.timestamps).toEqual([]);
    });

    it('should load recent commands and match with allCommands', async () => {
      await recentModule.saveRecent({ name: 'Git Status', command: 'git status' });
      await recentModule.saveRecent({ name: 'Git Pull', command: 'git pull' });

      const allCommands = [
        { name: 'Git Status', command: 'git status' },
        { name: 'Git Pull', command: 'git pull' },
        { name: 'Git Push', command: 'git push' },
      ];

      const result = await recentModule.loadRecentWithCommands(allCommands as any);
      
      expect(result.commands).toHaveLength(2);
      expect(result.commands.map((c: any) => c.name)).toContain('Git Status');
      expect(result.commands.map((c: any) => c.name)).toContain('Git Pull');
      expect(result.timestamps).toHaveLength(2);
    });

    it('should return only commands that exist in allCommands', async () => {
      await recentModule.saveRecent({ name: 'Git Status', command: 'git status' });
      await recentModule.saveRecent({ name: 'NonExistent', command: 'echo test' });

      const allCommands = [
        { name: 'Git Status', command: 'git status' },
      ];

      const result = await recentModule.loadRecentWithCommands(allCommands as any);
      
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0].name).toBe('Git Status');
    });
  });

  describe('saveRecent', () => {
    it('should save a command to recent list', async () => {
      await recentModule.saveRecent({ name: 'Test Command', command: 'echo test' });

      const result = await recentModule.loadRecentWithCommands([]);
      expect(result.timestamps).toHaveLength(1);
      expect(result.timestamps[0].name).toBe('Test Command');
      expect(result.timestamps[0].timestamp).toBeGreaterThan(0);
    });

    it('should move existing command to front', async () => {
      await recentModule.saveRecent({ name: 'Command A', command: 'echo a' });
      await recentModule.saveRecent({ name: 'Command B', command: 'echo b' });
      await recentModule.saveRecent({ name: 'Command A', command: 'echo a' });

      const result = await recentModule.loadRecentWithCommands([]);
      expect(result.timestamps[0].name).toBe('Command A');
      expect(result.timestamps[1].name).toBe('Command B');
    });

    it('should limit recent commands to 20', async () => {
      for (let i = 0; i < 25; i++) {
        await recentModule.saveRecent({ name: `Command ${i}`, command: `echo ${i}` });
      }

      const result = await recentModule.loadRecentWithCommands([]);
      expect(result.timestamps).toHaveLength(20);
    });
  });

  describe('clearRecent', () => {
    it('should clear all recent commands', async () => {
      await recentModule.saveRecent({ name: 'Test', command: 'echo test' });
      await recentModule.clearRecent();

      const result = await recentModule.loadRecentWithCommands([]);
      expect(result.timestamps).toEqual([]);
    });
  });
});
