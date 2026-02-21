# QPQ

[![npm](https://img.shields.io/npm/v/qpq.svg)](https://www.npmjs.com/package/qpq)
[![License](https://img.shields.io/github/license/amoshydra/qpq.svg)](LICENSE)
[![GitHub](https://img.shields.io/github/stars/amoshydra/qpq.svg)](https://github.com/amoshydra/qpq)

A terminal-based command launcher for frequently used commands. Built with TypeScript, React, and Ink.

## Features

- **Menu Mode**: Command list sorted with favorites first, then by recency
- **Favorites**: Pin frequently used commands at the top (press `f` to toggle)
- **All Commands**: Sorted by recency - recently used commands appear first
- **Direct Actions**: Add, edit, or delete commands directly from the menu
- **Search Mode**: Real-time string search through all commands
- **Template Support**: Command placeholders that prompt for values
- **Platform Aware**: Works on Linux, macOS, and Windows
- **Auto-init**: Creates config directory and sample file if missing

## Installation

### Try instantly (no install)
```bash
npx qpq
```

### Global install
```bash
npm i -g qpq
qpq
```

### From source (development)
```bash
pnpm install
pnpm run build
node dist/index.js
# or
npx .
```

## Usage

### Command Line Flags

```bash
qpq --version  # Show version
qpq -v         # Show version (short form)
```

### Interactive Mode

```bash
pnpm start
# or
node dist/index.js
```

### Keyboard Controls

#### Menu Mode

| Key | Action |
|-----|--------|
| ↓↑ | Navigate commands |
| Enter / 1-9 | Select command |
| f | Toggle favorite on selected command |
| a | Add new command |
| d | Delete selected command |
| e | Edit selected command |
| / | Switch to search mode |
| Escape | Switch to search mode |
| Ctrl+C | Quit |

#### Search Mode

| Key | Action |
|-----|--------|
| Type | Search query |
| ↓↑ | Navigate results |
| Enter / 1-9 | Select command |
| Escape | Return to menu |
| Backspace | Delete character |
| Ctrl+C | Quit |

#### Add Command - History Selection

| Key | Action |
|-----|--------|
| ↓↑ | Navigate history |
| Enter | Select command from history |
| n | Skip to new command form |
| Escape | Cancel |

#### Add/Edit Command Form

| Key | Action |
|-----|--------|
| Type | Enter text in current field |
| Tab | Next field |
| Shift+Tab | Previous field |
| Enter | Submit (only on Tags field) |
| Escape | Cancel |

#### Template Prompt

| Key | Action |
|-----|--------|
| Type | Enter value for current placeholder |
| Enter | Next placeholder or submit (if last) |
| Backspace | Delete character |
| Ctrl+L | Cancel |

#### Delete Confirmation

| Key | Action |
|-----|--------|
| y / Y / Enter | Confirm deletion |
| n / N / Escape | Cancel |

### Config File

Default config locations:
- Linux: `~/.local/state/qpq/fav.yaml`
- macOS: `~/Library/Application Support/qpq/fav.yaml`
- Windows: `%LocalAppData%\qpq\fav.yaml`

### Favorites & Recent Files

The app tracks favorites and recent commands:
- Favorites: `~/.local/state/qpq/favorites.json`
- Recent: `~/.local/state/qpq/recent.json`

### Menu Display

The menu shows commands in this order:
1. **Favorites** - Pinned commands (appear first, never sorted by recency)
2. **All Commands** - All other commands sorted by when they were last used
   - Recently used commands appear first
   - Commands never used appear at the bottom alphabetically

### Adding Commands

1. Press `a` to open Add Command
2. Browse shell history (last 30 commands) and press `Enter` to select, OR
3. Press `n` to skip to the new command form
4. Fill in the form (Command is mandatory, other fields optional)
5. Use `Tab` to navigate between fields
6. Press `Enter` on the Tags field to submit

### Editing Commands

1. Select a command in the menu
2. Press `e` to open Edit Command form
3. Modify the fields as needed
4. Use `Tab` to navigate between fields
5. Press `Enter` on the Tags field to submit

**Note**: If you change the command name, favorites and recent usage are automatically updated.

### Deleting Commands

1. Select a command in the menu
2. Press `d` to show delete confirmation
3. Press `y` or `Enter` to confirm deletion
4. Removes from config, favorites, and recent history

## Command Format

```yaml
commands:
  - name: "Git Push"
    command: "git push origin {branch}"
    description: "Push to remote branch"
    tags: [git]
```

### Templates

Use `{placeholder}` syntax for dynamic values:
```yaml
- name: "Git Push"
  command: "git push origin {branch}"
```

When you select a command with placeholders, you'll be prompted to enter each value. Use `Ctrl+L` to cancel.

## Development

```bash
pnpm run dev      # Run with tsx (auto-reload)
pnpm run build    # Compile to dist/
pnpm run type-check  # TypeScript checks
```

## FAQ

### Why qpq.sh wrapper?

`qpq.sh` captures your shell's **in-memory history** before launching. Without it, only previously saved history (on disk) is visible.

The wrapper ensures you see commands you just typed, working across all shell configurations.

### Shell built changes

When a command is executed via the wrapper, it runs in a subprocess. This means:

- **Shell built-in commands** like `cd`, `export`, `alias` will work
- **Environment changes won't persist** after the command exits - you'll return to the original directory and environment

**Workaround**: If you need to change directory or set environment variables, append `$SHELL` to keep a new shell open:

```yaml
# Instead of:
- name: "Go to project"
  command: "cd /path/to/project"

# Use:
- name: "Go to project"
  command: "cd /path/to/project; $SHELL"
```

This opens a new interactive shell in the target directory. Exit the shell to return to your original session.

### How does history capture work?

Tries three methods (in order):
1. **Environment variable** - from wrapper script (fastest, has current session)
2. **History files** - reads `.bash_history`, `.zsh_history` from disk
3. **Subprocess** - spawns shell to run `history` built-in

If your shell has `INC_APPEND_HISTORY` enabled (many zsh configs), running `node dist/index.js` directly also works.

## Error Handling

If config file is corrupted, the app will show:
1. Full error message
2. File location
3. Instructions to fix manually

The app never modifies existing config files - only creates them if missing.
