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
- **Direct Actions**: Add, edit, clone, or delete commands directly from the menu
- **Search Mode**: Real-time substring search across names, commands, descriptions, tags, and aliases
- **Template Support**: Command placeholders that prompt for values
- **Cross-platform Config**: Uses the right config directory on Linux, macOS, and Windows
- **POSIX Launcher**: Executes the selected command through `qpq.sh` on Linux and macOS
- **Auto-init**: Creates config directory and sample file if missing

| **Menu Mode** | **Add from shell** |
| :-:  | :-: |
| ![readme-001-output](https://github.com/user-attachments/assets/21d6f8c6-052f-48b4-89b3-5352f72d94ca) | ![readme-002-add](https://github.com/user-attachments/assets/372d67b9-2591-41ca-8a0b-6a9a87f55161)
| **Edit mode** | **Favorites**
| ![readme-003-edit](https://github.com/user-attachments/assets/73bb8e8a-7c40-47f2-b2bc-a29425a2d9a3) | ![readme-004-favorite](https://github.com/user-attachments/assets/18aeb419-ac7f-4c43-acde-b7b5d716f99a) |



## Installation

Requires Node.js 20 or newer.

### Try instantly (no install)
```bash
npx qpq
```

### Global install
```bash
npm i -g qpq
qpq
```

### Windows

The npm launcher is a POSIX shell script (`qpq.sh`), so end-to-end command execution is supported on Linux and macOS. On Windows you can build and run the UI with `node dist/index.js`, but selected commands are only printed rather than executed automatically.

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
| c | Clone selected command |
| / | Switch to search mode |
| Escape / Ctrl+C | Quit |

#### Search Mode

| Key | Action |
|-----|--------|
| Type | Search query |
| ↓↑ | Navigate results |
| Enter | Select command |
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

Placeholder order defaults to the order they appear in the command. Add an optional sort index to control the prompt order explicitly:

```json
{
  "name": "ADB Connect",
  "command": "adb pair {ip:3}:{port:2}; adb connect {host:1}:{port}"
}
```

Placeholders with a lower index are prompted first. Placeholders without an index use `0`, and ties fall back to their position in the command.

### Command execution and trust

qpq does not sandbox commands. It evaluates the selected command in your shell, and template values are inserted verbatim. Treat a qpq config file like a shell script and only use configs you trust.

## Development

```bash
pnpm install         # Install dependencies
pnpm run dev         # Run with tsx (auto-reload)
pnpm run build       # Compile to dist/
pnpm run type-check  # TypeScript checks
pnpm run test        # Run tests in watch mode
pnpm run test:run    # Run tests once
pnpm start           # Run the built app
```

`pnpm run dev` and `pnpm start` render the TUI but do not execute selected commands. Use the wrapper after building to test the full flow:

### From source (development)
```bash
git clone git@github.com:amoshydra/qpq.git
cd qpq
pnpm install
pnpm run build
./qpq.sh
```

## Go prototype (experimental)

A native Go + Bubble Tea prototype lives in [`go/`](go/README.md). It reads the same config file and currently supports the menu, favorites, recents, search, and command execution. Add/edit/delete forms and template prompts are not ported yet.

It is intended for evaluating a native replacement, especially on Termux. See [`go/README.md`](go/README.md) for Termux/Linux build and install instructions.

## FAQ

### Why qpq.sh wrapper?

`qpq.sh` launches the TUI, then evaluates the selected command after the UI exits. Running `node dist/index.js` directly renders the menu but only prints the selected command instead of running it.

The wrapper also propagates the exit status of the command it runs.

### Why don't directory changes persist after running a command?

When you select a command from qpq, the wrapper evaluates it in a child shell. Commands like `cd`, `export`, and `alias` run, but their effects disappear when that shell exits. **Environment changes won't persist** - you'll return to the original directory and environment.

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

qpq reads the history file for the detected shell:

- zsh: `~/.zsh_history`
- bash: `~/.bash_history`
- fish: `~/.local/share/fish/fish_history`
- PowerShell: the PSReadLine history file

It also tries the shell's `history` builtin as a fallback. Entries from the current session may not appear until your shell flushes them to disk; for example, zsh users with `INC_APPEND_HISTORY` or `SHARE_HISTORY` will see them immediately.

## Error Handling

If the config file is corrupted, the app will show:

1. Full error message
2. File location
3. Instructions to fix manually

Config writes are atomic, so a failed save does not leave a partially-written config behind. The app does not automatically repair or overwrite a corrupted config file.
