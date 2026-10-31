import { Box, Text, useInput } from 'ink';
import { ScrollList, type ScrollListRef } from 'ink-scroll-list';
import { useEffect, useRef, useState } from 'react';
import type { Command } from '../types/command.js';
import { getHistoryAction } from '../utils/inputActions.js';
import { CommandForm } from './CommandForm.js';

interface AddCommandFormProps {
  existingCommands: Command[];
  onSubmit: (command: Command) => void;
  onCancel: () => void;
}

export function AddCommandForm({ existingCommands, onSubmit, onCancel }: AddCommandFormProps) {
  const listRef = useRef<ScrollListRef>(null);
  const [stage, setStage] = useState<'history' | 'form'>('history');
  const [historyCommands, setHistoryCommands] = useState<string[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedCommandFromHistory, setSelectedCommandFromHistory] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const { getLastCommands } = await import('../utils/shellHistory.js');
        const commands = await getLastCommands(30);

        if (!cancelled) {
          setHistoryCommands(commands);
          setHistoryIndex(current => (current < 0 && commands.length > 0 ? 0 : current));
        }
      } catch {
        if (!cancelled) {
          setHistoryCommands([]);
        }
      } finally {
        if (!cancelled) {
          setHistoryLoaded(true);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  useInput((input, key) => {
    if (stage === 'form') {
      return;
    }

    const action = getHistoryAction(input, key);

    if (action === 'cancel') {
      onCancel();
      return;
    }

    if (action === 'new') {
      setSelectedCommandFromHistory(null);
      setStage('form');
      return;
    }

    if (action === 'select') {
      if (historyCommands.length > 0) {
        const selectedIndex = historyIndex >= 0 ? historyIndex : 0;
        setSelectedCommandFromHistory(historyCommands[selectedIndex]);
        setStage('form');
      }
      return;
    }

    if (action === 'previous') {
      if (historyCommands.length > 0) {
        setHistoryIndex(prev => (prev < 0 ? 0 : prev > 0 ? prev - 1 : prev));
      }
      return;
    }

    if (action === 'next') {
      if (historyCommands.length > 0) {
        setHistoryIndex(prev => (prev < historyCommands.length - 1 ? prev + 1 : prev));
      }
    }
  });

  if (stage === 'history') {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="cyan" bold>Add Command - Shell History</Text>
        </Box>

        {!historyLoaded ? (
          <Box>
            <Text dimColor>Loading shell history...</Text>
          </Box>
        ) : historyCommands.length === 0 ? (
          <Box>
            <Text dimColor>No command history found</Text>
          </Box>
        ) : (
          <Box borderStyle="single" height={10}>
            <ScrollList ref={listRef} selectedIndex={historyIndex}>
              {historyCommands.map((historyCommand, index) => (
                <Box key={historyCommand}>
                  <Box width={4}>
                    <Text color={index === historyIndex ? 'green' : 'gray'}>{index + 1}.</Text>
                  </Box>
                  <Box>
                    <Text
                      inverse={index === historyIndex}
                      color={index === historyIndex ? 'green' : undefined}
                      wrap="truncate-end"
                    >
                      {historyCommand}
                    </Text>
                  </Box>
                </Box>
              ))}
            </ScrollList>
          </Box>
        )}

        <Box marginTop={1}>
          <Text dimColor>↑↓: Navigate | Enter: Select | n: New command | Escape: Cancel</Text>
        </Box>
      </Box>
    );
  }

  return (
    <CommandForm
      initialValues={selectedCommandFromHistory ? { command: selectedCommandFromHistory } : undefined}
      existingCommands={existingCommands}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
