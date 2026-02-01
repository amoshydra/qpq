import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { Command } from '../types/command.js';

interface TemplatePromptProps {
  placeholders: string[];
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
}

export function TemplatePrompt({ placeholders, onSubmit, onCancel }: TemplatePromptProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const { exit } = useApp();

  const currentPlaceholder = placeholders[currentIndex];
  const currentValue = values[currentPlaceholder] || '';

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'l')) {
      onCancel();
      return;
    }

    if (input) {
      setValues(prev => ({
        ...prev,
        [currentPlaceholder]: currentValue + input,
      }));
      return;
    }

    if (key.return) {
      if (currentIndex < placeholders.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onSubmit(values);
        exit();
      }
      return;
    }

    if (key.backspace || key.delete) {
      setValues(prev => ({
        ...prev,
        [currentPlaceholder]: currentValue.slice(0, -1),
      }));
      return;
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">Enter {placeholders[currentIndex]}:</Text>
        <Text> </Text>
        <Text inverse>{currentValue}</Text>
        <Text inverse color="bgMagenta"> </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          {placeholders.map((p, i) => (
            <Text key={p} color={i === currentIndex ? 'green' : 'gray'}>
              {i > 0 && ' > '}
              {p}
            </Text>
          ))}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Ctrl+L to cancel</Text>
      </Box>
    </Box>
  );
}