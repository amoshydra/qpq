# TUI Launcher

A terminal-based command launcher for frequently used commands. Built with TypeScript, React, and Ink.

## Features

- **Menu Mode**: Two sections - Favorites (pinned) and All Commands
- **Favorites**: Pin frequently used commands at the top (press `f` to toggle)
- **All Commands**: Sorted by recency - recently used commands appear first
- **Edit Mode**: Add new commands and delete existing ones (press `e`)
- **Add Command**: Select from shell history or create new ones
- **Delete Command**: Fully removes from config, favorites, and recent
- **Search Mode**: Real-time fuzzy search through commands  
- **Template Support**: Command placeholders that prompt for values
- **Platform Aware**: Works on Linux, macOS, and Windows
- **Auto-init**: Creates config directory and sample file if missing

## Installation

```bash
pnpm install
pnpm run build
pnpm link  # Optional: Symlink for global use
```

## Usage

### Interactive Mode

```bash
pnpm start
# or
node dist/index.js
```

### Keyboard Controls

| Key | Action |
|-----|--------|
| ↓↑ | Navigate commands |
| Enter / 1-9 | Select command |
| f | Toggle favorite on selected command |
| e | Enter edit mode (add/delete commands) |
| / | Switch to search mode |
| Escape / q | Return to menu (search mode) |
| Ctrl+C | Quit |

### Edit Mode

| Key | Action |
|-----|--------|
| a | Add new command |
| d | Delete commands |
| Escape / q | Back to menu |

### Add Command

| Key | Action |
|-----|--------|
| Enter | Select from history or submit command |
| n | New command (skip history) |
| Tab | Next field |
| Escape | Back / Cancel |

### Delete Command

| Key | Action |
|-----|--------|
| Enter | Confirm deletion |
| n | Cancel deletion |
| Escape | Back |

### Config File

Default config locations:
- Linux: `~/.local/tiny-launcher/fav.yaml`
- macOS: `~/Library/Application Support/tui-launcher/fav.yaml`
- Windows: `%APPDATA%\tui-launcher\fav.yaml`

### Favorites & Recent Files

The app tracks favorites and recent commands:
- Favorites: `~/.local/tiny-launcher/favorites.json`
- Recent: `~/.local/tiny-launcher/recent.json`

### Menu Display

The menu shows two sections:
1. **Favorites** - Pinned commands (never sorted by recency)
2. **All Commands** - All other commands sorted by when they were last used
   - Recently used commands appear first
   - Commands never used appear at the bottom alphabetically

### Adding/Deleting Commands

**Adding Commands:**
1. Press `e` to enter Edit Mode
2. Press `a` to add new command
3. Select from shell history (last 30) or press `n` for new
4. Fill form (command is mandatory, other fields optional)
5. Press Enter to submit

**Deleting Commands:**
1. Press `e` to enter Edit Mode
2. Press `d` to delete commands
3. Select command to delete
4. Confirm deletion
5. Removes from config, favorites, and recent

## Command Format

```yaml
commands:
  - name: "Git Push"
    command: "git push origin {branch}"
    description: "Push to remote branch"
    tags: [git]
```

### Templates

Use `{placeholder}` syntax:
```yaml
- name: "Git Push"
  command: "git push origin {branch}"
```
When selected, you'll be prompted to enter the `branch` value.

## Development

```bash
pnpm run dev      # Run with tsx (auto-reload)
pnpm run build    # Compile to dist/
pnpm run type-check  # TypeScript checks
```

## FAQ

### Why the wrapper script?

`tui-launcher-wrapper.sh` captures your shell's **in-memory history** before launching. Without it, only previously saved history (on disk) is visible.

The wrapper ensures you see commands you just typed, working across all shell configurations.

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