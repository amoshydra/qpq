import { Box, Text, useApp } from 'ink';
import { lazy, Suspense, useEffect, useState } from 'react';
import type { Command } from '../types/command.js';
import { clearRecent, loadConfig, loadFavorites, loadRecentWithCommands, saveConfig, saveFavorites, saveRecent, toggleFavorite as toggleFavoriteUtil } from '../utils/config.js';
import { extractPlaceholders, fillTemplate } from '../utils/templates.js';
import { startPreloading, preloadUrgent } from '../utils/preload.js';
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
  commandTimestamps: Map<number, number>;
  favorites: number[];
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
      const timestampMap = new Map<number, number>(recentData.timestamps.map(t => [t.id, t.timestamp]));
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
          setError(`Failed to load config file. The file at "${configPath}" appears to be corrupted or invalid.

You can fix this by:
1. Opening the file and correcting the syntax
2. Deleting the file to regenerate it with defaults`);
          setLoading(false);
          return;
        }

        const [recentData, favs] = await Promise.all([
          loadRecentWithCommands(config.commands),
          loadFavorites()
        ]);

        const timestampMap = new Map<number, number>(recentData.timestamps.map(t => [t.id, t.timestamp]));

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

        const hasTemplates = config.commands.some(cmd =>
          extractPlaceholders(cmd.command).length > 0
        );
        startPreloading(hasTemplates);

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
      preloadUrgent('TemplatePrompt');
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
    preloadUrgent('CommandSearch');
    setState(prev => ({ ...prev, mode: 'search' }));
  };

  const handleSwitchToMenu = () => {
    setState(prev => ({ ...prev, mode: 'menu' }));
  };

  const handleTemplateCancel = () => {
    setState(prev => ({ ...prev, mode: 'menu' }));
  };

  const handleToggleFavorite = async (commandId: number) => {
    const updatedFavs = await toggleFavoriteUtil(commandId);
    setState(prev => ({ ...prev, favorites: updatedFavs }));
  };

  const handleAddCommand = async (command: Command) => {
    if (!state.commands) return;

    const config = await loadConfig();
    const nextId = config?.nextId || 1;
    const newCommand = { ...command, id: nextId };
    const newCommands = [...state.commands, newCommand];
    const newConfig = { commands: newCommands, favorites: state.favorites, recent: [], nextId: nextId + 1 };

    await saveConfig(newConfig);
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
    preloadUrgent('EditCommandForm');
    setState(prev => ({
      ...prev,
      mode: 'edit_command',
      editingCommand: command,
    }));
  };

  const handleEditSubmit = async (updatedCommand: Command) => {
    if (!state.commands || !state.editingCommand) return;

    const originalId = state.editingCommand.id;
    const newCommands = state.commands.map(c => c.id === originalId ? updatedCommand : c);
    const config = await loadConfig();
    const newConfig = { commands: newCommands, favorites: state.favorites, recent: state.recentCommands.map(c => ({ id: c.id, timestamp: Date.now() })), nextId: config?.nextId || 1 };

    await saveConfig(newConfig);

    setState(prev => ({
      ...prev,
      mode: 'menu',
      commands: newConfig.commands,
      editingCommand: null,
    }));
  };

  const handleDeleteCommand = async (commandId: number) => {
    if (!state.commands) return;

    try {
      const newCommands = state.commands.filter(c => c.id !== commandId);
      const config = await loadConfig();
      const newConfig = { commands: newCommands, favorites: state.favorites, recent: [], nextId: config?.nextId || 1 };

      await saveConfig(newConfig);

      const newFavorites = state.favorites.filter(f => f !== commandId);
      await saveFavorites(newFavorites);

      const recent = state.recentCommands.filter(c => c.id !== commandId);

      const newTimestamps = new Map(state.commandTimestamps);
      newTimestamps.delete(commandId);

      await clearRecent();
      for (const cmd of recent) {
        await saveRecent({ id: cmd.id });
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

  const handleShowDeleteConfirm = (commandId: number) => {
    const command = state.commands?.find(cmd => cmd.id === commandId) ?? null;
    if (command) {
      preloadUrgent('DeleteConfirmation');
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

  const handleSwitchToAdd = () => {
    preloadUrgent('AddCommandForm');
    setState(prev => ({ ...prev, mode: 'add' }));
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
            const commandId = state.deleteCommand?.id;
            if (commandId !== undefined) {
              handleDeleteCommand(commandId);
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
      onAdd={handleSwitchToAdd}
      onDelete={handleShowDeleteConfirm}
      onEdit={handleEditCommand}
    />
  );
}

export default App;
