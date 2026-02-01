#!/bin/bash

# Get the directory where this wrapper script is located
WRAPPER_PATH="$0"
SCRIPT_DIR="$(cd "$(dirname "$WRAPPER_PATH")" && pwd)"

# Identify the shell type
SHELL_TYPE=$(basename "$SHELL")

# Get shell history based on shell type
case "$SHELL_TYPE" in
  zsh)
    # zsh: fc -l -1 shows all history (memory), not just file
    HISTORY_COMMAND="fc -l -1"
    ;;
  bash)
    # bash: history command
    HISTORY_COMMAND="history"
    ;;
  fish)
    HISTORY_COMMAND="history"
    ;;
  pwsh|powershell)
    # This wrapper won't run on Windows without WSL
    # We'll still include the fallback for completeness
    HISTORY_COMMAND="fc -l -1"
    ;;
  *)
    HISTORY_COMMAND="fc -l -1"
    ;;
esac

# Get last 40 commands (buffer for light duplication with 1.6x ratio: capturing 40, typically showing 25-30 after deduplication), pipe-separate them, base64 encode
if command -v base64 >/dev/null 2>&1; then
  {
    $HISTORY_COMMAND 2>/dev/null | tail -n 40  # Buffer for light duplication (typically 25-30 shown after deduplication)
  } | {
    # Remove line numbers (zsh: "n  cmd", bash: "n cmd")
    sed 's/^[[:space:]]*[0-9][0-9:]*[[:space:]]*//' |
    # Pipe-separate commands (but the "|" can't be in a real command safely)
    tr '\n' '|' |
    # Remove trailing pipe
    sed 's/|$//' |
    # Base64 encode
    base64 2>/dev/null |
    # Remove newlines from base64 output
    tr -d '\n'
  }
else
  HISTORY_JSON=""
fi

# Set environment variable
export TUI_LAUNCHER_SHELL_HISTORY="$HISTORY_JSON"

# Launch actual tui-launcher from same directory
exec node "$SCRIPT_DIR/index.js" "$@"