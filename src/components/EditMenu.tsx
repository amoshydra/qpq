import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface EditMenuProps {
  onAdd: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function EditMenu({ onAdd, onDelete, onCancel }: EditMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    if (key.escape || input === 'q') {
      onCancel();
      return;
    }

    if (key.return) {
      if (selectedIndex === 0) {
        onAdd();
      } else {
        onDelete();
      }
      return;
    }

    if (key.upArrow || key.leftArrow) {
      setSelectedIndex(prev => (prev > 0 ? 0 : 1));
      return;
    }

    if (key.downArrow || key.rightArrow) {
      setSelectedIndex(prev => (prev < 1 ? 1 : 0));
      return;
    }

    if (input === 'a') {
      onAdd();
      return;
    }

    if (input === 'd') {
      onDelete();
      return;
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="magenta" bold>Edit Mode</Text>
      </Box>
      <Box marginBottom={1}>
        <Text inverse={selectedIndex === 0} color={selectedIndex === 0 ? 'green' : undefined}>
          Selected Action:
        </Text>
      </Box>
      <Box>
        <Box>
          <Text color={selectedIndex === 0 ? 'green' : 'gray'}>
            {selectedIndex === 0 ? '> ' : '  '}
          </Text>
          <Text bold={selectedIndex === 0}>[A]dd New Command</Text>
        </Box>
        <Box>
          <Text color={selectedIndex === 1 ? 'green' : 'gray'}>
            {selectedIndex === 1 ? '> ' : '  '}
          </Text>
          <Text bold={selectedIndex === 1}>[D]elete Commands</Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          ↑↓/←→: Select | Enter/a/d: Confirm | Escape/q: Cancel | Ctrl+C: Quit
        </Text>
      </Box>
    </Box>
  );
}