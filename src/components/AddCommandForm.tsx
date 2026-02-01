import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { Command } from '../types/command.js';
import { getLastCommands } from '../utils/shellHistory.js';

interface AddCommandFormProps {
  existingCommands: Command[];
  onSubmit: (command: Command) => void;
  onCancel: () => void;
}

export function AddCommandForm({ existingCommands, onSubmit, onCancel }: AddCommandFormProps) {
  const [stage, setStage] = useState<'history' | 'form'>('history');
  const [historyCommands, setHistoryCommands] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();

  const [formField, setFormField] = useState<'name' | 'command' | 'description' | 'tags'>('name');
  const [commandData, setCommandData] = useState<Partial<Command>>({
    name: '',
    command: '',
    description: '',
    tags: []
  });

  useEffect(() => {
    async function loadHistory() {
      try {
        const commands = await getLastCommands(30);
        setHistoryCommands(commands);
      } catch {
        setHistoryCommands([]);
      }
    }
    loadHistory();
  }, []);

  useInput((input, key) => {
    if (stage === 'history') {
      if (key.escape || input === 'q') {
        onCancel();
        return;
      }

      if (input === 'n') {
        setStage('form');
        setFormField('name');
        setSelectedIndex(0);
        setCommandData({ name: '', command: '', description: '', tags: [] });
        return;
      }

      if (key.return && historyIndex >= 0 && historyCommands.length > 0) {
        const selectedCmd = historyCommands[historyIndex];
        setCommandData({
          name: '',
          command: selectedCmd,
          description: ''
        });
        setStage('form');
        setFormField('name');
        setSelectedIndex(0);
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
    } else {
if (key.escape || input === 'q') {
      onCancel();
      return;
    }

      if (key.return) {
        if (formField === 'tags') {
          handleSubmit();
          return;
        }
        nextField();
        return;
      }

      if (key.shift && key.tab) {
        prevField();
        return;
      }

      if (key.tab) {
        nextField();
        return;
      }

      if (key.backspace || key.delete) {
        updateField(true);
        return;
      }

      if (input && !key.ctrl) {
        updateField(false, input);
        return;
      }
    }
  });

  function nextField() {
    if (formField === 'name') {
      setFormField('command');
    } else if (formField === 'command') {
      setFormField('description');
    } else if (formField === 'description') {
      setFormField('tags');
    }
  }

  function prevField() {
    if (formField === 'description') {
      setFormField('command');
    } else if (formField === 'command') {
      setFormField('name');
    } else if (formField === 'tags') {
      setFormField('description');
    }
  }

  function updateField(isBackspace: boolean, char?: string) {
    let value = '';
    
    if (formField === 'name') value = commandData.name || '';
    if (formField === 'command') value = commandData.command || '';
    if (formField === 'description') value = commandData.description || '';
    if (formField === 'tags') {
      const tags = commandData.tags || [];
      value = tags.join(', ');
    }

    if (isBackspace) {
      value = value.slice(0, -1);
    } else if (char) {
      value += char;
    }

    if (formField === 'tags') {
      const tags = value.split(',').map(t => t.trim()).filter(Boolean);
      setCommandData(prev => ({ ...prev, tags }));
    } else {
      setCommandData(prev => {
        if (formField === 'name') return { ...prev, name: value };
        if (formField === 'command') return { ...prev, command: value };
        if (formField === 'description') return { ...prev, description: value };
        return prev;
      });
    }
  }

  function handleSubmit() {
    const name = commandData.name?.trim();
    const cmd = commandData.command?.trim();
    const description = commandData.description?.trim();
    const tags = commandData.tags;

    if (!cmd) {
      return;
    }

    const finalName = name || cmd;

    const exists = existingCommands.some(c => c.name === finalName);
    if (exists) {
      return;
    }

    onSubmit({
      name: finalName,
      command: cmd,
      description: description || undefined,
      tags: tags && tags.length > 0 ? tags : undefined
    });
  }

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
                  <Text inverse={idx === historyIndex} color={idx === historyIndex ? 'green' : undefined}>
                    {cmd}
                  </Text>
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
          <Text dimColor>
            ↑↓: Navigate | Enter: Select | n: New command | Escape/q: Cancel
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>Add New Command</Text>
      </Box>

      <Box>
        <Text color={formField === 'name' ? 'green' : 'gray'}>Name:</Text>
        <Text> </Text>
        <Text inverse>{commandData.name || ''}</Text>
        <Text inverse color="gray"> </Text>
      </Box>

      <Box>
        <Text color={formField === 'command' ? 'green' : 'gray'}>Command:</Text>
        <Text> </Text>
        <Text inverse>{commandData.command || ''}</Text>
        <Text inverse color="gray"> </Text>
      </Box>

      <Box>
        <Text color={formField === 'description' ? 'green' : 'gray'}>Description:</Text>
        <Text> </Text>
        <Text inverse>{commandData.description || ''}</Text>
        <Text inverse color="gray"> </Text>
      </Box>

      <Box>
        <Text color={formField === 'tags' ? 'green' : 'gray'}>Tags:</Text>
        <Text> </Text>
        <Text inverse>{(commandData.tags || []).join(', ') || ''}</Text>
        <Text inverse color="gray"> </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Command is mandatory | Tags are comma-separated</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Tab: Next field | Shift+Tab: Previous field | Enter: Submit last field | Escape: Cancel
        </Text>
      </Box>
    </Box>
  );
}