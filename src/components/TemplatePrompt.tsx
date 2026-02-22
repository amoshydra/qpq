import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';

interface TemplatePromptProps {
  placeholders: string[];
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
}

export function TemplatePrompt({ placeholders, onSubmit, onCancel }: TemplatePromptProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [values, setValues] = useState<string[]>(new Array(placeholders.length).fill(''));

  useInput((_, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      setCurrentIndex(prev => (prev > 0 ? prev - 1 : placeholders.length - 1));
      return;
    }

    if (key.downArrow) {
      setCurrentIndex(prev => (prev < placeholders.length - 1 ? prev + 1 : 0));
      return;
    }

    if (key.return) {
      if (currentIndex < placeholders.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        const result: Record<string, string> = {};
        placeholders.forEach((p, i) => {
          result[p] = values[i];
        });
        onSubmit(result);
      }
      return;
    }
  });

  function handleChange(value: string) {
    setValues(prev => {
      const newValues = [...prev];
      newValues[currentIndex] = value;
      return newValues;
    });
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>Template Variables</Text>
      </Box>

      {placeholders.map((placeholder, index) => (
        <Box key={placeholder}>
          <Text color={index === currentIndex ? 'green' : 'gray'}>{placeholder}: </Text>
          <TextInput
            value={values[index]}
            onChange={handleChange}
            focus={index === currentIndex}
          />
        </Box>
      ))}

      <Box marginTop={1}>
        <Text dimColor>↑/↓ to navigate | Escape to cancel | Enter on last field to submit</Text>
      </Box>
    </Box>
  );
}
