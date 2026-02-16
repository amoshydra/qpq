import { Box, Text, useApp } from 'ink';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import type { Command } from '../types/command.js';
import { loadConfig, saveConfig } from '../utils/config.js';
import { isFavorite as isFavoriteUtil, loadFavorites, saveFavorites, toggleFavorite as toggleFavoriteUtil } from '../utils/favorites.js';
import { clearRecent, loadRecentWithCommands, saveRecent } from '../utils/recent.js';
import { extractPlaceholders, fillTemplate } from '../utils/templates.js';
import { CommandMenu } from './CommandMenu.js';

const AddCommandForm = lazy(() => import('./AddCommandForm.js').then(m => ({ default: m.AddCommandForm })));
const CommandSearch = lazy(() => import('./CommandSearch.js').then(m => ({ default: m.CommandSearch })));
const DeleteConfirmation = lazy(() => import('./DeleteConfirmation.js').then(m => ({ default: m.DeleteConfirmation })));
const EditCommandForm = lazy(() => import('./EditCommandForm.js').then(m => ({ default: m.EditCommandForm })));
const TemplatePrompt = lazy(() => import('./TemplatePrompt.js').then(m => ({ default: m.TemplatePrompt })));

type AppMode = 'menu' | 'search' | 'template' | 'add' | 'edit_command';

