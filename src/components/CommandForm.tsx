import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useRef, useState } from 'react';
import type { Command } from '../types/command.js';
import { buildCommandFromForm } from '../utils/commandForm.js';
import { getFormNavigationAction } from '../utils/inputActions.js';

type FormField = 'name' | 'command' | 'description' | 'tags';

interface CommandFormProps {
  initialValues?: Partial<Command>;
  existingCommands: Command[];
  onSubmit: (command: Command) => void;
  onCancel: () => void;
}

export function CommandForm({ initialValues, existingCommands, onSubmit, onCancel }: CommandFormProps) {
  const [formField, setFormField] = useState<FormField>('name');
  const [name, setName] = useState(initialValues?.name || '');
  const [command, setCommand] = useState(initialValues?.command || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [tags, setTags] = useState(initialValues?.tags ? initialValues.tags.join(', ') : '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);

  const isEditing = initialValues?.id !== undefined;

  useInput((input, key) => {
    const action = getFormNavigationAction(input, key, formField === 'tags');

    if (action === 'cancel') {
      onCancel();
    } else if (action === 'previous') {
      prevField();
    } else if (action === 'next') {
      nextField();
    } else if (action === 'submit') {
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
    if (submitting.current) {
      return;
    }

    const result = buildCommandFromForm(
      { name, command, description, tags },
      existingCommands,
      initialValues?.id,
    );

    if (!result.ok) {
      setError(result.error);
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);

    onSubmit({
      ...result.command,
      id: initialValues?.id ?? 0,
    });
  }

  function clearError() {
    if (error) {
      setError(null);
    }
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        {isEditing ? (
          <Text color="yellow" bold>Edit Command</Text>
        ) : (
          <Text color="cyan" bold>Add New Command</Text>
        )}
      </Box>

      <Box>
        <Text color={formField === 'name' ? 'green' : 'gray'}>Name: </Text>
        <TextInput
          value={name}
          onChange={(value) => {
            setName(value);
            clearError();
          }}
          focus={formField === 'name'}
        />
      </Box>

      <Box>
        <Text color={formField === 'command' ? 'green' : 'gray'}>Command: </Text>
        <TextInput
          value={command}
          onChange={(value) => {
            setCommand(value);
            clearError();
          }}
          focus={formField === 'command'}
        />
      </Box>

      <Box>
        <Text color={formField === 'description' ? 'green' : 'gray'}>Description: </Text>
        <TextInput
          value={description}
          onChange={(value) => {
            setDescription(value);
            clearError();
          }}
          focus={formField === 'description'}
        />
      </Box>

      <Box>
        <Text color={formField === 'tags' ? 'green' : 'gray'}>Tags: </Text>
        <TextInput
          value={tags}
          onChange={(value) => {
            setTags(value);
            clearError();
          }}
          focus={formField === 'tags'}
        />
      </Box>

      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          {isSubmitting ? 'Saving...' : '↑/↓ to navigate | Escape to cancel | Enter on last field to submit'}
        </Text>
      </Box>
    </Box>
  );
}
