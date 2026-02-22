import type { Command } from './command.js';

export interface RecentCommand {
  id: number;
  timestamp: number;
}

export interface Config {
  commands: Command[];
  favorites: number[];
  recent: RecentCommand[];
  nextId: number;
  historyBufferSize?: number;
}

export interface CliArgs {
  configPath?: string;
}