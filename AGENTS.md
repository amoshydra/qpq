# AGENTS.md

This file provides coding conventions and development guidelines for agentic coding agents working on this repository.

## Project Overview

qpq is a TypeScript terminal UI application built with React and Ink. It provides a menu-based launcher for frequently used commands, featuring favorites, recent commands, search, and edit modes.

## Build & Development Commands

This project uses **pnpm** as the package manager.

```bash
pnpm install          # Install dependencies
pnpm run dev          # Dev mode (auto-reload with tsx)
pnpm run build        # Build for production
pnpm run type-check   # TypeScript check
pnpm start            # Run built app
pnpm run build:wrapper  # Build wrapper script only
```

**Build Output:**
- Built files are output to `dist/` directory
- Wrapper script at `dist/qpq.sh` for shell integration

## Code Style Guidelines

### File Structure & Naming

```
src/
├── components/     # React components (PascalCase: CommandMenu.tsx)
├── utils/          # Utility functions (camelCase: loadConfig.ts)
├── types/          # TypeScript types (Config.ts)
└── data/           # Static data (YAML sample configs)
```

**Conventions:**
- Components: PascalCase (e.g., `CommandItem.tsx`)
- Utility files: camelCase with descriptive names (e.g., `loadFavorites.ts`)
- Type files: PascalCase (e.g., `Command.ts`)
- Test files: Same name as source with `.test` suffix (e.g., `config.test.ts`)

### Import Style

- **All imports must use `.js` extensions** (Node.js ESM requirement)
- Group imports: external libraries first, then local modules
- Use named exports > default exports
- Use type-only imports for TypeScript types

```typescript
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Command } from '../types/command.js';
import { loadConfig } from '../utils/config.js';
```

### TypeScript Patterns

- Use `type` for simple type aliases
- Use `interface` for object shapes when using implements/extends
- Explicitly annotate function parameters and return types

```typescript
export type Command = {
  name: string;
  command: string;
  description?: string;
  tags?: string[];
};
```

### React Component Patterns

- Functional components with hooks (no class components)
- Props interfaces above the component definition
- Destructure props in the function signature with type annotations

```typescript
interface CommandItemProps {
  command: Command;
  isSelected: boolean;
  index: number;
  isFavorite?: boolean;
}

export function CommandItem({ command, isSelected, index, isFavorite = false }: CommandItemProps) {
  // Component implementation
}
```

### Formatting

- **2 spaces** for indentation
- Maximum line length: ~100 characters
- Opening brace on the same line for functions/objects

```typescript
function foo() {
  return x + 1;
}

const bar = (x: number) => x + 1;
```

### Error Handling Patterns

- Use try-catch blocks with descriptive error messages
- Check access and handle permission errors for filesystem operations
- Provide context in error messages (file paths, operation type)

```typescript
async function ensureConfigDir(): Promise<void> {
  const configDir = getConfigDir();
  try {
    await fs.promises.access(configDir);
  } catch {
    await fs.promises.mkdir(configDir, { recursive: true });
  }
}
```

### Platform-Specific Considerations

- Use `path.join()` for file path construction
- Use `os.platform()` for platform detection

```typescript
function getConfigDir(): string {
  const platform = os.platform();
  const homeDir = os.homedir();

  switch (platform) {
    case 'win32':
      return path.join(homeDir, 'AppData', 'Local', 'qpq');
    case 'darwin':
      return path.join(homeDir, 'Library', 'Application Support', 'qpq');
    default:
      return path.join(homeDir, '.local', 'state', 'qpq');
  }
}
```

**Config Paths by Platform:**
- **Windows**: `%LocalAppData%\qpq\fav.yaml`
- **macOS**: `~/Library/Application Support/qpq/fav.yaml`
- **Linux/Unix**: `~/.local/state/qpq/fav.yaml`

## State Management

- Use React's `useState` for local component state
- Use `useEffect` for side effects and initialization
- Use `useInput` from Ink for keyboard handling

```typescript
const [selectedIndex, setSelectedIndex] = useState(0);

useInput((input, key) => {
  if (key.ctrl && input === 'c') {
    exit();
    return;
  }

  if (key.return) {
    if (allCommands.length > 0) {
      onSelect(allCommands[selectedIndex]);
    }
    return;
  }
});
```

## File Operations

- Use `fs.promises` for async filesystem operations
- Handle access errors with `fs.promises.access()` checks
- Provide clear error messages with file paths

```typescript
async function initConfigFile(configPath: string): Promise<void> {
  const samplePath = path.join(process.cwd(), 'src', 'data', 'sample-commands.yaml');
  try {
    await fs.promises.copyFile(samplePath, configPath);
  } catch (error) {
    throw new Error(`Failed to initialize config file: ${String(error)}`);
  }
}
```

## Project-Specific Notes

### Config Locations

- Linux: `~/.local/state/qpq/fav.yaml`
- macOS: `~/Library/Application Support/qpq/fav.yaml`
- Windows: `%LocalAppData%\qpq\fav.yaml`

### Data Files

- **Config file:** YAML format with `commands` array root
- **Sample file:** `src/data/sample-commands.yaml` - provides default commands

**Sample command format:**
```yaml
commands:
  - name: "Git Status"
    command: "git status"
    description: "Show git status"
    tags: [git]
```

### Key Dependencies

- `ink` v6 - React for terminal UIs
- `react` v19 - UI library
- `fuse.js` - Fuzzy search implementation
- `js-yaml` - YAML parsing
- `ink-text-input` - Text input handling

### Application Modes

- `menu` - Main command menu
- `search` - Search mode (fuzzy search)
- `template` - Template variable prompting
- `add` - Add new command form
- `delete` - Delete command confirmation
- `edit_command` - Edit existing command form

### Shell Integration

The `qpq.sh` wrapper script captures shell history from environment variable.

**Important:** Commands from the current session won't appear if running `node dist/index.js` directly.

---

This document provides a concise overview of the coding conventions for this project. Always maintain consistency with the existing codebase.
