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

NATIVE_BIN="${QPQ_NATIVE_BIN:-$SCRIPT_DIR/bin/qpq-native}"
if [ ! -x "$NATIVE_BIN" ]; then
  echo "qpq: native binary not found at $NATIVE_BIN" >&2
  echo "qpq: reinstall qpq, or download a release binary from https://github.com/amoshydra/qpq/releases" >&2
  exit 1
fi

exec "$NATIVE_BIN" "$@"
