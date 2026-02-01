import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';
import type { Command } from '../types/command.js';
import { captureShellHistorySubprocess, readHistoryFiles } from '../utils/shellHistory.js';
import { CommandForm } from './CommandForm.js';

interface AddCommandFormProps {
  existingCommands: Command[];
  onSubmit: (command: Command) => void;
  onCancel: () => void;
}

export function AddCommandForm({ existingCommands, onSubmit, onCancel }: AddCommandFormProps) {
  const [stage, setStage] = useState<'history' | 'form'>('history');
  const [historyCommands, setHistoryCommands] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedCommandFromHistory, setSelectedCommandFromHistory] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        let commands = captureShellHistorySubprocess(40);
        if (commands.length === 0) {
          commands = await readHistoryFiles(40);
        }
        setHistoryCommands(commands.slice(0, 30));
      } catch {
        setHistoryCommands([]);
      }
    }
    loadHistory();
  }, []);

  useInput((input, key) => {
    if (stage === 'form') {
      return;
    }

    if (key.escape || input === 'q') {
      onCancel();
      return;
    }

    if (input === 'n') {
      setSelectedCommandFromHistory(null);
      setStage('form');
      return;
    }

    if (key.return && historyIndex >= 0 && historyCommands.length > 0) {
      setSelectedCommandFromHistory(historyCommands[historyIndex]);
      setStage('form');
      return;
    }

    if (key.upArrow) {
      if (historyCommands.length > 0) {
        setHistoryIndex(prev => (prev < 0 ? 0 : prev > 0 ? prev - 1 : prev));
      }
      return;
    }

    if (key.downArrow) {
      if (historyCommands.length > 0) {
        setHistoryIndex(prev => (prev < historyCommands.length - 1 ? prev + 1 : prev));
      }
      return;
    }
  });

  if (stage === 'history') {
    const displayCommands = historyCommands.slice(0, 30);

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="cyan" bold>Add Command - Shell History</Text>
        </Box>
        
        {displayCommands.length > 0 ? (
          <>
            {displayCommands.map((cmd, idx) => (
              <Box key={cmd}>
                <Box width={4}>
                  <Text color={idx === historyIndex ? 'green' : 'gray'}>{idx + 1}.</Text>
                </Box>
                <Box>
                  <Text inverse={idx === historyIndex} color={idx === historyIndex ? 'green' : undefined}>{cmd}</Text>
                </Box>
              </Box>
            ))}
          </>
        ) : (
          <Box>
            <Text dimColor>No command history found</Text>
          </Box>
        )}
        
        <Box marginTop={1}>
          <Text dimColor>↑↓: Navigate | Enter: Select | n: New command | Escape/q: Cancel</Text>
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
