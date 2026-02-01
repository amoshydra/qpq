import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';
import type { Command } from '../types/command.js';

interface EditCommandFormProps {
  command: Command;
  existingCommands: Command[];
  onSubmit: (command: Command) => void;
  onCancel: () => void;
}

export function EditCommandForm({ command, existingCommands, onSubmit, onCancel }: EditCommandFormProps) {
  const [formField, setFormField] = useState<'name' | 'command' | 'description' | 'tags'>(('name') as 'name');
  const [name, setName] = useState(command.name || '');
  const [cmd, setCommand] = useState(command.command || '');
  const [description, setDescription] = useState(command.description || '');
  const [tags, setTags] = useState(command.tags?.join(', ') || '');

  useInput((_, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.tab) {
      nextField();
    } else if (key.shift && key.tab) {
      prevField();
    } else if (key.return && formField === 'tags') {
      handleSubmit();
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
    if (formField === 'command') {
      setFormField('name');
    } else if (formField === 'description') {
      setFormField('command');
    } else if (formField === 'tags') {
      setFormField('description');
    }
  }

  function handleSubmit() {
    const trimmedTags = tags.trim();
    const parsedTags = trimmedTags === '' ? [] : trimmedTags.split(',').map(tag => tag.trim()).filter(Boolean);

    const finalName = name.trim();
    const finalCmd = cmd.trim();

    if (!finalCmd) {
      return;
    }

    const exists = existingCommands.some(c => c.name === finalName && c.name !== command.name);
    if (exists) {
      return;
    }

    onSubmit({
      name: finalName || finalCmd,
      command: finalCmd,
      description: description.trim() || undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined
    });
  }

  const parseTags = (tags: string) => {
    const trimmedTags = tags.trim();
    if (trimmedTags === '') return [];
    return trimmedTags.split(',').map(tag => tag.trim()).filter(Boolean);
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="yellow" bold>Edit Command</Text>
      </Box>

      <Box>
        <Text color={formField === 'name' ? 'green' : 'gray'}>Name: </Text>
        <TextInput
          value={name}
          onChange={setName}
          focus={formField === 'name'}
        />
      </Box>

      <Box>
        <Text color={formField === 'command' ? 'green' : 'gray'}>Command: </Text>
        <TextInput
          value={cmd}
          onChange={setCommand}
          focus={formField === 'command'}
        />
      </Box>

      <Box>
        <Text color={formField === 'description' ? 'green' : 'gray'}>Description: </Text>
        <TextInput
          value={description}
          onChange={setDescription}
          focus={formField === 'description'}
        />
      </Box>

      <Box>
        <Text color={formField === 'tags' ? 'green' : 'gray'}>Tags: </Text>
        <TextInput
          value={tags}
          onChange={setTags}
          focus={formField === 'tags'}
        />
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Tab/Shift+Tab to navigate | Escape to cancel | Enter on last field to submit</Text>
      </Box>
    </Box>
  );
}
