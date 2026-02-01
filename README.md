# TUI Launcher

A terminal-based command launcher for frequently used commands. Built with TypeScript, React, and Ink.

## Features

- **Menu Mode**: Arrow key navigation with numbered shortcuts
- **Search Mode**: Real-time fuzzy search through commands  
- **Template Support**: Command placeholders that prompt for values
- **Recent Commands**: Tracks and quick access to your last 20 selections
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
| / | Switch to search mode |
| Escape / q | Return to menu (search mode) |
| Ctrl+C | Quit |

### Config File

Default config locations:
- Linux: `~/.local/tiny-launcher/fav.yaml`
- macOS: `~/Library/Application Support/tui-launcher/fav.yaml`
- Windows: `%APPDATA%\tui-launcher\fav.yaml`

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

## Error Handling

If config file is corrupted, the app will show:
1. Full error message
2. File location
3. Instructions to fix manually

The app never modifies existing config files - only creates them if missing.