import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { Command } from '../types/command.js';

interface EditCommandFormProps {
  command: Command;
  existingCommands: Command[];
  onSubmit: (command: Command) => void;
  onCancel: () => void;
}

export function EditCommandForm({ command, existingCommands, onSubmit, onCancel }: EditCommandFormProps) {
  const [formField, setFormField] = useState<'name' | 'command' | 'description' | 'tags'>('name');
  const [commandData, setCommandData] = useState<Partial<Command>>({
    name: command.name,
    command: command.command,
    description: command.description || '',
    tags: command.tags || []
  });
  const { exit } = useApp();

  useInput((input, key) => {
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

    const exists = existingCommands.some(c => c.name === finalName && c.name !== command.name);
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

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="yellow" bold>Edit Command</Text>
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