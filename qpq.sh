#!/bin/sh

# qpq npm entry point. Resolves the native binary at run time so that no npm
# install script is required (npm 12 blocks unapproved dependency scripts).

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

# Map the current system to the matching optional platform package. Prints
# nothing when the platform has no published package.
platform_package() {
  os=$(uname -s 2>/dev/null) || return 0
  arch=$(uname -m 2>/dev/null) || return 0

  case "$os" in
    Darwin)
      case "$arch" in
        arm64|aarch64) printf '%s\n' qpq-darwin-arm64 ;;
        *) printf '%s\n' qpq-darwin-x64 ;;
      esac
      ;;
    Linux|Android)
      case "$arch" in
        aarch64|arm64) printf '%s\n' qpq-linux-arm64 ;;
        armv8l|armv7l|armv7|armv6l|arm) printf '%s\n' qpq-linux-armv7 ;;
        x86_64|amd64) printf '%s\n' qpq-linux-x64 ;;
      esac
      ;;
  esac
}

NATIVE_BIN=

# Explicit override.
if [ -n "${QPQ_NATIVE_BIN:-}" ]; then
  if [ ! -x "$QPQ_NATIVE_BIN" ]; then
    echo "qpq: QPQ_NATIVE_BIN is not executable: $QPQ_NATIVE_BIN" >&2
    exit 1
  fi
  exec "$QPQ_NATIVE_BIN" "$@"
fi

# A binary placed by an older postinstall, or installed manually.
if [ -x "$SCRIPT_DIR/bin/qpq-native" ]; then
  NATIVE_BIN=$SCRIPT_DIR/bin/qpq-native
fi

# The optional platform package, either as a sibling of this package (global
# installs and hoisted local installs) or nested under it (pnpm-style layouts).
PACKAGE=$(platform_package)
if [ -z "$NATIVE_BIN" ] && [ -n "$PACKAGE" ]; then
  for candidate in \
    "$SCRIPT_DIR/../$PACKAGE/bin/qpq" \
    "$SCRIPT_DIR/node_modules/$PACKAGE/bin/qpq"
  do
    if [ -x "$candidate" ]; then
      NATIVE_BIN=$candidate
      break
    fi
  done
fi

# Fall back to any installed platform package when uname does not match a
# published name, for example in a container with an unusual architecture.
if [ -z "$NATIVE_BIN" ]; then
  for candidate in \
    "$SCRIPT_DIR"/../qpq-*/bin/qpq \
    "$SCRIPT_DIR"/node_modules/qpq-*/bin/qpq
  do
    if [ -x "$candidate" ]; then
      NATIVE_BIN=$candidate
      break
    fi
  done
fi

if [ -z "$NATIVE_BIN" ]; then
  echo "qpq: native binary not found next to $SCRIPT_DIR" >&2
  echo "qpq: expected $SCRIPT_DIR/bin/qpq-native or the matching qpq-<platform> npm package" >&2
  echo "qpq: reinstall qpq, or download a release binary from https://github.com/amoshydra/qpq/releases" >&2
  exit 1
fi

exec "$NATIVE_BIN" "$@"
