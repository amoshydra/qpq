import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { CommandMenu } from './CommandMenu.js';
import { CommandSearch } from './CommandSearch.js';
import { TemplatePrompt } from './TemplatePrompt.js';
import { EditMenu } from './EditMenu.js';
import { AddCommandForm } from './AddCommandForm.js';
import { DeleteCommand } from './DeleteCommand.js';
import { loadConfig, saveConfig } from '../utils/config.js';
import { executeCommand } from '../utils/executor.js';
import { extractPlaceholders, fillTemplate } from '../utils/templates.js';
import { saveRecent, loadRecent, loadRecentWithTimestamps, clearRecent } from '../utils/recent.js';
import { loadFavorites, toggleFavorite as toggleFavoriteUtil, isFavorite as isFavoriteUtil, clearFavorites } from '../utils/favorites.js';
import type { Command } from '../types/command.js';

type AppMode = 'menu' | 'search' | 'template' | 'edit' | 'add' | 'delete';

interface AppState {
  mode: AppMode;
  commands: Command[] | null;
  recentCommands: Command[];
  commandTimestamps: Map<string, number>;
  favorites: string[];
  selectedCommand: Command | null;
}

export function App() {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>(() => ({
    mode: 'menu',
    commands: [],
    recentCommands: [],
    commandTimestamps: new Map(),
    favorites: [],
    selectedCommand: null,
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshConfig = async () => {
    const config = await loadConfig();
    if (config) {
      const recent = await loadRecent(config.commands);
      const timestamps = await loadRecentWithTimestamps();
      const timestampMap = new Map(timestamps.map(t => [t.name, t.timestamp]));
      const favs = await loadFavorites();
      setState(prev => ({
        ...prev,
        commands: config.commands,
        recentCommands: recent,
        commandTimestamps: timestampMap,
        favorites: favs,
      }));
    }
  };

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
        const timestamps = await loadRecentWithTimestamps();
        const timestampMap = new Map(timestamps.map(t => [t.name, t.timestamp]));
        const favs = await loadFavorites();
        
        setState({
          mode: 'menu',
          commands: config.commands,
          recentCommands: recent,
          commandTimestamps: timestampMap,
          favorites: favs,
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

  const handleToggleFavorite = async (commandName: string) => {
    const updatedFavs = await toggleFavoriteUtil(commandName);
    setState(prev => ({ ...prev, favorites: updatedFavs }));
  };

  const handleEnterEdit = () => {
    setState(prev => ({ ...prev, mode: 'edit' }));
  };

  const handleEditCancel = () => {
    setState(prev => ({ ...prev, mode: 'menu' }));
  };

  const handleAddCommand = (command: Command) => {
    if (!state.commands) return;
    
    const newCommands = [...state.commands, command];
    const newConfig = { commands: newCommands };
    
    saveConfig(newConfig);
    setState(prev => ({
      ...prev,
      mode: 'menu',
      commands: newCommands,
      commandTimestamps: new Map(prev.commandTimestamps) 
    }));
  };

  const handleAddCancel = () => {
    setState(prev => ({ ...prev, mode: 'edit' }));
  };

  const handleDeleteCommand = async (commandName: string) => {
    if (!state.commands) return;

    try {
      const newCommands = state.commands.filter(c => c.name !== commandName);
      const newConfig = { commands: newCommands };

      await saveConfig(newConfig);

      if (isFavoriteUtil(commandName, state.favorites)) {
        await clearFavorites();
      }
      
      const newFavorites = state.favorites.filter(f => f !== commandName);
      
      const recent = state.recentCommands.filter(c => c.name !== commandName);
      
      const newTimestamps = new Map(state.commandTimestamps);
      newTimestamps.delete(commandName);
      
      await clearRecent();
      for (const cmd of recent) {
        await saveRecent(cmd);
      }

      setState(prev => ({
        ...prev,
        mode: 'delete',
        commands: newCommands,
        recentCommands: recent,
        favorites: newFavorites,
        commandTimestamps: newTimestamps
      }));
    } catch (e) {
      console.error(e);
      setError('Failed to delete command');
    }
  };

  const handleDeleteCancel = () => {
    setState(prev => ({ ...prev, mode: 'edit' }));
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

  if (state.mode === 'edit') {
    return (
      <EditMenu
        onAdd={() => setState(prev => ({ ...prev, mode: 'add' }))}
        onDelete={() => setState(prev => ({ ...prev, mode: 'delete' }))}
        onCancel={handleEditCancel}
      />
    );
  }

  if (state.mode === 'add') {
    return (
      <AddCommandForm
        existingCommands={state.commands!}
        onSubmit={handleAddCommand}
        onCancel={handleAddCancel}
      />
    );
  }

  if (state.mode === 'delete') {
    return (
      <DeleteCommand
        commands={state.commands!}
        favorites={state.favorites}
        onDelete={handleDeleteCommand}
        onCancel={handleDeleteCancel}
      />
    );
  }

  return (
    <CommandMenu
      commands={state.commands!}
      recentCommands={state.recentCommands}
      commandTimestamps={state.commandTimestamps}
      favorites={state.favorites}
      onSelect={handleSelectCommand}
      onSwitchToSearch={handleSwitchToSearch}
      onToggleFavorite={handleToggleFavorite}
      onEnterEdit={handleEnterEdit}
    />
  );
}