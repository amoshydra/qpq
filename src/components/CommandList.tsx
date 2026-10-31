import { Box, useStdout } from 'ink';
import { ScrollList, type ScrollListRef } from 'ink-scroll-list';
import { useEffect, useRef, useState } from 'react';
import type { Command } from '../types/command.js';
import { CommandItem } from './CommandItem.js';

interface CommandListProps {
  commands: Command[];
  selectedIndex: number;
  favorites: number[];
}

const MIN_VISIBLE_ROWS = 5;
const CHROME_ROWS = 8;

export function CommandList({ commands, selectedIndex, favorites }: CommandListProps) {
  const { stdout } = useStdout();
  const [terminalRows, setTerminalRows] = useState(() => stdout.rows ?? 24);
  const listRef = useRef<ScrollListRef>(null);

  useEffect(() => {
    const handleResize = () => {
      setTerminalRows(stdout.rows ?? 24);
    };

    stdout.on('resize', handleResize);
    return () => {
      stdout.off('resize', handleResize);
    };
  }, [stdout]);

  useEffect(() => {
    listRef.current?.remeasure();
  }, [terminalRows]);

  const height = Math.max(MIN_VISIBLE_ROWS, terminalRows - CHROME_ROWS);

  return (
    <Box height={height} flexDirection="column">
      <ScrollList ref={listRef} selectedIndex={selectedIndex}>
        {commands.map((command, index) => (
          <CommandItem
            key={command.id}
            command={command}
            isSelected={index === selectedIndex}
            index={index}
            isFavorite={favorites.includes(command.id)}
          />
        ))}
      </ScrollList>
    </Box>
  );
}
