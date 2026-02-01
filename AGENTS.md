# AGENTS.md

This file provides coding conventions and development guidelines for agentic coding agents working on this repository.

## Project Overview

qpq is a TypeScript terminal UI application built with React and Ink. It provides a menu-based launcher for frequently used commands, featuring favorites, recent commands, search, and edit modes.

## Build & Development Commands

This project uses **pnpm**.

```bash
pnpm install          # Install dependencies
pnpm run dev          # Dev mode (auto-reload with tsx)
pnpm run build        # Build for production
pnpm run type-check   # TypeScript check
pnpm start            # Run built app
```

**Single Tests:** No test framework configured. If adding tests, use Vitest: `pnpm test <test-file-name>`

## Code Style Guidelines

### File Structure & Naming
```
src/
├── components/     # React components (PascalCase: CommandMenu.tsx)
├── utils/          # Utility functions (camelCase: loadConfig.ts)
├── types/          # TypeScript types (Config.ts)
└── data/           # Static data (YAML sample configs)
```

### Import Style
- **All imports must use `.js` extensions** (Node.js ESM requirement)
- Group imports: external libs first, internal modules second
- Named exports > default exports
- Use type-only imports for types: `import type { Command } from '../types/command.js'`
- For naming conflicts: `import type { Command as CommandT } from '../types/command.js'`

### TypeScript Patterns
- Use `type` for aliases, `interface` for object shapes
- Annotate function parameters explicitly
- Export keywords with declarations explicitly
- Example: `export function loadConfig(customPath?: string): Promise<Config | null>`

### React Component Patterns
- Functional components with hooks (no classes)
- Props interfaces above the component, destructured in signature
- Type annotations for parameters, `?:` for optional props
- Example: `export function CommandItem({ command, isSelected, isFavorite = false }: CommandItemProps)`

### Formatting
- **2 spaces** indentation
- Max line length: ~100 chars (soft limit)
- Opening brace on same line: `function foo() {`
- One space after keywords/parentheses in arrows: `(x) => x + 1`

### State Management
- `useState` for local component state
- `useEffect` for side effects and initialization
- Functional `setState` for updates: `setState(prev => ({ ...prev, mode: 'search' }))`
- `useApp` from Ink for app-level actions like `exit()`

### Error Handling
- try-catch for async functions
- Type guard errors: `e instanceof Error ? e.message : 'Unknown error'`
- Return null/empty for non-critical failures
- Include context in error messages

### File I/O Patterns
- `fs.promises` for async operations
- `path.join()` for cross-platform paths
- Check directories: `access()` with `{ recursive: true }` for mkdir

### Platform-Specific Code
Use `os.platform()` and `os.homedir()`:

```typescript
switch (os.platform()) {
  case 'win32': return path.join(homeDir, 'AppData', 'Roaming', 'qpq');
  case 'darwin': return path.join(homeDir, 'Library', 'Application Support', 'qpq');
  default: return path.join(homeDir, '.local', 'qpq');
}
```

### JSX/Ink Patterns
- `Box` for layout containers with `flexDirection`
- `Text` for all text rendering
- Styling props: `color`, `bold`, `dimColor`, `inverse`
- Key prop for list rendering: `commands.map(cmd => <CommandItem key={cmd.name} />)`

## Project-Specific Notes

### Config Locations
- Linux: `~/.local/qpq/fav.yaml`
- macOS: `~/Library/Application Support/qpq/fav.yaml`
- Windows: `%APPDATA%\qpq\fav.yaml`

### Key Dependencies
- `ink` (v6) - React for CLIs
- `react` (v19) - UI library
- `fuse.js` - Fuzzy search
- `js-yaml` - YAML parsing

### Mode States
`menu` | `search` | `template` | `edit` | `add` | `delete` - app navigation states

### Command Execution
Uses `spawn()` with `shell: true` and `stdio: 'inherit'`

## When Making Changes
1. Run `pnpm run type-check` before committing
2. Test keyboard navigation flows
3. Verify config file handling (create, read, write)
4. Check platform-specific paths for all OSs
5. **Ensure all imports use `.js` extensions** (critical for ESM)