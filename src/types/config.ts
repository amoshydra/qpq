import type { Command } from './command.js';

export interface Config {
  commands: Command[];
}

export interface CliArgs {
  configPath?: string;
}