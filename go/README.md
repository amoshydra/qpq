# qpq native implementation

The native Go + Bubble Tea implementation of qpq.

It reads the **same config file** as the previous Node version, so existing commands, favorites, and recents carry over without migration.

## Status

Implemented:

- menu with favorites and recents
- search across names, command text, descriptions, tags, and aliases
- favorite toggle
- add, edit, delete, and clone commands
- template placeholders with `{name}` and `{name:index}` support
- shell-history picker for add command
- command execution with exit-status propagation
- atomic config writes and legacy config migration
- default config creation

Known gaps:

- current-session in-memory shell history (commands must be flushed to the history file)


## Prebuilt binaries

Download the matching binary from the latest GitHub release:

```bash
# Termux (64-bit Android)
curl -LO https://github.com/amoshydra/qpq/releases/latest/download/qpq-android-arm64
chmod +x qpq-android-arm64
mkdir -p "$PREFIX/bin"
cp qpq-android-arm64 "$PREFIX/bin/qpq"

# Linux x86_64
curl -LO https://github.com/amoshydra/qpq/releases/latest/download/qpq-linux-amd64
chmod +x qpq-linux-amd64
mkdir -p "$HOME/.local/bin"
cp qpq-linux-amd64 "$HOME/.local/bin/qpq"
```

Release assets are built by the `Release to NPM` workflow and attached to the GitHub release:

- `qpq-android-arm64` — Termux / 64-bit Android
- `qpq-linux-amd64` — Linux x86_64
- `qpq-linux-arm64` — Linux ARM64 / Raspberry Pi 64-bit
- `qpq-linux-armv7` — Raspberry Pi 32-bit (Pi 2/3/4)
- `qpq-linux-armv6` — Raspberry Pi 1 / Zero
- `qpq-darwin-amd64` — Intel macOS
- `qpq-darwin-arm64` — Apple Silicon macOS
- `qpq-windows-amd64.exe` — Windows x86_64

## Requirements

- Go **1.24+** (Bubble Tea v1.3.10 requires it)
- `git` and `make` for the source-install path

## Termux

```bash
pkg install golang git make
git clone https://github.com/amoshydra/qpq.git
cd qpq/go

make build
./qpq --version
```

Remove the existing npm installation first, then install the native binary as `qpq`:

```bash
npm uninstall -g qpq
make install PREFIX="$PREFIX"
qpq
```

`$PREFIX` is Termux's package prefix (usually `/data/data/com.termux/files/usr`). The binary ends up at `$PREFIX/bin/qpq`.

## Linux

```bash
git clone https://github.com/amoshydra/qpq.git
cd qpq/go

make build
./qpq --version
make install
```

If an npm installation is present, remove it first:

```bash
npm uninstall -g qpq
```

`make install` defaults to `~/.local/bin`. Make sure that directory is in your `PATH`. For a system-wide install:

```bash
sudo make install PREFIX=/usr/local
```

## Build without make

```bash
cd go
CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o qpq .
```

The resulting binary is statically linked and has no runtime dependencies.

## Cross-compile

Build a Termux/ARM64 binary from a Linux or macOS machine:

```bash
cd go
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags="-s -w" -o qpq-linux-arm64 .
```

Or build all supported targets:

```bash
make cross
# dist/qpq-linux-amd64       # Linux x86_64
# dist/qpq-linux-arm64       # Linux ARM64 / Raspberry Pi 64-bit
# dist/qpq-linux-armv7       # Raspberry Pi 32-bit (Pi 2/3/4)
# dist/qpq-linux-armv6       # Raspberry Pi 1 / Zero
# dist/qpq-android-arm64     # Termux on 64-bit Android (same binary as linux-arm64)
# dist/qpq-darwin-amd64      # Intel macOS
# dist/qpq-darwin-arm64      # Apple Silicon macOS
# dist/qpq-windows-amd64.exe # Windows x86_64
```

Termux runs the `android-arm64` binary. Raspberry Pi users should pick `linux-arm64` on a 64-bit OS, `linux-armv7` on a 32-bit Pi 2/3/4 OS, or `linux-armv6` for Pi 1/Zero.

Copy the Termux binary to your device:

```bash
chmod +x qpq-android-arm64
mkdir -p "$PREFIX/bin"
cp qpq-android-arm64 "$PREFIX/bin/qpq"
```

If a prebuilt static binary does not run on your Android/Termux setup, build it directly on the device with `make build`.

## Configuration

It uses the same configuration paths as the previous Node app:

- Linux/Termux: `~/.local/state/qpq/config.json`
- macOS: `~/Library/Application Support/qpq/config.json`
- Windows: `%LocalAppData%\qpq\config.json`

Use `qpq --paths` to print the exact path. If the file does not exist, a small default config is created.

## Keys

| Key | Action |
|---|---|
| `↑` / `↓` or `k` / `j` | Navigate |
| `Enter` or `1`–`9` | Run selected command |
| `f` | Toggle favorite |
| `a` | Add command (from history or blank form) |
| `e` | Edit selected command |
| `d` | Delete selected command |
| `c` | Clone selected command |
| `/` | Search |
| `Esc` / `q` | Quit |
| `Ctrl+C` | Quit |

In search mode, `Esc` returns to the menu and `Enter` runs the selected result.

## Measured

| Environment | `--version` startup | Menu RSS | Static binary |
|---|---:|---:|---:|
| Linux x86_64 | ~2ms | ~5.5MB | ~4.2MB |
| Termux aarch64 | 45–52ms | 7.9MB | ~4.2MB |

For comparison, the Node version on the same Termux device measured ~1.0s startup and ~108MB RSS. The native implementation is roughly 20× faster to start and 14× smaller in memory.
