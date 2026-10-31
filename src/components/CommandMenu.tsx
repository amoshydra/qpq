import { Box, Text, useApp, useInput } from 'ink';
import { useState } from 'react';
import type { Command } from '../types/command.js';
import { getSelectedIndex, orderCommands } from '../utils/commandOrder.js';
import { getMenuAction } from '../utils/inputActions.js';
import { CommandList } from './CommandList.js';

interface CommandMenuProps {
  commands: Command[];
  commandTimestamps: Map<number, number>;
  favorites: number[];
  onSelect: (command: Command) => void;
  onSwitchToSearch: () => void;
  onToggleFavorite: (commandId: number) => void;
  onAdd: () => void;
  onDelete: (commandId: number) => void;
  onEdit: (command: Command) => void;
  onDuplicate: (command: Command) => void;
}

export function CommandMenu({
  commands,
  commandTimestamps,
  favorites,
  onSelect,
  onSwitchToSearch,
  onToggleFavorite,
  onAdd,
  onDelete,
  onEdit,
  onDuplicate,
}: CommandMenuProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { exit } = useApp();

  const allCommands = orderCommands(commands, favorites, commandTimestamps);
  const selectedIndex = getSelectedIndex(allCommands, selectedId);
  const selectedCommand = allCommands[selectedIndex];

  const moveSelection = (delta: number) => {
    if (allCommands.length === 0) {
      return;
    }

    const nextIndex = Math.min(Math.max(selectedIndex + delta, 0), allCommands.length - 1);
    setSelectedId(allCommands[nextIndex].id);
  };

  useInput((input, key) => {
    const action = getMenuAction(input, key);

    if (!action) {
      return;
    }

    switch (action.type) {
      case 'quit':
        exit();
        return;

      case 'switch-to-search':
        onSwitchToSearch();
        return;

      case 'add':
        onAdd();
        return;

      case 'move':
        moveSelection(action.delta);
        return;

      case 'select':
        if (selectedCommand) {
          onSelect(selectedCommand);
        }
        return;

      case 'select-index':
        if (action.index < allCommands.length) {
          onSelect(allCommands[action.index]);
        }
        return;

      case 'toggle-favorite':
        if (selectedCommand) {
          setSelectedId(selectedCommand.id);
          onToggleFavorite(selectedCommand.id);
        }
        return;

      case 'delete':
        if (selectedCommand) {
          onDelete(selectedCommand.id);
        }
        return;

      case 'edit':
        if (selectedCommand) {
          onEdit(selectedCommand);
        }
        return;

      case 'duplicate':
        if (selectedCommand) {
          onDuplicate(selectedCommand);
        }
        return;
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          My Commands
        </Text>
      </Box>

      {allCommands.length > 0 ? (
        <CommandList commands={allCommands} selectedIndex={selectedIndex} favorites={favorites} />
      ) : (
        <Box>
          <Text dimColor>No commands yet. Press a to add one.</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          ↑↓: Navigate | Enter/1-9: Select | f: Favorite | a: Add | d: Delete | e: Edit | c: Clone |
          /: Search | Ctrl+C: Quit
        </Text>
      </Box>
    </Box>
  );
}
