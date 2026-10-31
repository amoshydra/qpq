import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryScript = fileURLToPath(new URL('./postinstall.mjs', import.meta.url));
const isWindows = process.platform === 'win32';

const asset = (() => {
  switch (`${process.platform}-${process.arch}`) {
    case 'linux-x64':
      return 'qpq-linux-amd64';
    case 'linux-arm64':
      return 'qpq-linux-arm64';
    case 'linux-arm':
      return 'qpq-linux-armv7';
    case 'darwin-x64':
      return 'qpq-darwin-amd64';
    case 'darwin-arm64':
      return 'qpq-darwin-arm64';
    default:
      return null;
  }
})();

function runPostinstall(directory, releaseBase) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['scripts/postinstall.mjs'], {
      cwd: directory,
      env: {
        ...process.env,
        QPQ_RELEASE_BASE: releaseBase,
        QPQ_SKIP_NATIVE_DOWNLOAD: '',
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

test('downloads and verifies the platform binary', { skip: isWindows || !asset }, async () => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'qpq-postinstall-'));
  let server = null;

  try {
    await fs.promises.mkdir(path.join(directory, 'scripts'));
    await fs.promises.writeFile(
      path.join(directory, 'package.json'),
      JSON.stringify({ version: '1.0.0' }),
    );
    await fs.promises.copyFile(repositoryScript, path.join(directory, 'scripts', 'postinstall.mjs'));

    const binary = Buffer.from('#!/bin/sh\necho native-stub\n');
    const checksum = createHash('sha256').update(binary).digest('hex');

    server = http.createServer((request, response) => {
      if (request.url === '/SHA256SUMS') {
        response.writeHead(200, { 'content-type': 'text/plain' });
        response.end(`${checksum}  ${asset}\n`);
        return;
      }

      if (request.url === `/${asset}`) {
        response.writeHead(200, { 'content-type': 'application/octet-stream' });
        response.end(binary);
        return;
      }

      response.writeHead(404);
      response.end('not found');
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();

    assert.ok(address && typeof address !== 'string');
    const result = await runPostinstall(directory, `http://127.0.0.1:${address.port}`);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /installed native binary/);

    const installed = await fs.promises.readFile(path.join(directory, 'bin', 'qpq-native'));
    assert.deepEqual(installed, binary);

    const stat = await fs.promises.stat(path.join(directory, 'bin', 'qpq-native'));
    assert.notEqual(stat.mode & 0o111, 0);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await fs.promises.rm(directory, { recursive: true, force: true });
  }
});

test('fails when the checksum does not match', { skip: isWindows || !asset }, async () => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'qpq-postinstall-bad-'));
  let server = null;

  try {
    await fs.promises.mkdir(path.join(directory, 'scripts'));
    await fs.promises.writeFile(
      path.join(directory, 'package.json'),
      JSON.stringify({ version: '1.0.0' }),
    );
    await fs.promises.copyFile(repositoryScript, path.join(directory, 'scripts', 'postinstall.mjs'));

    const binary = Buffer.from('not the expected binary');

    server = http.createServer((request, response) => {
      if (request.url === '/SHA256SUMS') {
        response.writeHead(200, { 'content-type': 'text/plain' });
        response.end(`${'0'.repeat(64)}  ${asset}\n`);
        return;
      }

      if (request.url === `/${asset}`) {
        response.writeHead(200, { 'content-type': 'application/octet-stream' });
        response.end(binary);
        return;
      }

      response.writeHead(404);
      response.end('not found');
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();

    assert.ok(address && typeof address !== 'string');
    const result = await runPostinstall(directory, `http://127.0.0.1:${address.port}`);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /checksum mismatch/);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await fs.promises.rm(directory, { recursive: true, force: true });
  }
});
