#!/bin/bash

# QPQ Shell Wrapper
# Captures shell history and passes to qpq TUI launcher
#
# Features:
# - Captures last 40 shell commands from memory
# - Encodes as base64 for safe parameter passing
# - Works with bash, zsh, fish, and powershell
# - Falls back to history files if history builtin unavailable
#
# DEFAULT_HISTORY_BUFFER_SIZE of 40 used directly in wrapper script:
# tail -n 40 captures last 40 shell commands before launching qpq

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get current working directory for passing to qpq
working_dir="$(pwd)"

# Try to capture history using shell builtin (most reliable)
HISTORY_JSON=""

case "${SHELL:-}" in
  *zsh*)
    if command -v zsh >/dev/null 2>&1; then
      HISTORY_ENTRIES=()
      if [ -n "${HISTFILE:-}" ] && [ -f "${HISTFILE}" ]; then
        while read -r line; do
          # zsh format: : timestamp:duration;command
          if [[ "$line" =~ ': ([0-9]+):([0-9]+);(.*)$' ]]; then
            HISTORY_ENTRIES+=("${BASH_REMATCH[3]}")
          fi
        done < "${HISTFILE}"
        # Get last 40 commands at most
        HISTORY_JSON=$(IFS='|'; echo "${HISTORY_ENTRIES[*]: -40}")
      fi
    fi
    ;;
  *bash*)
    if command -v bash >/dev/null 2>&1; then
      # Try using history builtin first
      if bash -c 'history | tail -n 40' 2>/dev/null | grep -q '^\s*' >/dev/null 2>&1; then
        HISTORY_JSON=$(bash -c 'history | tail -n 40' 2>/dev/null | sed 's/^[ \t]*[0-9]*[ \t]*//' | tr '\n' '|' | sed 's/|$//')
      fi
    fi
    ;;
  *fish*)
    if command -v fish >/dev/null 2>&1; then
      HISTORY_JSON=$(fish -c 'count (string split "\n" (string join "\n" (history --query | string trim)))' 2>/dev/null || echo "20")
      if [ "${HISTORY_JSON}" -gt 0 ]; then
        HISTORY_JSON=$(fish -c "history | tail -n 40" 2>/dev/null | tr '\n' '|' | sed 's/|$//')
      fi
    fi
    ;;
  *pwsh*|*powershell*)
    if command -v pwsh >/dev/null 2>&1; then
      HISTORY_JSON=$(pwsh -c "Get-History -Count 40 | ForEach-Object { $_.CommandLine }" 2>/dev/null | tr '\n' '|' | sed 's/|$//')
    fi
    ;;
esac

# If history builtin didn't work, try reading history files
if [ -z "${HISTORY_JSON}" ]; then
  case "${SHELL:-}" in
    *zsh*)
      if [ -n "${HISTFILE:-}" ] && [ -f "${HISTFILE}" ]; then
        HISTORY_JSON=$(tail -n 40 "${HISTFILE}")
        HISTORY_JSON=$(echo "$HISTORY_JSON" | sed 's/^[^;]*;//' | tr '\n' '|' | sed 's/|$//')
      fi
      ;;
    *bash*)
      HISTFILE="${HOME-.}/.bash_history"
      if [ -f "$HISTFILE" ]; then
        HISTORY_JSON=$(tail -n 40 "$HISTFILE" | tr '\n' '|' | sed 's/|$//')
      fi
      ;;
    *fish*)
      HISTFILE="${HOME-.}/.local/share/fish/fish_history"
      if [ -f "$HISTFILE" ]; then
        HISTORY_JSON=$(tail -n 40 "$HISTFILE" | tr '\n' '|' | sed 's/|$//')
      fi
      ;;
  esac
fi

# Base64 encode the history for safe passing as environment variable
export HISTORY_JSON_BASE64=""
if [ -n "${HISTORY_JSON:-}" ]; then
  export QPQ_SHELL_HISTORY=$(echo -n "${HISTORY_JSON}" | base64)
fi

# Launch actual qpq from same directory
if [ -f "$script_dir/../index.js" ]; then
  exec node "$script_dir/../index.js" "$@"
elif [ -f "$script_dir/../dist/index.js" ]; then
  exec node "$script_dir/../dist/index.js" "$@"
else
  echo "Error: Could not find qpq main entry point" >&2
  exit 1
fi
