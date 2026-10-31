# AGENTS.md

This file provides coding conventions and development guidelines for agentic coding agents working on this repository.

## Project Overview

qpq is a terminal command launcher. The primary runtime is native Go + Bubble Tea in `go/`. A TypeScript/Ink implementation in `src/` remains as the fallback path in the npm wrapper.

## Build & Development Commands

This project uses **pnpm** as the package manager.

```bash
pnpm install          # Install dependencies
pnpm run dev          # Dev mode (auto-reload with tsx)
pnpm run build        # Build for production
pnpm run type-check   # TypeScript check
pnpm run test         # Run tests in watch mode
pnpm run test:run     # Run tests once
pnpm start            # Run built app

cd go
make check            # Go tests + vet
make build            # Native binary at go/qpq
make cross            # Native release binaries
```

`pnpm run dev` and `pnpm start` render the TUI only. Selected commands are printed but not executed; use `./qpq.sh` after a build to test the shell integration.

**Hooks:**
The husky pre-commit hook runs `type-check` and `test:run`. The pre-push hook runs `type-check`, `test:run`, and `build`.

**Build Output:**
- Built files are output to `dist/` directory
- The repo-root `qpq.sh` wrapper resolves `dist/index.js`, evaluates the selected command, and propagates its exit status

## Code Style Guidelines

### File Structure & Naming

```
go/                 # Primary native implementation
src/
├── components/     # Node fallback React components
├── utils/          # Node fallback utilities
├── types/          # TypeScript types
└── test/           # Wrapper/postinstall/component tests
```

**Conventions:**
- Components: PascalCase (e.g., `CommandItem.tsx`)
- Utility files: camelCase with descriptive names (e.g., `configMutations.ts`)
- Type files: camelCase (e.g., `command.ts`)
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
- **Windows**: `%LocalAppData%\qpq\config.json`
- **macOS**: `~/Library/Application Support/qpq/config.json`
- **Linux/Unix**: `~/.local/state/qpq/config.json`

The config module is cross-platform. The `qpq.sh` launcher is POSIX-only (Linux/macOS).

## State Management

- Use React's `useState` for local component state
- Use `useEffect` for side effects and initialization
- Use `useInput` from Ink for keyboard handling
- For lists that can reorder (for example when toggling favorites), anchor selection to `command.id` instead of an array index
- Guard single-letter shortcuts with `!key.ctrl`; Ink reports Ctrl+D as `input === 'd'` with `ctrl: true`

```typescript
const [selectedId, setSelectedId] = useState<number | null>(null);
const selectedIndex = getSelectedIndex(allCommands, selectedId);

useInput((input, key) => {
  if (key.ctrl && input === 'c') {
    exit();
    return;
  }

  if (key.return && allCommands.length > 0) {
    onSelect(allCommands[selectedIndex]);
  }
});
```

## File Operations

- Use `fs.promises` for async filesystem operations
- Handle access errors with `fs.promises.access()` checks
- Provide clear error messages with file paths
- Write config files atomically (write a temporary file, then rename it)

```typescript
async function writeConfigFile(configPath: string, config: Config): Promise<void> {
  const temporaryPath = `${configPath}.${process.pid}.tmp`;
  try {
    await fs.promises.writeFile(temporaryPath, JSON.stringify(config, null, 2), 'utf-8');
    await fs.promises.rename(temporaryPath, configPath);
  } catch (error) {
    await fs.promises.rm(temporaryPath, { force: true }).catch(() => {});
    throw new Error(`Failed to write config file at ${configPath}: ${String(error)}`);
  }
}
```

## Project-Specific Notes

### Config Locations

- Linux: `~/.local/state/qpq/config.json`
- macOS: `~/Library/Application Support/qpq/config.json`
- Windows: `%LocalAppData%\qpq\config.json`

### Config Persistence

Commands use stable numeric `id` values as their identity. Favorites and recent history reference those IDs, so mutations must preserve them:

- Add/duplicate: append a command and advance `nextId`; leave `favorites` and `recent` untouched.
- Edit: replace the command with the same ID; leave `favorites` and `recent` untouched.
- Delete: remove the command ID from `commands`, `favorites`, and `recent` in one save.
- Recent history: `saveRecent` moves an ID to the front without reordering the rest.

Use `mutateConfig` or the pure helpers in `src/utils/configMutations.ts`; avoid loading and saving the config separately in a UI handler.

### Data Files

- **Config file:** JSON with `commands`, `favorites`, `recent`, and `nextId`
- **Sample file:** `src/utils/sample-commands.ts` - provides default commands (bundled at build time)

**Sample command format:**
```json
{
  "commands": [
    {
      "id": 1,
      "name": "Git Status",
      "command": "git status",
      "description": "Show git status",
      "tags": ["git"]
    }
  ],
  "favorites": [],
  "recent": [],
  "nextId": 2
}
```

### Key Dependencies

- `bubbletea` v1 - Go TUI runtime (primary)
- `lipgloss` - Go terminal styling
- `ink` v6 + `react` v19 - Node fallback TUI
- `ink-text-input` - Node fallback text input
- `ink-scroll-list` - Node fallback command lists

### Application Modes

- `menu` - Main command menu
- `search` - Search mode (substring search)
- `template` - Template variable prompting
- `add` - Add new command form
- `edit_command` - Edit existing command form

Delete confirmation is an overlay controlled by `showDeleteConfirm` / `deleteCommand` rather than a separate mode.

### Shell Integration

`qpq.sh` captures app stderr, receives the selected command through `QPQ_COMMAND_FILE` (falling back to the `__QEXEC__` stderr marker), evaluates it, and exits with the command's status. It resolves npm symlinks without relying on GNU `readlink -f`.

History for the Add Command screen is read from the detected shell's history file, with a `history` subprocess fallback. Commands from the current session may not appear until the shell flushes its history file.

## Testing

- Put pure logic and key-routing tests in `src/utils/*.test.ts`.
- Key routing lives in `src/utils/inputActions.ts`; `getMenuAction`, `getSearchAction`, etc. are pure and should be tested there rather than only through components.
- Targeted component tests use the fake stdin/stdout harness in `src/test/ink.ts`. Assert visible text fragments and callback calls, not full ANSI snapshots.
- Use `pnpm run test:run` in hooks and CI; `pnpm run test` is watch mode.
- Keep a few PTY smoke tests for things the component harness cannot cover: fullscreen behavior, scrolling, and real command execution through `qpq.sh`.

---

This document provides a concise overview of the coding conventions for this project. Always maintain consistency with the existing codebase.
