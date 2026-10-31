import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { Command } from '../types/command.js';
import { getDeleteConfirmationAction } from '../utils/inputActions.js';

interface DeleteConfirmationProps {
  command: Command | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteConfirmation({ command, onConfirm, onCancel }: DeleteConfirmationProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  useInput((input, key) => {
    if (!command) {
      return;
    }

    const action = getDeleteConfirmationAction(input, key, isDeleting);

    if (action === 'cancel') {
      onCancel();
      return;
    }

    if (action === 'confirm') {
      setIsDeleting(true);
      void onConfirm().catch(() => {
        setIsDeleting(false);
      });
    }
  });

  if (!command) {
    return null;
  }

  return (
    <Box
      borderStyle="round"
      borderColor="yellow"
      padding={1}
      flexDirection="column"
      gap={1}
    >
      <Box>
        <Text color="yellow" bold>
          Delete command: {command.name}
        </Text>
      </Box>
      <Box
        borderStyle="round"
        borderColor="gray"
        padding={1}
      >
        <Text>
          {command.command}
        </Text>
      </Box>
      <Box>
        <Text color="white">Are you sure? (Y/n)</Text>
      </Box>
      {isDeleting && (
        <Box>
          <Text color="gray">Deleting...</Text>
        </Box>
      )}
    </Box>
  );
}
