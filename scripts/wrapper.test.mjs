import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryScript = fileURLToPath(new URL('../qpq.sh', import.meta.url));
const isWindows = process.platform === 'win32';

function platformPackage() {
  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? 'qpq-darwin-arm64' : 'qpq-darwin-x64';
  }
  if (process.platform === 'linux') {
    if (process.arch === 'x64') return 'qpq-linux-x64';
    if (process.arch === 'arm64') return 'qpq-linux-arm64';
    if (process.arch === 'arm') return 'qpq-linux-armv7';
  }
  return null;
}

// Mirrors an npm layout: <root>/qpq/qpq.sh next to <root>/qpq-<platform>/bin/qpq.
function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qpq-wrapper-'));
  const directory = path.join(root, 'qpq');
  fs.mkdirSync(directory);

  const script = path.join(directory, 'qpq.sh');
  fs.copyFileSync(repositoryScript, script);
  fs.chmodSync(script, 0o755);

  return { root, directory, script };
}

function writeBinary(file, label) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `#!/bin/sh\nprintf "${label} %s\\n" "$*"\n`);
  fs.chmodSync(file, 0o755);
}

function runScript(script, args = ['--version'], environment = {}) {
  return spawnSync('sh', [script, ...args], {
    encoding: 'utf-8',
    env: { ...process.env, QPQ_NATIVE_BIN: '', ...environment },
  });
}

test('prefers QPQ_NATIVE_BIN', { skip: isWindows }, () => {
  const fixture = createFixture();

  try {
    const override = path.join(fixture.root, 'override');
    writeBinary(override, 'override');

    const result = runScript(fixture.script, ['--version'], { QPQ_NATIVE_BIN: override });

    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'override --version\n');
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('prefers a binary placed in bin/qpq-native', { skip: isWindows }, () => {
  const fixture = createFixture();
  const package_ = platformPackage();

  try {
    writeBinary(path.join(fixture.directory, 'bin', 'qpq-native'), 'native');
    if (package_) {
      writeBinary(path.join(fixture.root, package_, 'bin', 'qpq'), 'platform');
    }

    const result = runScript(fixture.script);

    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'native --version\n');
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('resolves a sibling platform package when no postinstall ran', { skip: isWindows || !platformPackage() }, () => {
  const fixture = createFixture();
  const package_ = platformPackage();

  try {
    writeBinary(path.join(fixture.root, package_, 'bin', 'qpq'), 'platform');

    const result = runScript(fixture.script);

    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'platform --version\n');
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('resolves a nested platform package when no postinstall ran', { skip: isWindows || !platformPackage() }, () => {
  const fixture = createFixture();
  const package_ = platformPackage();

  try {
    writeBinary(path.join(fixture.directory, 'node_modules', package_, 'bin', 'qpq'), 'nested');

    const result = runScript(fixture.script);

    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'nested --version\n');
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('falls back to any installed platform package', { skip: isWindows }, () => {
  const fixture = createFixture();

  try {
    writeBinary(path.join(fixture.root, 'qpq-unknown-arch', 'bin', 'qpq'), 'fallback');

    const result = runScript(fixture.script);

    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'fallback --version\n');
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('fails clearly when the native binary is missing', { skip: isWindows }, () => {
  const fixture = createFixture();

  try {
    const result = runScript(fixture.script);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /native binary not found/);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('fails clearly when QPQ_NATIVE_BIN is not executable', { skip: isWindows }, () => {
  const fixture = createFixture();

  try {
    const result = runScript(fixture.script, [], {
      QPQ_NATIVE_BIN: path.join(fixture.root, 'missing'),
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /QPQ_NATIVE_BIN is not executable/);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('resolves symlinked entry points', { skip: isWindows }, () => {
  const fixture = createFixture();

  try {
    writeBinary(path.join(fixture.directory, 'bin', 'qpq-native'), 'linked');

    const link = path.join(fixture.root, 'qpq-link');
    fs.symlinkSync(fixture.script, link);

    const result = runScript(link, ['--paths']);

    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'linked --paths\n');
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});
