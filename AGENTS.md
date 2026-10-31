# AGENTS.md

This file provides coding conventions and development guidelines for agentic coding agents working on this repository.

## Project Overview

qpq is a terminal command launcher written in Go with Bubble Tea. The native implementation lives in `go/` and is the only runtime. The npm package contains a small POSIX launcher (`qpq.sh`) that resolves the matching optional platform package at run time; it runs no install script.

Do not reintroduce the previous TypeScript/Ink runtime. The final Node implementation is preserved at the `node-final` tag.

## Build & Development Commands

Go is the primary implementation. The repository uses pnpm only for npm packaging and installer tests.

```bash
cd go
make check       # gofmt check + go vet + go test
make build       # build ./qpq
make cross       # build all release targets
make install     # install to ~/.local/bin/qpq
```

Installer/package tests:

```bash
pnpm install
pnpm test        # node:test launcher tests
pnpm run lint:package
```

**Hooks:**
The husky pre-commit hook runs Node installer tests, `gofmt -l`, `go vet`, and `go test`. The pre-push hook also runs `make build`.

**Build Output:**
- `go/qpq` is the local binary (ignored)
- `go/dist/qpq-*` are release binaries (ignored)
- `qpq.sh` is the npm entry point
- `bin/qpq-native` is an optional manual install location (ignored)

## File Structure

```
go/                 # Native Go implementation
├── main.go         # Entry point, flags, shell execution
├── config.go       # Config load/save/migration, commands, ordering
├── model.go        # Bubble Tea model, screens, key handling, views
├── history.go      # Shell history file/subprocess capture
├── templates.go    # Placeholder extraction and filling
├── form.go         # Command form validation
└── *_test.go       # Go tests

scripts/            # npm packaging tooling
├── publish-npm.mjs # Stages and publishes platform packages + qpq
├── trust-platform-packages.sh
└── wrapper.test.mjs

qpq.sh              # npm bin: resolves and execs the platform binary
```

## Go Style

- Run `gofmt -w` on all Go files.
- Use idiomatic Go naming and explicit error handling.
- Return errors with context (`fmt.Errorf("...: %w", err)`).
- Keep pure logic in package-level functions so it can be tested without Bubble Tea.
- Use value receivers for Bubble Tea models where practical; keep update functions deterministic.
- Avoid global mutable state except style variables and regexes.
- Keep config writes atomic: write a temporary file, then rename.
- Preserve command IDs across mutations. IDs are the identity used by favorites and recents.

## Config Persistence

- Config paths are shared with the former Node implementation:
  - Linux/Termux: `~/.local/state/qpq/config.json`
  - macOS: `~/Library/Application Support/qpq/config.json`
  - Windows: `%LocalAppData%\qpq\config.json`
- Add/edit/delete/clone/favorite operations must not corrupt `recent` or `favorites`.
- Delete removes the command from `commands`, `favorites`, and `recent` in one save.
- Recent history is capped at 20 entries and must remain newest-first.
- Normalize missing IDs, duplicate IDs, string favorites, and name-based recent entries when loading.
- Migrate legacy `fav.json`, `favorites.json`, and `recent.json` only when the main config is absent. Never delete legacy files if migration fails.

## TUI Behavior

- Menu: favorites first in config order, then non-favorites by recency, then never-used commands alphabetically.
- Search: recent results first, then remaining commands. Match name, command text, description, tags, and aliases.
- Key routing is implemented in `model.go` screen update methods. Keep guards for `Ctrl` combinations (especially `Ctrl+D`, which Bubble Tea reports as `ctrl+d`).
- Text fields support cursor movement, backspace, delete, home/end, spaces, and multi-rune input.
- Template placeholders support `{name}` and `{name:index}`.
- Command execution happens after Bubble Tea restores the terminal. Use the user's shell on POSIX and PowerShell on Windows.

## Testing

- Add pure Go tests for config, ordering, search, forms, templates, and history parsing.
- Add model tests for screen transitions and mutations.
- Keep installer tests in `scripts/*.test.mjs` using `node:test`.
- Use PTY smoke tests (`expect`/`script`) for fullscreen behavior, history, and real command execution.
- Run:
  ```bash
  cd go && make check
  pnpm test
  pnpm run lint:package
  ```

## Release Workflow

- `.github/workflows/ci.yml` runs launcher tests and Go tests/builds.
- `.github/workflows/npm.yml` builds native binaries, creates `SHA256SUMS`, uploads release assets, then publishes the optional platform packages and top-level npm package.
- Platform package names are `qpq-linux-x64`, `qpq-linux-arm64`, `qpq-linux-armv7`, `qpq-darwin-x64`, and `qpq-darwin-arm64`.
- Linux platform packages declare `os: ["linux", "android"]` so Termux installs them. The top-level package includes `android` in `os`.
- The npm package runs no install script. `qpq.sh` resolves the installed `qpq-<platform>` package at launch, so npm 12's default blocking of dependency install scripts does not break installs.
- Windows users install the release `.exe` directly. ARMv6 Raspberry Pi users also use release binaries.

---

Keep changes consistent with the native-only architecture. If a feature needs to be added, add it to Go and cover it with a Go test.
