import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { Command } from '../types/command.js';

interface DeleteConfirmationProps {
  command: Command | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmation({ command, onConfirm, onCancel }: DeleteConfirmationProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  useInput((input, key) => {
    if (!command) return;

    // Confirm deletion
    if (key.return || input === 'y' || input === 'Y') {
      setIsDeleting(true);
      onConfirm();
      return;
    }

    // Cancel deletion
    if (input === 'n' || input === 'N' || input === 'q' || key.escape) {
      onCancel();
      return;
    }
  });

  if (!command) {
    return null;
  }

  return (
    <Box
      borderStyle='round'
      borderColor='yellow'
      padding={1}
      flexDirection='column'
      gap={1}
    >
      <Box>
        <Text color='yellow' bold>
          Delete command: {command.name}
        </Text>
      </Box>
      <Box
        borderStyle='round'
        borderColor='gray'
        padding={1}
      >
        <Text>
          {command.command}
        </Text>
      </Box>
      <Box>
        <Text color='white'>Are you sure? (Y/n)</Text>
      </Box>
      {isDeleting && (
        <Box>
          <Text color='gray'>Deleting...</Text>
        </Box>
      )}
    </Box>
  );
}
