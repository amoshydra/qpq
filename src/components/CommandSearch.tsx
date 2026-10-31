import { Box, Text, useApp, useInput } from 'ink';
import { useState } from 'react';
import type { Command } from '../types/command.js';
import { getSearchAction } from '../utils/inputActions.js';
import { searchCommands } from '../utils/search.js';
import { CommandList } from './CommandList.js';

interface CommandSearchProps {
  allCommands: Command[];
  recentCommands: Command[];
  favorites: number[];
  onSelect: (command: Command) => void;
  onSwitchToMenu: () => void;
}

export function CommandSearch({
  allCommands,
  recentCommands,
  favorites,
  onSelect,
  onSwitchToMenu,
}: CommandSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();

  const orderedCommands = recentCommands.length > 0
    ? [...recentCommands, ...allCommands.filter(command => !recentCommands.some(recent => recent.id === command.id))]
    : allCommands;
  const filteredCommands = searchCommands(orderedCommands, searchQuery);
  const selectedIndexSafe = Math.min(selectedIndex, Math.max(filteredCommands.length - 1, 0));

  useInput((input, key) => {
    const action = getSearchAction(input, key);

    if (!action) {
      return;
    }

    switch (action.type) {
      case 'quit':
        exit();
        return;

      case 'select':
        if (filteredCommands.length > 0) {
          onSelect(filteredCommands[selectedIndexSafe]);
        }
        return;

      case 'back-to-menu':
        onSwitchToMenu();
        return;

      case 'move':
        setSelectedIndex(prev => {
          const nextIndex = prev + action.delta;
          return Math.min(Math.max(nextIndex, 0), Math.max(filteredCommands.length - 1, 0));
        });
        return;

      case 'backspace':
        setSearchQuery(prev => prev.slice(0, -1));
        setSelectedIndex(0);
        return;

      case 'append':
        setSearchQuery(prev => prev + action.value);
        setSelectedIndex(0);
        return;
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>Search Commands</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="green">{`>`}</Text>
        <Text> </Text>
        <Text inverse color="bgMagenta">{searchQuery}</Text>
        <Text inverse color="bgMagenta"> </Text>
      </Box>
      {filteredCommands.length > 0 ? (
        <CommandList
          commands={filteredCommands}
          selectedIndex={selectedIndexSafe}
          favorites={favorites}
        />
      ) : (
        <Box>
          <Text dimColor>No commands found</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>
          ↑↓: Navigate | Enter: Select | Escape: Menu | Ctrl+C: Quit
        </Text>
      </Box>
    </Box>
  );
}
