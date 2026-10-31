import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const packageJsonPath = path.join(rootDirectory, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const installScripts = ['preinstall', 'install', 'postinstall'];
const platformPackages = [
  'qpq-linux-x64',
  'qpq-linux-arm64',
  'qpq-linux-armv7',
  'qpq-darwin-x64',
  'qpq-darwin-arm64',
];
const releaseBinaries = [
  'qpq-linux-amd64',
  'qpq-linux-arm64',
  'qpq-linux-armv7',
  'qpq-darwin-amd64',
  'qpq-darwin-arm64',
];

test('ships no install scripts, so npm 12 can install without approving scripts', () => {
  for (const lifecycle of installScripts) {
    assert.equal(
      packageJson.scripts?.[lifecycle],
      undefined,
      `package.json must not define a ${lifecycle} script`,
    );
  }

  assert.deepEqual(packageJson.files, ['qpq.sh']);
});

test('stages a package with no install scripts or resolver', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'qpq-package-'));

  try {
    fs.mkdirSync(path.join(directory, 'scripts'));
    fs.mkdirSync(path.join(directory, 'go', 'dist'), { recursive: true });

    for (const file of ['package.json', 'qpq.sh', 'README.md', 'LICENSE']) {
      const source = path.join(rootDirectory, file);
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, path.join(directory, file));
      }
    }
    fs.copyFileSync(
      path.join(rootDirectory, 'scripts', 'publish-npm.mjs'),
      path.join(directory, 'scripts', 'publish-npm.mjs'),
    );
    for (const binary of releaseBinaries) {
      fs.writeFileSync(path.join(directory, 'go', 'dist', binary), '#!/bin/sh\nexit 0\n');
    }

    const result = spawnSync(process.execPath, ['scripts/publish-npm.mjs', '--prepare-only'], {
      cwd: directory,
      encoding: 'utf-8',
    });
    assert.equal(result.status, 0, result.stderr);

    const stagedDirectory = path.join(directory, 'build', 'npm-packages', 'qpq');
    const staged = JSON.parse(fs.readFileSync(path.join(stagedDirectory, 'package.json'), 'utf-8'));

    assert.equal(staged.scripts, undefined, 'staged package must not define lifecycle scripts');
    assert.deepEqual(staged.files, ['qpq.sh']);
    assert.deepEqual(Object.keys(staged.optionalDependencies).sort(), [...platformPackages].sort());
    assert.ok(
      !fs.existsSync(path.join(stagedDirectory, 'scripts')),
      'staged package must not contain a scripts directory',
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
