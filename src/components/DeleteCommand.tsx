import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { Command } from '../types/command.js';

interface DeleteCommandProps {
  commands: Command[];
  favorites: number[];
  onDelete: (commandId: number) => Promise<void>;
  onCancel: () => void;
}

export function DeleteCommand({ commands, favorites, onDelete, onCancel }: DeleteCommandProps) {
  const [stage, setStage] = useState<'select' | 'confirm'>('select');
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const { exit } = useApp();

  useInput((input, key) => {
    if (isDeleting) {
      return;
    }

    if (key.escape) {
      if (stage === 'select') {
        onCancel();
      } else {
        setStage('select');
        setSelectedCommand(null);
      }
      return;
    }

    if (stage === 'select') {
      if (key.return) {
        setSelectedCommand(commands[selectedIndex]);
        setStage('confirm');
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
          setSelectedCommand(commands[index]);
          setStage('confirm');
        }
        return;
      }
    } else {
      if (key.return || input === 'y') {
        if (selectedCommand) {
          setIsDeleting(true);
          onDelete(selectedCommand.id).finally(() => {
            setIsDeleting(false);
            setStage('select');
            setSelectedCommand(null);
          });
        }
        return;
      }

      if (input === 'n') {
        setStage('select');
        setSelectedCommand(null);
        return;
      }
    }
  });

  if (stage === 'select') {
    if (commands.length === 0) {
      return (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="red" bold>Delete Command</Text>
          </Box>
          <Box>
            <Text dimColor>No commands to delete</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Press Escape to cancel
            </Text>
          </Box>
        </Box>
      );
    }
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="red" bold>Delete Command</Text>
        </Box>
        <Box marginBottom={1}>
          <Text dimColor>Select command to delete:</Text>
        </Box>
        
        {commands.map((cmd, idx) => (
          <Box key={cmd.name}>
            <Box width={4}>
              <Text color={idx === selectedIndex ? 'green' : 'gray'}>{idx + 1}.</Text>
            </Box>
            <Box width={30}>
              <Text inverse={idx === selectedIndex} color={idx === selectedIndex ? 'green' : favorites.includes(cmd.id) ? 'yellow' : undefined}>
                {cmd.name}
              </Text>
            </Box>
            <Box>
              <Text dimColor>{cmd.description || ''}</Text>
            </Box>
          </Box>
        ))}
        
        <Box marginTop={1}>
          <Text dimColor>
            ↑↓: Navigate | Enter/1-9: Select | Escape: Cancel
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="red" bold>Delete Command</Text>
      </Box>
      
      <Box marginBottom={1}>
        {isDeleting ? (
          <Text>Deleting...</Text>
        ) : (
          <Text>Delete "{selectedCommand?.name}"?</Text>
        )}
      </Box>
      
      <Box marginBottom={1}>
        <Text dimColor>This will remove from: config, favorites, recent</Text>
      </Box>
      
      <Box marginTop={1}>
        <Text dimColor>[Enter/Y] Confirm | [N] Cancel | Escape: Back</Text>
      </Box>
    </Box>
  );
}