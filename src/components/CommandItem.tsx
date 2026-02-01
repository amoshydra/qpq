import { Box, Text } from 'ink';
import type { Command as CommandT } from '../types/command.js';

interface CommandItemProps {
  command: CommandT;
  isSelected: boolean;
  index: number;
  isFavorite?: boolean;
}

export function CommandItem({ command, isSelected, index, isFavorite = false }: CommandItemProps) {
  const color = isFavorite ? 'yellow' : isSelected ? 'green' : undefined;
  return (
    <Box>
      <Box width={4}>
        <Text color={color}>{index + 1}.</Text>
      </Box>
      <Box width={30}>
        <Text inverse={isSelected} color={color}>
          {command.name}
        </Text>
      </Box>
      <Box>
        <Text dimColor>{command.description || ''}</Text>
      </Box>
    </Box>
  );
}