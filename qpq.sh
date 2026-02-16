#!/bin/sh

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Run qpq and capture its output
output=$(node "$SCRIPT_DIR/dist/index.js" "$@")
exit_code=$?

# If qpq exited successfully and printed a command, exec it
if [ $exit_code -eq 0 ] && [ -n "$output" ]; then
  # Extract command after __QEXEC__ marker
  command=$(echo "$output" | sed -n 's/^__QEXEC__ //p')
  if [ -n "$command" ]; then
    eval "exec $command"
  fi
fi

# Otherwise, exit with qpq's exit code
exit $exit_code
