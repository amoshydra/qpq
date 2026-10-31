import type { Command } from '../types/command.js';
import type { Config } from '../types/config.js';

function getNextId(config: Config): number {
  const maxId = config.commands.reduce((max, command) => Math.max(max, command.id), 0);
  const configuredNextId = Number.isFinite(config.nextId) && config.nextId > 0 ? config.nextId : 1;

  return Math.max(configuredNextId, maxId + 1);
}

function getCopyName(commands: Command[], baseName: string): string {
  const existingNames = new Set(commands.map(command => command.name));
  let candidate = `${baseName} (Copy)`;
  let copyNumber = 2;

  while (existingNames.has(candidate)) {
    candidate = `${baseName} (Copy ${copyNumber})`;
    copyNumber += 1;
  }

  return candidate;
}

export function addCommand(config: Config, command: Command): Config {
  const id = getNextId(config);

  return {
    ...config,
    commands: [...config.commands, { ...command, id }],
    nextId: id + 1,
  };
}

export function duplicateCommand(config: Config, command: Command): Config {
  const id = getNextId(config);

  return {
    ...config,
    commands: [
      ...config.commands,
      {
        ...command,
        id,
        name: getCopyName(config.commands, command.name),
      },
    ],
    nextId: id + 1,
  };
}

export function updateCommand(config: Config, command: Command): Config {
  return {
    ...config,
    commands: config.commands.map(existing => existing.id === command.id ? command : existing),
  };
}

export function removeCommand(config: Config, commandId: number): Config {
  return {
    ...config,
    commands: config.commands.filter(command => command.id !== commandId),
    favorites: config.favorites.filter(id => id !== commandId),
    recent: config.recent.filter(entry => entry.id !== commandId),
  };
}

export function toggleFavorite(config: Config, commandId: number): Config {
  const isFavorite = config.favorites.includes(commandId);

  if (!config.commands.some(command => command.id === commandId)) {
    return config;
  }

  return {
    ...config,
    favorites: isFavorite
      ? config.favorites.filter(id => id !== commandId)
      : [...config.favorites, commandId],
  };
}
