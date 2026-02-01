import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { CommandMenu } from './CommandMenu.js';
import { CommandSearch } from './CommandSearch.js';
import { TemplatePrompt } from './TemplatePrompt.js';
import { loadConfig } from '../utils/config.js';
import { executeCommand } from '../utils/executor.js';
import { extractPlaceholders, fillTemplate } from '../utils/templates.js';
import { saveRecent, loadRecent } from '../utils/recent.js';
import type { Command } from '../types/command.js';

type AppMode = 'menu' | 'search' | 'template';

interface AppState {
  mode: AppMode;
  commands: Command[] | null;
  recentCommands: Command[];
  selectedCommand: Command | null;
}

export function App() {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>(() => ({
    mode: 'menu',
    commands: [],
    recentCommands: [],
    selectedCommand: null,
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const config = await loadConfig();
        
        if (config === null) {
          const { getDefaultConfigPath } = await import('../utils/config.js');
          const configPath = getDefaultConfigPath();
          setError(`Failed to load config file. The file at "${configPath}" appears to be corrupted or invalid.\n\nYou can fix this by:\n1. Opening the file and correcting the syntax\n2. Deleting the file to regenerate it with defaults`);
          setLoading(false);
          return;
        }
        
        const recent = await loadRecent(config.commands);
        
        setState({
          mode: 'menu',
          commands: config.commands,
          recentCommands: recent,
          selectedCommand: null,
        });
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load config');
        setLoading(false);
      }
    }
    
    init();
  }, []);

  const handleSelectCommand = async (command: Command) => {
    const placeholders = extractPlaceholders(command.command);
    
    if (placeholders.length > 0) {
      setState(prev => ({
        ...prev,
        mode: 'template',
        selectedCommand: command,
      }));
      return;
    }

    await saveRecent(command);
    executeCommand(command.command);
  };

  const handleTemplateSubmit = async (values: Record<string, string>) => {
    if (!state.selectedCommand) {
      exit();
      return;
    }

    await saveRecent(state.selectedCommand);
    const filledCommand = fillTemplate(state.selectedCommand.command, values);
    executeCommand(filledCommand);
  };

  const handleSwitchToSearch = () => {
    setState(prev => ({ ...prev, mode: 'search' }));
  };

  const handleSwitchToMenu = () => {
    setState(prev => ({ ...prev, mode: 'menu' }));
  };

  const handleTemplateCancel = () => {
    setState(prev => ({ ...prev, mode: 'menu' }));
  };

  if (loading) {
    return <Box><Text>Loading...</Text></Box>;
  }

  if (error) {
    return <Box><Text color="red">{error}</Text></Box>;
  }

  if (state.mode === 'template' && state.selectedCommand) {
    const placeholders = extractPlaceholders(state.selectedCommand.command);
    return (
      <TemplatePrompt
        placeholders={placeholders}
        onSubmit={handleTemplateSubmit}
        onCancel={handleTemplateCancel}
      />
    );
  }

  if (state.mode === 'search') {
    return (
      <CommandSearch
        allCommands={state.commands!}
        recentCommands={state.recentCommands}
        onSelect={handleSelectCommand}
        onSwitchToMenu={handleSwitchToMenu}
      />
    );
  }

  return (
    <CommandMenu
      commands={state.commands!}
      onSelect={handleSelectCommand}
      onSwitchToSearch={handleSwitchToSearch}
    />
  );
}