# qpq-go prototype

A native Go + Bubble Tea prototype of qpq.

It reads the **same config file** as the Node version, so it can be tested against your existing commands without migrating anything.

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

- current-session in-memory shell history (the same limitation as the Node version; commands must be flushed to the history file)
- prebuilt release assets are produced by the release workflow, but this prototype is not yet the default `qpq` package
- terminal edge cases may still differ from the Ink version

This is a prototype, not a replacement release. Until it is merged, clone the `prototype/go-native` branch.

## Prebuilt binaries

Once a release includes the Go prototype, download the matching binary from the latest GitHub release:

```bash
# Termux (64-bit Android)
curl -LO https://github.com/amoshydra/qpq/releases/latest/download/qpq-go-android-arm64
chmod +x qpq-go-android-arm64
mkdir -p "$PREFIX/bin"
cp qpq-go-android-arm64 "$PREFIX/bin/qpq-go"

# Linux x86_64
curl -LO https://github.com/amoshydra/qpq/releases/latest/download/qpq-go-linux-amd64
chmod +x qpq-go-linux-amd64
mkdir -p "$HOME/.local/bin"
cp qpq-go-linux-amd64 "$HOME/.local/bin/qpq-go"
```

Release assets are built by the `Release to NPM` workflow and attached to the GitHub release:

- `qpq-go-android-arm64` — Termux / 64-bit Android
- `qpq-go-linux-amd64` — Linux x86_64
- `qpq-go-linux-arm64` — Linux ARM64 / Raspberry Pi 64-bit
- `qpq-go-linux-armv7` — Raspberry Pi 32-bit (Pi 2/3/4)
- `qpq-go-linux-armv6` — Raspberry Pi 1 / Zero
- `qpq-go-darwin-amd64` — Intel macOS
- `qpq-go-darwin-arm64` — Apple Silicon macOS
- `qpq-go-windows-amd64.exe` — Windows x86_64

## Requirements

- Go **1.24+** (Bubble Tea v1.3.10 requires it)
- `git` and `make` for the source-install path

## Termux

```bash
pkg install golang git make
git clone -b prototype/go-native https://github.com/amoshydra/qpq.git
cd qpq/go

make build
./qpq-go --version
```

Install it as `qpq-go` so it does not conflict with the existing Node `qpq`:

```bash
make install PREFIX="$PREFIX"
qpq-go
```

`$PREFIX` is Termux's package prefix (usually `/data/data/com.termux/files/usr`). The binary ends up at `$PREFIX/bin/qpq-go`.

To replace the Node version later:

```bash
npm uninstall -g qpq
cd qpq/go
make install PREFIX="$PREFIX"
mv "$PREFIX/bin/qpq-go" "$PREFIX/bin/qpq"
```

## Linux

```bash
git clone -b prototype/go-native https://github.com/amoshydra/qpq.git
cd qpq/go

make build
./qpq-go --version
make install
```

`make install` defaults to `~/.local/bin`. Make sure that directory is in your `PATH`. For a system-wide install:

```bash
sudo make install PREFIX=/usr/local
```

## Build without make

```bash
cd go
CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o qpq-go .
```

The resulting binary is statically linked and has no runtime dependencies.

## Cross-compile

Build a Termux/ARM64 binary from a Linux or macOS machine:

```bash
cd go
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags="-s -w" -o qpq-go-linux-arm64 .
```

Or build all supported targets:

```bash
make cross
# dist/qpq-go-linux-amd64       # Linux x86_64
# dist/qpq-go-linux-arm64       # Linux ARM64 / Raspberry Pi 64-bit
# dist/qpq-go-linux-armv7       # Raspberry Pi 32-bit (Pi 2/3/4)
# dist/qpq-go-linux-armv6       # Raspberry Pi 1 / Zero
# dist/qpq-go-android-arm64     # Termux on 64-bit Android (same binary as linux-arm64)
# dist/qpq-go-darwin-amd64      # Intel macOS
# dist/qpq-go-darwin-arm64      # Apple Silicon macOS
# dist/qpq-go-windows-amd64.exe # Windows x86_64
```

Termux runs the `android-arm64` binary. Raspberry Pi users should pick `linux-arm64` on a 64-bit OS, `linux-armv7` on a 32-bit Pi 2/3/4 OS, or `linux-armv6` for Pi 1/Zero.

Copy the Termux binary to your device:

```bash
chmod +x qpq-go-android-arm64
mkdir -p "$PREFIX/bin"
cp qpq-go-android-arm64 "$PREFIX/bin/qpq-go"
```

If a prebuilt static binary does not run on your Android/Termux setup, build it directly on the device with `make build`.

## Configuration

The prototype uses the same paths as the Node app:

- Linux/Termux: `~/.local/state/qpq/config.json`
- macOS: `~/Library/Application Support/qpq/config.json`
- Windows: `%LocalAppData%\qpq\config.json`

Use `qpq-go --paths` to print the exact path. If the file does not exist, a small default config is created.

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

For comparison, the Node version on the same Termux device measured ~1.0s startup and ~108MB RSS. The native prototype is roughly 20× faster to start and 14× smaller in memory.
