import { Box, Text, useApp } from 'ink';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Command } from '../types/command.js';
import type { Config } from '../types/config.js';
import { emitCommand } from '../utils/commandOutput.js';
import {
  getDefaultConfigPath,
  getRecentWithCommands,
  loadConfig,
  mutateConfig,
  saveRecent,
} from '../utils/config.js';
import {
  addCommand,
  duplicateCommand,
  removeCommand,
  toggleFavorite as toggleFavoriteInConfig,
  updateCommand,
} from '../utils/configMutations.js';
import { extractPlaceholders, fillTemplate } from '../utils/templates.js';
import { CommandMenu } from './CommandMenu.js';

const AddCommandForm = lazy(() => import('./AddCommandForm.js').then(module => ({ default: module.AddCommandForm })));
const CommandSearch = lazy(() => import('./CommandSearch.js').then(module => ({ default: module.CommandSearch })));
const DeleteConfirmation = lazy(() => import('./DeleteConfirmation.js').then(module => ({ default: module.DeleteConfirmation })));
const EditCommandForm = lazy(() => import('./EditCommandForm.js').then(module => ({ default: module.EditCommandForm })));
const TemplatePrompt = lazy(() => import('./TemplatePrompt.js').then(module => ({ default: module.TemplatePrompt })));

type AppMode = 'menu' | 'search' | 'template' | 'add' | 'edit_command';

interface AppState {
  mode: AppMode;
  commands: Command[];
  recentCommands: Command[];
  commandTimestamps: Map<number, number>;
  favorites: number[];
  selectedCommand: Command | null;
  editingCommand: Command | null;
  showDeleteConfirm: boolean;
  deleteCommand: Command | null;
}

function actionError(action: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return `Failed to ${action}: ${message}`;
}

