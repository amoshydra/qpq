import type { Command } from './command.js';

export interface Config {
  commands: Command[];
  historyBufferSize?: number;
}

export interface CliArgs {
  configPath?: string;
}