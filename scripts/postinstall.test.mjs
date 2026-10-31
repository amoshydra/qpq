import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryScript = fileURLToPath(new URL('./postinstall.mjs', import.meta.url));
const isWindows = process.platform === 'win32';

const packageName = (() => {
  switch (`${process.platform}-${process.arch}`) {
    case 'linux-x64':
      return 'qpq-linux-x64';
    case 'linux-arm64':
      return 'qpq-linux-arm64';
    case 'linux-arm':
      return 'qpq-linux-armv7';
    case 'darwin-x64':
      return 'qpq-darwin-x64';
    case 'darwin-arm64':
      return 'qpq-darwin-arm64';
    default:
      return null;
  }
})();

function createFixture({ includeOptionalPackage }) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'qpq-postinstall-'));
  fs.mkdirSync(path.join(directory, 'scripts'));
  fs.copyFileSync(repositoryScript, path.join(directory, 'scripts', 'postinstall.mjs'));
  fs.writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({
      version: '1.0.0',
      optionalDependencies: packageName ? { [packageName]: '1.0.0' } : {},
    }),
  );

  if (includeOptionalPackage && packageName) {
    const packageDirectory = path.join(directory, 'node_modules', packageName);
    fs.mkdirSync(path.join(packageDirectory, 'bin'), { recursive: true });
    fs.writeFileSync(
      path.join(packageDirectory, 'package.json'),
      JSON.stringify({ name: packageName, version: '1.0.0' }),
    );
    const binary = path.join(packageDirectory, 'bin', 'qpq');
    fs.writeFileSync(binary, '#!/bin/sh\nexit 0\n');
    fs.chmodSync(binary, 0o755);
  }

  return directory;
}

function runPostinstall(directory, environment = {}) {
  return spawnSync(process.execPath, ['scripts/postinstall.mjs'], {
    cwd: directory,
    encoding: 'utf-8',
    env: {
      ...process.env,
      QPQ_SKIP_NATIVE_INSTALL: '',
      QPQ_DISABLE_NPM_FALLBACK: '1',
      ...environment,
    },
  });
}

test('copies the matching optional package binary', { skip: isWindows || !packageName }, () => {
  const directory = createFixture({ includeOptionalPackage: true });

  try {
    const result = runPostinstall(directory);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /installed native binary/);

    const target = path.join(directory, 'bin', 'qpq-native');
    assert.ok(fs.existsSync(target));
    const stat = fs.statSync(target);
    assert.notEqual(stat.mode & 0o111, 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('fails clearly when the optional package is missing', { skip: isWindows || !packageName }, () => {
  const directory = createFixture({ includeOptionalPackage: false });

  try {
    const result = runPostinstall(directory);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /could not install the native binary/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
