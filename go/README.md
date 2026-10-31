# qpq-go prototype

A native Go + Bubble Tea prototype of qpq.

It reads the **same config file** as the Node version, so it can be tested against your existing commands without migrating anything.

## Status

Implemented:

- menu with favorites and recents
- search across names, command text, descriptions, tags, and aliases
- favorite toggle
- recents update on execution
- command execution with exit-status propagation
- default config creation

Not ported yet:

- add/edit/delete/clone forms
- template placeholders (`{name}` commands show a message instead of executing)
- shell-history picker
- full parity for terminal edge cases

This is a prototype, not a replacement release. Until it is merged, clone the `prototype/go-native` branch.

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
# dist/qpq-go-linux-amd64
# dist/qpq-go-linux-arm64
# dist/qpq-go-darwin-amd64
# dist/qpq-go-darwin-arm64
# dist/qpq-go-windows-amd64.exe
```

Copy the ARM64 binary to Termux, then:

```bash
chmod +x qpq-go-linux-arm64
mkdir -p "$PREFIX/bin"
cp qpq-go-linux-arm64 "$PREFIX/bin/qpq-go"
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
