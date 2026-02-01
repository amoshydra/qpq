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
  const [caretPosition, setCaretPosition] = useState(command.name.length);
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

    if (key.leftArrow) {
      setCaretPosition(prev => Math.max(0, prev - 1));
      return;
    }

    if (key.rightArrow) {
      const value = getCurrentFieldValue();
      setCaretPosition(prev => Math.min(value.length, prev + 1));
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

    if (key.backspace) {
      updateField(true, 'backspace');
      return;
    }

    if (key.delete) {
      updateField(true, 'delete');
      return;
    }

    if (input && !key.ctrl) {
      updateField(false, undefined, input);
      return;
    }
  });

  function nextField() {
    if (formField === 'name') {
      setFormField('command');
      setCaretPosition((commandData.command || '').length);
    } else if (formField === 'command') {
      setFormField('description');
      setCaretPosition((commandData.description || '').length);
    } else if (formField === 'description') {
      setFormField('tags');
      setCaretPosition((commandData.tags || []).join(', ').length);
    }
  }

  function prevField() {
    if (formField === 'description') {
      setFormField('command');
      setCaretPosition((commandData.command || '').length);
    } else if (formField === 'command') {
      setFormField('name');
      setCaretPosition((commandData.name || '').length);
    } else if (formField === 'tags') {
      setFormField('description');
      setCaretPosition((commandData.description || '').length);
    }
  }

  function getCurrentFieldValue(): string {
    if (formField === 'name') return commandData.name || '';
    if (formField === 'command') return commandData.command || '';
    if (formField === 'description') return commandData.description || '';
    const tags = commandData.tags || [];
    return tags.join(', ');
  }

  function updateField(isDelete: boolean, deleteType?: 'backspace' | 'delete', char?: string) {
    let value = getCurrentFieldValue();

    if (isDelete && deleteType === 'backspace') {
      if (caretPosition > 0) {
        value = value.slice(0, caretPosition - 1) + value.slice(caretPosition);
        setCaretPosition(prev => prev - 1);
      }
    } else if (isDelete && deleteType === 'delete') {
      if (caretPosition < value.length) {
        value = value.slice(0, caretPosition) + value.slice(caretPosition + 1);
      }
    } else if (char) {
      value = value.slice(0, caretPosition) + char + value.slice(caretPosition);
      setCaretPosition(prev => prev + 1);
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
        <Text>{(commandData.name || '').slice(0, caretPosition)}</Text>
        <Text inverse>{(commandData.name || '')[caretPosition] || ' '}</Text>
        <Text inverse color="gray">{(commandData.name || '').slice(caretPosition + 1)}</Text>
        <Text inverse color="gray"> </Text>
      </Box>

      <Box>
        <Text color={formField === 'command' ? 'green' : 'gray'}>Command:</Text>
        <Text> </Text>
        <Text>{(commandData.command || '').slice(0, caretPosition)}</Text>
        <Text inverse>{(commandData.command || '')[caretPosition] || ' '}</Text>
        <Text inverse color="gray">{(commandData.command || '').slice(caretPosition + 1)}</Text>
        <Text inverse color="gray"> </Text>
      </Box>

      <Box>
        <Text color={formField === 'description' ? 'green' : 'gray'}>Description:</Text>
        <Text> </Text>
        <Text>{(commandData.description || '').slice(0, caretPosition)}</Text>
        <Text inverse>{(commandData.description || '')[caretPosition] || ' '}</Text>
        <Text inverse color="gray">{(commandData.description || '').slice(caretPosition + 1)}</Text>
        <Text inverse color="gray"> </Text>
      </Box>

      <Box>
        <Text color={formField === 'tags' ? 'green' : 'gray'}>Tags:</Text>
        <Text> </Text>
        <Text>{((commandData.tags || []).join(', ')).slice(0, caretPosition)}</Text>
        <Text inverse>{((commandData.tags || []).join(', '))[caretPosition] || ' '}</Text>
        <Text inverse color="gray">{((commandData.tags || []).join(', ')).slice(caretPosition + 1)}</Text>
        <Text inverse color="gray"> </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Command is mandatory | Tags are comma-separated</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Tab/Shift+Tab: Change field | Enter: Submit | Escape: Cancel
        </Text>
      </Box>
    </Box>
  );
}