# AGENTS.md

This file provides coding conventions and development guidelines for agentic coding agents working on this repository.

## Project Overview

qpq is a terminal command launcher written in Go with Bubble Tea. The native implementation lives in `go/` and is the only runtime. The npm package contains a small POSIX launcher (`qpq.sh`) that resolves the native binary at run time; it runs no install script and ships no postinstall file. Resolution order is `$QPQ_NATIVE_BIN`, `bin/qpq-native`, a sibling or nested `qpq-<platform>` package, then any installed `qpq-*` package.

Do not reintroduce the previous TypeScript/Ink runtime. The final Node implementation is preserved at the `node-final` tag.

## Build & Development Commands

Go is the primary implementation. The repository uses pnpm for npm packaging, launcher/packaging tests, publint, and the husky hooks.

```bash
cd go
make check       # gofmt check + go vet + go test
make build       # build ./qpq
make cross       # build all release targets
make install     # install to ~/.local/bin/qpq
```

Launcher/package tests:

```bash
pnpm install
pnpm test        # node:test launcher and packaging tests
pnpm run lint:package
```

**Hooks:**
The husky pre-commit hook runs the Node launcher/packaging tests, `gofmt -l`, `go vet`, and `go test`. The pre-push hook also runs `make build`.

**Build Output:**
- `go/qpq` is the local binary (ignored)
- `go/dist/qpq-*` are release binaries (ignored)
- `build/npm-packages/` is staged npm output (ignored)
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
├── pty_test.go     # PTY-level tests (build tag !windows)
├── screens_test.go # Screen scenarios, goldens, docs screenshots
├── demo_test.go    # Generates docs/demo.gif
├── testdata/screens/*.golden
├── internal/termframe/ # Terminal replay + SVG rendering
└── *_test.go       # Go tests

docs/               # Generated documentation assets
├── demo.gif
└── screenshots/*.svg

scripts/            # npm packaging tooling
├── package.test.mjs # Root/staged package guard tests
├── publish-npm.mjs  # Stages and publishes platform packages + qpq
├── trust-platform-packages.sh
└── wrapper.test.mjs # Launcher resolution tests

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

- Menu: favorites first in command order, then non-favorites by recency, then never-used commands alphabetically.
- Search: recent results first, then remaining commands. Match name, command text, description, tags, and aliases.
- Key routing is implemented in `model.go` screen update methods. Text fields explicitly handle `Ctrl+U`; check how Bubble Tea stringifies other Ctrl combinations (for example `Ctrl+D` is `ctrl+d`) before adding new bindings.
- Text fields support cursor movement, backspace, delete, home/end, spaces, and multi-rune input.
- Template placeholders support `{name}` and `{name:index}`.
- Command execution happens after Bubble Tea restores the terminal. Use `$SHELL` when it is set and executable, otherwise `sh -c` on POSIX; use PowerShell on Windows.

## Testing

- Add pure Go tests for config, ordering, search, forms, templates, and history parsing.
- Add model tests for screen transitions and mutations.
- Keep launcher and packaging tests in `scripts/*.test.mjs` using `node:test`.
- Terminal-level tests live in `go/pty_test.go` (build tag `!windows`). They run the real binary in a PTY via `creack/pty`, answer the startup terminal queries the way a terminal would, send raw keystrokes, and cover menu startup, arrow navigation, search, template entry, command execution, and alternate-screen restore. When adding a key-driven test, wait for the screen that consumes each key before sending the next one; Bubble Tea can coalesce fast writes into one multi-rune key message.
- Screen scenarios live in `go/screens_test.go`. They replay the real binary through `internal/termframe` and compare plain-text frames against `go/testdata/screens/*.golden`, so layout and content changes show up as reviewable diffs. The same scenarios generate `docs/screenshots/*.svg` for the README; never hand-edit those images. Refresh with `go test -run TestPTYScreens -update` (goldens) and `go test -run TestPTYScreens -update-screens` (screenshots).
- `go/demo_test.go` generates `docs/demo.gif`. It drives a scripted PTY session, renders each frame with a bitmap font, draws the on-screen keyboard, and highlights the key pressed for that step. `internal/termframe` tracks the alternate screen, so the final frame shows the command output after the TUI exits. Regenerate with `go test -run TestGenerateDemo -update-demo`. The GIF is a documentation artifact and is not asserted in CI.
- Run:
  ```bash
  cd go && make check
  pnpm test
  pnpm run lint:package
  ```

## Release Workflow

- `release-please` owns version bumps and `CHANGELOG.md` updates. `release-please-config.json` uses `bump-minor-pre-major: true`, and `.release-please-manifest.json` is the version baseline; do not edit the version by hand.
- `.github/workflows/ci.yml` runs three jobs: `package` (launcher/packaging tests and publint), `go` (gofmt, vet, test, cross-build, and npm staging), and `npm12` (installs packed tarballs with npm 12 and runs `qpq --version`).
- `.github/workflows/npm.yml` runs release-please, builds native binaries, creates `SHA256SUMS`, uploads release assets, then publishes the optional platform packages and top-level npm package through `scripts/publish-npm.mjs` with OIDC trusted publishing.
- Platform package names are `qpq-linux-x64`, `qpq-linux-arm64`, `qpq-linux-armv7`, `qpq-darwin-x64`, and `qpq-darwin-arm64`. The `qpq-linux-x64` package contains the `qpq-linux-amd64` binary, and `qpq-android-arm64` is a copy of `qpq-linux-arm64`.
- Linux platform packages declare `os: ["linux", "android"]` so Termux installs them. The top-level package includes `android` in `os` and excludes `win32`.
- The npm package runs no install script or postinstall step. `qpq.sh` resolves the installed `qpq-<platform>` package at launch, so npm 12's default blocking of dependency install scripts does not break installs.
- Windows users install the release `.exe` directly. ARMv6 Raspberry Pi users also use release binaries.

---

Keep changes consistent with the native-only architecture. If a feature needs to be added, add it to Go and cover it with a Go test.
