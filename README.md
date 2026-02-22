# QPQ

[![npm](https://img.shields.io/npm/v/qpq.svg)](https://www.npmjs.com/package/qpq)
[![License](https://img.shields.io/github/license/amoshydra/qpq.svg)](LICENSE)
[![GitHub](https://img.shields.io/github/stars/amoshydra/qpq.svg)](https://github.com/amoshydra/qpq)

A terminal-based command launcher for frequently used commands. Built with TypeScript, React, and Ink.

<center>

![output](https://github.com/user-attachments/assets/0d3bb1a6-77f9-4cfa-ab92-45a499dc7cd2)

</center>

## Features

- **Menu Mode**: Command list sorted with favorites first, then by recency
- **Favorites**: Pin frequently used commands at the top (press `f` to toggle)
- **All Commands**: Sorted by recency - recently used commands appear first
- **Direct Actions**: Add, edit, or delete commands directly from the menu
- **Search Mode**: Real-time string search through all commands
- **Template Support**: Command placeholders that prompt for values
- **Platform Aware**: Works on Linux, macOS, and Windows
- **Auto-init**: Creates config directory and sample file if missing

| **Menu Mode** | **Add from shell** |
| :-:  | :-: |
| ![readme-001-output](https://github.com/user-attachments/assets/21d6f8c6-052f-48b4-89b3-5352f72d94ca) | ![readme-002-add](https://github.com/user-attachments/assets/372d67b9-2591-41ca-8a0b-6a9a87f55161)
| **Edit mode** | **Favorites**
| ![readme-003-edit](https://github.com/user-attachments/assets/73bb8e8a-7c40-47f2-b2bc-a29425a2d9a3) | ![readme-004-favorite](https://github.com/user-attachments/assets/18aeb419-ac7f-4c43-acde-b7b5d716f99a) |



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

## Usage

### Command Line Flags

```bash
qpq              # Launch interactive menu (default)
qpq --help       # Show help message
qpq -h           # Show help message (short form)
qpq --version    # Show version number
qpq -v           # Show version number (short form)
qpq --paths      # Show configuration paths
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
| Escape / Ctrl+C | Quit |

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
| ↑/↓ | Navigate fields |
| Enter | Next field or submit (if last) |
| Escape | Cancel |

#### Template Prompt

| Key | Action |
|-----|--------|
| Type | Enter value for current field |
| ↓↑ | Navigate between fields |
| Enter | Next field or submit (if last) |
| Escape | Cancel |

#### Delete Confirmation

| Key | Action |
|-----|--------|
| y / Y / Enter | Confirm deletion |
| n / N / Escape | Cancel |

### Config File

Default config location:
- Linux: `~/.local/state/qpq/config.json`
- macOS: `~/Library/Application Support/qpq/config.json`
- Windows: `%LocalAppData%\qpq\config.json`

The config file stores commands, favorites, and recent history in a single JSON file.

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
5. Use `↑/↓` to navigate between fields
6. Press `Enter` on the Tags field to submit

### Editing Commands

1. Select a command in the menu
2. Press `e` to open Edit Command form
3. Modify the fields as needed
4. Use `↑/↓` to navigate between fields
5. Press `Enter` on the Tags field to submit

**Note**: If you change the command name, favorites and recent usage are automatically updated.

### Deleting Commands

1. Select a command in the menu
2. Press `d` to show delete confirmation
3. Press `y` or `Enter` to confirm deletion
4. Removes from config, favorites, and recent history

## Command Format

```json
{
  "commands": [
    {
      "name": "Git Push",
      "command": "git push origin {branch}",
      "description": "Push to remote branch",
      "tags": ["git"]
    }
  ],
  "favorites": [],
  "recent": []
}
```

### Templates

Use `{placeholder}` syntax for dynamic values:
```json
{
  "name": "Git Push",
  "command": "git push origin {branch}"
}
```

When you select a command with placeholders, you'll be prompted to enter each value. Use `Escape` to cancel.

## Development

```bash
pnpm install         # Install dependencies
pnpm run dev         # Run with tsx (auto-reload)
pnpm run build       # Compile to dist/
pnpm run type-check  # TypeScript checks
pnpm run test        # Run tests
```

### From source (development)
```bash
git clone git@github.com:amoshydra/qpq.git
cd qpq
pnpm install
pnpm run build
./qpq.sh
```


## FAQ

### Why qpq.sh wrapper?

`qpq.sh` captures your shell's **in-memory history** before launching. Without it, only previously saved history (on disk) is visible.

The wrapper ensures you see commands you just typed, working across all shell configurations.

### Why don't directory changes persist after running a command?

When you select a command from qpq, it runs in a subprocess. Commands like `cd`, `export`, `alias` (which modify the environment) will take effect in the subprocess. **Environment changes won't persist** after the command exits - you'll return to the original directory and environment.

**Workaround**: Append `$SHELL` to keep a new shell open:

```jsonc
// Instead of:
{
  "name": "Go to project",
  "command": "cd /path/to/project"
}

// Use:
{
  "name": "Go to project",
  "command": "cd /path/to/project; $SHELL"
}
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