interface AppState {
  mode: AppMode;
  commands: Command[] | null;
  recentCommands: Command[];
  commandTimestamps: Map<string, number>;
  favorites: string[];
  selectedCommand: Command | null;
  editingCommand: Command | null;
  showDeleteConfirm: boolean;
  deleteCommand: Command | null;
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
    editingCommand: null,
    showDeleteConfirm: false,
    deleteCommand: null,
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshConfig = async () => {
    const config = await loadConfig();
    if (config) {
      const [recentData, favs] = await Promise.all([
        loadRecentWithCommands(config.commands),
        loadFavorites()
      ]);
      const timestampMap = new Map<string, number>(recentData.timestamps.map(t => [t.name, t.timestamp]));
      setState(prev => ({
        ...prev,
        commands: config.commands,
        recentCommands: recentData.commands,
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

        const [recentData, favs] = await Promise.all([
          loadRecentWithCommands(config.commands),
          loadFavorites()
        ]);

        const timestampMap = new Map<string, number>(recentData.timestamps.map(t => [t.name, t.timestamp]));

        setState({
          mode: 'menu',
          commands: config.commands,
          recentCommands: recentData.commands,
          commandTimestamps: timestampMap,
          favorites: favs,
          selectedCommand: null,
          editingCommand: null,
          showDeleteConfirm: false,
          deleteCommand: null,
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
    process.stderr.write(`__QEXEC__ ${command.command}\n`);
    exit();
  };

  const handleTemplateSubmit = async (values: Record<string, string>) => {
    if (!state.selectedCommand) {
      exit();
      return;
    }

    await saveRecent(state.selectedCommand);
    const filledCommand = fillTemplate(state.selectedCommand.command, values);
    process.stderr.write(`__QEXEC__ ${filledCommand}\n`);
    exit();
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
    setState(prev => ({ ...prev, mode: 'menu' }));
  };

  const handleEditCommand = (command: Command) => {
    setState(prev => ({
      ...prev,
      mode: 'edit_command',
      editingCommand: command,
    }));
  };

  const handleEditSubmit = async (updatedCommand: Command) => {
    if (!state.commands || !state.editingCommand) return;

    const originalName = state.editingCommand.name;
    const nameChanged = updatedCommand.name !== originalName;
    const wasFavorite = isFavoriteUtil(originalName, state.favorites);

    const newCommands = state.commands.filter(c => c.name !== originalName);
    const newConfig = { commands: [...newCommands, updatedCommand] };

    await saveConfig(newConfig);

    if (nameChanged) {
      if (wasFavorite) {
        const newFavorites = state.favorites
          .filter(f => f !== originalName)
          .concat(updatedCommand.name);
        await saveFavorites(newFavorites);
      }

      const recent = state.recentCommands.filter(c => c.name !== originalName);
      await clearRecent();
      for (const cmd of recent) {
        await saveRecent(cmd);
      }
    }

    setState(prev => ({
      ...prev,
      mode: 'menu',
      commands: newConfig.commands,
      favorites: nameChanged && wasFavorite ? state.favorites.filter(f => f !== originalName).concat(updatedCommand.name) : prev.favorites,
      editingCommand: null,
    }));
  };

  const handleDeleteCommand = async (commandName: string) => {
    if (!state.commands) return;

    try {
      const newCommands = state.commands.filter(c => c.name !== commandName);
      const newConfig = { commands: newCommands };

      await saveConfig(newConfig);

      const newFavorites = state.favorites.filter(f => f !== commandName);
      await saveFavorites(newFavorites);

      const recent = state.recentCommands.filter(c => c.name !== commandName);

      const newTimestamps = new Map(state.commandTimestamps);
      newTimestamps.delete(commandName);

      await clearRecent();
      for (const cmd of recent) {
        await saveRecent(cmd);
      }

      setState(prev => ({
        ...prev,
        mode: 'menu',
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

  const handleCommandEditCancel = () => {
    setState(prev => ({ ...prev, mode: 'menu', editingCommand: null }));
  };

  const handleShowDeleteConfirm = (commandName: string) => {
    const command = state.commands?.find(cmd => cmd.name === commandName) ?? null;
    if (command) {
      setState(prev => ({
        ...prev,
        showDeleteConfirm: true,
        deleteCommand: command,
      }));
    }
  };

  const handleHideDeleteConfirm = () => {
    setState(prev => ({
      ...prev,
      showDeleteConfirm: false,
      deleteCommand: null,
    }));
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
      <Suspense fallback={<Box><Text>Loading...</Text></Box>}>
        <TemplatePrompt
          placeholders={placeholders}
          onSubmit={handleTemplateSubmit}
          onCancel={handleTemplateCancel}
        />
      </Suspense>
    );
  }

  if (state.mode === 'search') {
    return (
      <Suspense fallback={<Box><Text>Loading...</Text></Box>}>
        <CommandSearch
          allCommands={state.commands!}
          recentCommands={state.recentCommands}
          favorites={state.favorites}
          onSelect={handleSelectCommand}
          onSwitchToMenu={handleSwitchToMenu}
        />
      </Suspense>
    );
  }

  if (state.mode === 'add') {
    return (
      <Suspense fallback={<Box><Text>Loading...</Text></Box>}>
        <AddCommandForm
          existingCommands={state.commands!}
          onSubmit={handleAddCommand}
          onCancel={handleAddCancel}
        />
      </Suspense>
    );
  }

  if (state.mode === 'edit_command' && state.editingCommand) {
    return (
      <Suspense fallback={<Box><Text>Loading...</Text></Box>}>
        <EditCommandForm
          command={state.editingCommand}
          existingCommands={state.commands!}
          onSubmit={handleEditSubmit}
          onCancel={handleCommandEditCancel}
        />
      </Suspense>
    );
  }

  if (state.showDeleteConfirm && state.deleteCommand) {
    return (
      <Suspense fallback={<Box><Text>Loading...</Text></Box>}>
        <DeleteConfirmation
          key="delete-confirmation"
          command={state.deleteCommand}
          onConfirm={() => {
            handleHideDeleteConfirm();
            const commandName = state.deleteCommand?.name;
            if (commandName) {
              handleDeleteCommand(commandName);
            }
          }}
          onCancel={handleHideDeleteConfirm}
        />
      </Suspense>
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
      onAdd={() => setState(prev => ({ ...prev, mode: 'add' }))}
      onDelete={handleShowDeleteConfirm}
      onEdit={handleEditCommand}
    />
  );
}
