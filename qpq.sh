#!/bin/sh

# Resolve the real path of this script. npm installs bins as symlinks, and
# macOS's readlink does not support -f, so resolve links manually.
SCRIPT_PATH=$0
while [ -L "$SCRIPT_PATH" ]; do
  LINK_DIR=$(CDPATH= cd "$(dirname "$SCRIPT_PATH")" 2>/dev/null && pwd -P) || break
  LINK_TARGET=$(readlink "$SCRIPT_PATH") || break

  case "$LINK_TARGET" in
    /*) SCRIPT_PATH=$LINK_TARGET ;;
    *) SCRIPT_PATH=$LINK_DIR/$LINK_TARGET ;;
  esac
done

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$SCRIPT_PATH")" 2>/dev/null && pwd -P) || {
  echo "qpq: could not resolve the script directory" >&2
  exit 1
}

if ! command -v node >/dev/null 2>&1; then
  echo "qpq: node is required but was not found in PATH" >&2
  exit 1
fi

ENTRY="$SCRIPT_DIR/dist/index.js"
if [ ! -f "$ENTRY" ]; then
  echo "qpq: could not find $ENTRY. Run 'pnpm run build' first." >&2
  exit 1
fi

STDERR_FILE=$(mktemp) || exit 1
COMMAND_FILE=$(mktemp) || {
  rm -f "$STDERR_FILE"
  exit 1
}

cleanup() {
  rm -f "$STDERR_FILE" "$COMMAND_FILE"
}
trap cleanup EXIT

QPQ_COMMAND_FILE=$COMMAND_FILE
export QPQ_COMMAND_FILE

node "$ENTRY" "$@" 2>"$STDERR_FILE"
exit_code=$?

unset QPQ_COMMAND_FILE

if [ "$exit_code" -ne 0 ]; then
  cat "$STDERR_FILE" >&2
  exit "$exit_code"
fi

command=$(cat "$COMMAND_FILE")

if [ -z "$command" ]; then
  # Fallback for app versions that only write the marker to stderr.
  command=$(sed -n 's/^__QEXEC__ //p' "$STDERR_FILE")
fi

if [ -n "$command" ]; then
  eval "$command"
  exit $?
fi

exit 0
