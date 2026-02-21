import { Box, Text, useApp, useInput } from 'ink';
import { useState } from 'react';
import type { Command } from '../types/command.js';
import { fuzzySearch } from '../utils/search.js';
import { CommandItem } from './CommandItem.js';

interface CommandSearchProps {
  allCommands: Command[];
  recentCommands: Command[];
  favorites: string[];
  onSelect: (command: Command) => void;
  onSwitchToMenu: () => void;
}

export function CommandSearch({ allCommands, recentCommands, favorites, onSelect, onSwitchToMenu }: CommandSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();

  const filteredCommands = fuzzySearch(recentCommands.length > 0
    ? [...recentCommands, ...allCommands.filter(c => !recentCommands.some(r => r.name === c.name))]
    : allCommands,
    searchQuery
  );

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    if (key.return) {
      if (filteredCommands.length > 0) {
        onSelect(filteredCommands[selectedIndex]);
      }
      return;
    }

    if (key.escape) {
      onSwitchToMenu();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : prev));
      return;
    }

    if (key.backspace || key.delete) {
      setSearchQuery(prev => prev.slice(0, -1));
      setSelectedIndex(0);
      return;
    }

    if (input && !key.ctrl) {
      setSearchQuery(prev => prev + input);
      setSelectedIndex(0);
      return;
    }

    if (/^[1-9]$/.test(input)) {
      const index = parseInt(input) - 1;
      if (index >= 0 && index < filteredCommands.length) {
        onSelect(filteredCommands[index]);
      }
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
        <>
          {filteredCommands.map((command, index) => (
            <CommandItem
              key={command.name}
              command={command}
              isSelected={index === selectedIndex}
              index={index}
              isFavorite={favorites.includes(command.name)}
            />
          ))}
        </>
      ) : (
        <Box>
          <Text dimColor>No commands found</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>
          ↑↓: Navigate | Enter/1-9: Select | Escape: Menu | Ctrl+C: Quit
        </Text>
      </Box>
    </Box>
  );
}