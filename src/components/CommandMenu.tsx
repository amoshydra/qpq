import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { CommandItem } from './CommandItem.js';
import type { Command } from '../types/command.js';

interface CommandMenuProps {
  commands: Command[];
  onSelect: (command: Command) => void;
  onSwitchToSearch: () => void;
}

export function CommandMenu({ commands, onSelect, onSwitchToSearch }: CommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    if (key.return) {
      onSelect(commands[selectedIndex]);
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
      setSelectedIndex(prev => (prev < commands.length - 1 ? prev + 1 : prev));
      return;
    }

    if (/^[1-9]$/.test(input)) {
      const index = parseInt(input) - 1;
      if (index >= 0 && index < commands.length) {
        onSelect(commands[index]);
      }
      return;
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>Command Menu</Text>
      </Box>
      {commands.map((command, index) => (
        <CommandItem
          key={command.name}
          command={command}
          isSelected={index === selectedIndex}
          index={index}
        />
      ))}
      <Box marginTop={1}>
        <Text dimColor>
          ↑↓: Navigate | Enter/1-9: Select | /: Search | Ctrl+C: Quit
        </Text>
      </Box>
    </Box>
  );
}