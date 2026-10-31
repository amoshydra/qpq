import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryScript = fileURLToPath(new URL('../qpq.sh', import.meta.url));
const isWindows = process.platform === 'win32';

function createFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'qpq-wrapper-'));
  const script = path.join(directory, 'qpq.sh');
  fs.copyFileSync(repositoryScript, script);
  fs.chmodSync(script, 0o755);
  return { directory, script };
}

test('prefers the bundled native binary', { skip: isWindows }, () => {
  const fixture = createFixture();

  try {
    const binDirectory = path.join(fixture.directory, 'bin');
    const nativeBinary = path.join(binDirectory, 'qpq-native');
    fs.mkdirSync(binDirectory);
    fs.writeFileSync(nativeBinary, '#!/bin/sh\nprintf "native %s\\n" "$*"\n');
    fs.chmodSync(nativeBinary, 0o755);

    const result = spawnSync('sh', [fixture.script, '--version'], { encoding: 'utf-8' });

    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'native --version\n');
  } finally {
    fs.rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test('fails clearly when the native binary is missing', { skip: isWindows }, () => {
  const fixture = createFixture();

  try {
    const result = spawnSync('sh', [fixture.script], { encoding: 'utf-8' });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /native binary not found/);
  } finally {
    fs.rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test('resolves symlinked entry points', { skip: isWindows }, () => {
  const fixture = createFixture();

  try {
    const binDirectory = path.join(fixture.directory, 'bin');
    const nativeBinary = path.join(binDirectory, 'qpq-native');
    fs.mkdirSync(binDirectory);
    fs.writeFileSync(nativeBinary, '#!/bin/sh\nprintf "linked %s\\n" "$*"\n');
    fs.chmodSync(nativeBinary, 0o755);

    const link = path.join(fixture.directory, 'qpq-link');
    fs.symlinkSync(fixture.script, link);

    const result = spawnSync(link, ['--paths'], { encoding: 'utf-8' });

    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'linked --paths\n');
  } finally {
    fs.rmSync(fixture.directory, { recursive: true, force: true });
  }
});
