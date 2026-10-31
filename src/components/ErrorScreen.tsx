import { Box, Text, useInput } from 'ink';

export interface UiError {
  message: string;
  recoverable: boolean;
}

interface ErrorScreenProps {
  error: UiError;
  onDismiss: () => void;
}

export function ErrorScreen({ error, onDismiss }: ErrorScreenProps) {
  useInput((input, key) => {
    if (!error.recoverable) {
      return;
    }

    if (key.escape || key.return || input === '\n') {
      onDismiss();
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="red">{error.message}</Text>
      <Box marginTop={1}>
        <Text dimColor>
          {error.recoverable
            ? 'Press Enter or Escape to return to the menu.'
            : 'Press Ctrl+C to quit.'}
        </Text>
      </Box>
    </Box>
  );
}
