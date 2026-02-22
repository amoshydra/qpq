import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';
import type { Command } from '../types/command.js';

interface CommandFormProps {
  initialValues?: Partial<Command>;
  existingCommands: Command[];
  onSubmit: (command: Command) => void;
  onCancel: () => void;
  existingCommandName?: string;
}

export function CommandForm({ initialValues, existingCommands, onSubmit, onCancel, existingCommandName }: CommandFormProps) {
  const [formField, setFormField] = useState<'name' | 'command' | 'description' | 'tags'>(('name') as 'name');
  const [name, setName] = useState(initialValues?.name || '');
  const [cmd, setCommand] = useState(initialValues?.command || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [tags, setTags] = useState(initialValues?.tags ? initialValues.tags.join(', ') : '');

  useInput((_, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.upArrow) {
      prevField();
    } else if (key.downArrow) {
      nextField();
    } else if (key.return) {
      if (formField === 'tags') {
        handleSubmit();
      } else {
        nextField();
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

    const exists = existingCommands.some(c => c.name === finalName && c.name !== existingCommandName);
    if (exists) {
      return;
    }

    onSubmit({
      id: initialValues?.id || 0,
      name: finalName || finalCmd,
      command: finalCmd,
      description: description.trim() || undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined
    });
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        {existingCommandName ? (
          <Text color="yellow" bold>Edit Command</Text>
        ) : (
          <Text color="cyan" bold>Add New Command</Text>
        )}
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
        <Text dimColor>↑/↓ to navigate | Escape to cancel | Enter on last field to submit</Text>
      </Box>
    </Box>
  );
}
