import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { CommandItem } from './CommandItem.js';
import type { Command } from '../types/command.js';

interface CommandMenuProps {
  commands: Command[];
  recentCommands: Command[];
  commandTimestamps: Map<string, number>;
  favorites: string[];
  onSelect: (command: Command) => void;
  onSwitchToSearch: () => void;
  onToggleFavorite: (commandName: string) => void;
  onAdd: () => void;
  onDelete: (commandName: string) => void;
  onEdit: (command: Command) => void;
  children?: React.ReactNode;
}


export function CommandMenu({ commands, recentCommands, commandTimestamps, favorites, onSelect, onSwitchToSearch, onToggleFavorite, onAdd, onDelete, onEdit, children }: CommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();

  const favoritesList = commands.filter(cmd => favorites.includes(cmd.name));

  const nonFavoriteCommands = commands.filter(cmd => !favorites.includes(cmd.name))
    .sort((a, b) => {
      const aTime = commandTimestamps.get(a.name) || 0;
      const bTime = commandTimestamps.get(b.name) || 0;

      if (aTime === 0 && bTime === 0) {
        return a.name.localeCompare(b.name);
      }
      if (aTime === 0) return 1;
      if (bTime === 0) return -1;
      return bTime - aTime;
    });

  const allCommands = [...favoritesList, ...nonFavoriteCommands];

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    if (key.return) {
      if (allCommands.length > 0) {
        onSelect(allCommands[selectedIndex]);
      }
      return;
    }

    if (key.escape || input === '/') {
      onSwitchToSearch();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex(prev => (prev < allCommands.length - 1 ? prev + 1 : prev));
      return;
    }

    if (/^[1-9]$/.test(input)) {
      const index = parseInt(input) - 1;
      if (index >= 0 && index < allCommands.length) {
        onSelect(allCommands[index]);
      }
      return;
    }

    if (input === 'f' && allCommands.length > 0) {
      const selectedCommand = allCommands[selectedIndex];
      onToggleFavorite(selectedCommand.name);
      return;
    }

    if (input === 'a') {
      onAdd();
      return;
    }

    if (input === 'd' && allCommands.length > 0) {
      const selectedCommand = allCommands[selectedIndex];
      onDelete(selectedCommand.name);
      return;
    }

    if (input === 'e' && allCommands.length > 0) {
      const selectedCommand = allCommands[selectedIndex];
      onEdit(selectedCommand);
      return;
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>My Commands</Text>
      </Box>

      {allCommands.map((command, index) => (
        <CommandItem
          key={command.name}
          command={command}
          isSelected={index === selectedIndex}
          index={index}
          isFavorite={favorites.includes(command.name)}
        />
      ))}

      <Box marginTop={1}>
        <Text dimColor>
          ↑↓: Navigate | Enter/1-9: Select | f: Favorite | a: Add | d: Delete | e: Edit | /: Search | Ctrl+C: Quit
        </Text>
      </Box>
    </Box>
  );
}