import React from 'react';
import { Box, Text } from 'ink';
import type { Command as CommandT } from '../types/command.js';

interface CommandItemProps {
  command: CommandT;
  isSelected: boolean;
  index: number;
  isFavorite?: boolean;
}

export function CommandItem({ command, isSelected, index, isFavorite = false }: CommandItemProps) {
  return (
    <Box>
      <Box width={4}>
        <Text color={isSelected ? 'green' : 'gray'}>{index + 1}.</Text>
      </Box>
      <Box width={30}>
        <Text inverse={isSelected} color={isSelected ? 'green' : undefined}>
          {command.name}
        </Text>
      </Box>
      {isFavorite && (
        <Box marginLeft={1}>
          <Text color="yellow">⭐</Text>
        </Box>
      )}
      <Box>
        <Text dimColor>{command.description || ''}</Text>
      </Box>
    </Box>
  );
}