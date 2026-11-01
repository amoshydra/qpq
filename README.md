# QPQ

[![npm](https://img.shields.io/npm/v/qpq.svg)](https://www.npmjs.com/package/qpq)
[![License](https://img.shields.io/github/license/amoshydra/qpq.svg)](LICENSE)
[![GitHub](https://img.shields.io/github/stars/amoshydra/qpq.svg)](https://github.com/amoshydra/qpq)

A terminal-based command launcher for frequently used commands, built with Go and Bubble Tea.

<center>

![output](https://github.com/user-attachments/assets/0d3bb1a6-77f9-4cfa-ab92-45a499dc7cd2)

</center>

## Features

- **Menu Mode**: One command list with favorites first, then other commands by recency
- **Favorites**: Pin frequently used commands at the top (press `f` to toggle)
- **Recency Sorting**: Among non-favorites, recently used commands appear first and never-used commands fall to the bottom alphabetically
- **Direct Actions**: Add, edit, clone, or delete commands directly from the menu
- **Search Mode**: Real-time substring search across names, commands, descriptions, tags, and aliases
- **Template Support**: Command placeholders that prompt for values
- **Cross-platform Config**: Uses the right config directory on Linux, macOS, and Windows
- **Native Runtime**: Ships a static Go binary for Linux, macOS, Windows, Termux, and Raspberry Pi
- **Auto-init**: Creates config directory and sample file if missing

| **Menu Mode** | **Add from shell** |
| :-:  | :-: |
| ![readme-001-output](https://github.com/user-attachments/assets/21d6f8c6-052f-48b4-89b3-5352f72d94ca) | ![readme-002-add](https://github.com/user-attachments/assets/372d67b9-2591-41ca-8a0b-6a9a87f55161)
| **Edit mode** | **Favorites**
| ![readme-003-edit](https://github.com/user-attachments/assets/73bb8e8a-7c40-47f2-b2bc-a29425a2d9a3) | ![readme-004-favorite](https://github.com/user-attachments/assets/18aeb419-ac7f-4c43-acde-b7b5d716f99a) |



## Installation

The npm package installs the native Go binary for your platform through optional platform packages. No install script runs: `qpq` resolves the platform binary when it launches. Node.js is only involved because npm itself runs on it.

### Try instantly (no install)
```bash
npx qpq
```

### Global install
```bash
npm i -g qpq
qpq
```

### Termux / Android

```bash
npm i -g qpq
qpq
```

npm installs the matching Linux/Android platform package automatically (the ARM64 package on current Termux devices). Alternatively, download `qpq-android-arm64` from the latest GitHub release and install it as `qpq`:

```bash
curl -LO https://github.com/amoshydra/qpq/releases/latest/download/qpq-android-arm64
chmod +x qpq-android-arm64
cp qpq-android-arm64 "$PREFIX/bin/qpq"
```

### Raspberry Pi

Download the matching release binary:

- 64-bit Raspberry Pi OS: `qpq-linux-arm64`
- 32-bit Pi 2/3/4: `qpq-linux-armv7`
- Pi 1 / Zero: `qpq-linux-armv6`

### Windows

The npm package supports Linux, macOS, and Android only, and its launcher is a POSIX shell script. On Windows, download `qpq-windows-amd64.exe` from the latest GitHub release instead.

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
| ↑/↓ or k/j | Navigate commands |
| Enter / 1-9 | Select command |
| f | Toggle favorite on selected command |
| a | Add new command |
| d | Delete selected command |
| e | Edit selected command |
| c | Clone selected command |
| / | Switch to search mode |
| q / Escape / Ctrl+C | Quit |

#### Search Mode

| Key | Action |
|-----|--------|
| Type | Search query |
| ↑/↓ | Navigate results |
| Enter | Select command |
| Escape | Return to menu |
| Backspace / Delete | Delete last character |
| Ctrl+U | Clear search query |
| Ctrl+C | Quit |

#### Add Command - History Selection

| Key | Action |
|-----|--------|
| ↑/↓ or k/j | Navigate history |
| Enter | Select command from history |
| n | Skip to new command form |
| Escape | Cancel |

#### Add/Edit Command Form

| Key | Action |
|-----|--------|
| Type | Enter text in current field |
| ↑/↓ | Navigate fields |
| ←/→, Home/End | Move cursor |
| Backspace / Delete | Delete character |
| Ctrl+U | Clear current field |
| Enter | Next field or submit (if last) |
| Escape | Cancel |

#### Template Prompt

| Key | Action |
|-----|--------|
| Type | Enter value for current field |
| ↑/↓ | Navigate between fields |
| Enter | Next field or submit (if last) |
| Escape | Cancel |

Template fields support the same cursor and editing keys as the command form.

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

The config file stores commands, favorites, recent history, and the next command ID in a single JSON file.

### Menu Display

The menu shows commands in this order:
1. **Favorites** - Pinned commands first, in command definition order
2. **Other commands** - Sorted by when they were last used
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

**Note**: Favorites and recent history store command IDs, so renaming a command keeps its favorite and recency state. The edit form preserves existing aliases; edit the config file directly to change them.

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
      "id": 1,
      "name": "Git Push",
      "command": "git push origin {branch}",
      "description": "Push to remote branch",
      "tags": ["git"],
      "aliases": ["gp"]
    }
  ],
  "favorites": [1],
  "recent": [
    {
      "id": 1,
      "timestamp": 1760000000000
    }
  ],
  "nextId": 2
}
```

`favorites` and `recent` reference command IDs, and recent entries also carry an epoch-millisecond timestamp. `nextId` is the ID assigned to the next new command. `aliases` are optional searchable names; the edit form preserves them but does not expose an alias field.

### Templates

Use `{placeholder}` syntax for dynamic values. Placeholder names can contain letters, digits, and underscores:
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

### Native implementation

```bash
cd go
make check       # go test + go vet + formatting check
make build       # build ./qpq
make cross       # build all release targets
```

Source installs:

```bash
cd go
make install                 # ~/.local/bin/qpq
make install PREFIX=/usr/local
```

### Launcher and packaging

The top-level npm package ships the `qpq.sh` launcher. To test the launcher and packaging:

```bash
pnpm install
pnpm test                    # node:test launcher and packaging tests
pnpm run lint:package        # publint
```

When published, the package declares the five platform packages (`qpq-linux-x64`, `qpq-linux-arm64`, `qpq-linux-armv7`, `qpq-darwin-x64`, and `qpq-darwin-arm64`) as optional dependencies; `scripts/publish-npm.mjs` adds them while staging. `qpq.sh` finds the matching one as a sibling package or under a nested `node_modules`, falls back to any installed `qpq-*` package, then `exec`s its binary at launch. No binary is fetched from GitHub during install; npm installs the matching platform package from the registry. No install script runs, and there is no Node fallback. If no platform package is installed, `qpq` exits with a clear error; install a release binary manually in that case.

## FAQ

### Why does qpq need a launcher script?

`qpq.sh` locates the native binary and `exec`s it. npm needs a stable entry point, and the binary name differs per platform, so the launcher checks `QPQ_NATIVE_BIN`, then `bin/qpq-native`, then the sibling or nested `qpq-<platform>` package, then any installed `qpq-*` package. It runs no install script, so `npm install` keeps working on npm 12, where dependency install scripts are blocked by default. If the native binary is missing, `qpq` exits with a clear error instead of falling back to a second implementation.

### Why don't directory changes persist after running a command?

When you select a command from qpq, qpq evaluates the selected command in a child shell. Commands like `cd`, `export`, and `alias` run, but their effects disappear when that shell exits. **Environment changes won't persist** - you'll return to the original directory and environment.

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

It also queries the shell's history command as a fallback. Entries from the current session may not appear until your shell flushes them to disk; for example, zsh users with `INC_APPEND_HISTORY` or `SHARE_HISTORY` will see them immediately.

## Error Handling

If the config file is corrupted, qpq prints the parse error and the config file path, then exits. Fix or remove the file manually; qpq does not automatically repair or overwrite a corrupted config.

If a config mutation (add, edit, delete, clone, or favorite) cannot be saved, qpq shows an in-app Error screen with the failure message and returns to the menu after Enter or Escape. If saving recent history fails after you select a command, qpq prints a warning after the UI exits.

Config writes are atomic, so a failed save does not leave a partially-written config behind.