async function persistMutation(mutator: (config: Config) => Config): Promise<Config> {
  const updatedConfig = await mutateConfig(mutator);

  if (!updatedConfig) {
    throw new Error('the config file could not be loaded');
  }

  return updatedConfig;
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
  const commandSelected = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const config = await loadConfig();

        if (cancelled) {
          return;
        }

        if (config === null) {
          const configPath = getDefaultConfigPath();
          setError(`Failed to load config file. The file at "${configPath}" appears to be corrupted or invalid.

You can fix this by:
1. Opening the file and correcting the syntax
2. Deleting the file to regenerate it with defaults`);
          setLoading(false);
          return;
        }

        const recentData = getRecentWithCommands(config);

        setState({
          mode: 'menu',
          commands: config.commands,
          recentCommands: recentData.commands,
          commandTimestamps: new Map(recentData.timestamps.map(entry => [entry.id, entry.timestamp])),
          favorites: config.favorites,
          selectedCommand: null,
          editingCommand: null,
          showDeleteConfirm: false,
          deleteCommand: null,
        });
        setLoading(false);
      } catch (initError) {
        if (!cancelled) {
          setError(initError instanceof Error ? initError.message : 'Failed to load config');
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
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

    if (commandSelected.current) {
      return;
    }

    commandSelected.current = true;

    try {
      await saveRecent(command);
    } catch {
      // Recency tracking is best-effort; running the command is more important.
    }

    try {
      emitCommand(command.command);
    } finally {
      exit();
    }
  };

  const handleTemplateSubmit = async (values: Record<string, string>) => {
    const command = state.selectedCommand;

    if (!command || commandSelected.current) {
      return;
    }

    commandSelected.current = true;

    try {
      await saveRecent(command);
    } catch {
      // Recency tracking is best-effort; running the command is more important.
    }

    try {
      emitCommand(fillTemplate(command.command, values));
    } finally {
      exit();
    }
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

  const handleToggleFavorite = async (commandId: number) => {
    try {
      const updatedConfig = await persistMutation(config => toggleFavoriteInConfig(config, commandId));
      setState(prev => ({ ...prev, favorites: updatedConfig.favorites }));
    } catch (favoriteError) {
      setError(actionError('update favorites', favoriteError));
    }
  };

  const handleAddCommand = async (command: Command) => {
    try {
      const updatedConfig = await persistMutation(config => addCommand(config, command));
      setState(prev => ({
        ...prev,
        mode: 'menu',
        commands: updatedConfig.commands,
      }));
    } catch (addError) {
      setError(actionError('add the command', addError));
    }
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

  const handleDuplicateCommand = async (command: Command) => {
    try {
      const updatedConfig = await persistMutation(config => duplicateCommand(config, command));
      setState(prev => ({
        ...prev,
        commands: updatedConfig.commands,
      }));
    } catch (duplicateError) {
      setError(actionError('duplicate the command', duplicateError));
    }
  };

  const handleEditSubmit = async (updatedCommand: Command) => {
    try {
      const updatedConfig = await persistMutation(config => updateCommand(config, updatedCommand));
      setState(prev => ({
        ...prev,
        mode: 'menu',
        commands: updatedConfig.commands,
        editingCommand: null,
        recentCommands: prev.recentCommands.map(command => (
          command.id === updatedCommand.id ? updatedCommand : command
        )),
      }));
    } catch (editError) {
      setError(actionError('save the command', editError));
    }
  };

  const handleCommandEditCancel = () => {
    setState(prev => ({ ...prev, mode: 'menu', editingCommand: null }));
  };

  const handleShowDeleteConfirm = (commandId: number) => {
    const command = state.commands.find(existing => existing.id === commandId);

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

  const handleDeleteCommand = async (commandId: number) => {
    try {
      const updatedConfig = await persistMutation(config => removeCommand(config, commandId));

      setState(prev => {
        const commandTimestamps = new Map(prev.commandTimestamps);
        commandTimestamps.delete(commandId);

        return {
          ...prev,
          mode: 'menu',
          showDeleteConfirm: false,
          deleteCommand: null,
          commands: updatedConfig.commands,
          favorites: updatedConfig.favorites,
          recentCommands: prev.recentCommands.filter(command => command.id !== commandId),
          commandTimestamps,
        };
      });
    } catch (deleteError) {
      setError(actionError('delete the command', deleteError));
    }
  };

  const loadingFallback = <Box><Text>Loading...</Text></Box>;

  if (loading) {
    return <Box><Text>Loading...</Text></Box>;
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">{error}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press Ctrl+C to quit.</Text>
        </Box>
      </Box>
    );
  }

  if (state.mode === 'template' && state.selectedCommand) {
    const placeholders = extractPlaceholders(state.selectedCommand.command);

    return (
      <Suspense fallback={loadingFallback}>
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
      <Suspense fallback={loadingFallback}>
        <CommandSearch
          allCommands={state.commands}
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
      <Suspense fallback={loadingFallback}>
        <AddCommandForm
          existingCommands={state.commands}
          onSubmit={handleAddCommand}
          onCancel={handleAddCancel}
        />
      </Suspense>
    );
  }

  if (state.mode === 'edit_command' && state.editingCommand) {
    return (
      <Suspense fallback={loadingFallback}>
        <EditCommandForm
          command={state.editingCommand}
          existingCommands={state.commands}
          onSubmit={handleEditSubmit}
          onCancel={handleCommandEditCancel}
        />
      </Suspense>
    );
  }

  if (state.showDeleteConfirm && state.deleteCommand) {
    const commandToDelete = state.deleteCommand;

    return (
      <Suspense fallback={loadingFallback}>
        <DeleteConfirmation
          key="delete-confirmation"
          command={commandToDelete}
          onConfirm={() => handleDeleteCommand(commandToDelete.id)}
          onCancel={handleHideDeleteConfirm}
        />
      </Suspense>
    );
  }

  return (
    <CommandMenu
      commands={state.commands}
      commandTimestamps={state.commandTimestamps}
      favorites={state.favorites}
      onSelect={handleSelectCommand}
      onSwitchToSearch={handleSwitchToSearch}
      onToggleFavorite={handleToggleFavorite}
      onAdd={() => setState(prev => ({ ...prev, mode: 'add' }))}
      onDelete={handleShowDeleteConfirm}
      onEdit={handleEditCommand}
      onDuplicate={handleDuplicateCommand}
    />
  );
}

export default App;
