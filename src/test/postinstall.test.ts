import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const repositoryScript = fileURLToPath(new URL('../../scripts/postinstall.mjs', import.meta.url));
const describePosix = process.platform === 'win32' ? describe.skip : describe;

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

describePosix('postinstall', () => {
  let testDir: string | null = null;
  let server: http.Server | null = null;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server?.close(() => resolve()));
      server = null;
    }
    if (testDir) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
      testDir = null;
    }
  });

  it('downloads and verifies the platform binary', async () => {
    if (!asset) {
      return;
    }

    testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'qpq-postinstall-'));
    await fs.promises.mkdir(path.join(testDir, 'scripts'));
    await fs.promises.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({ version: '1.0.0' }),
    );
    await fs.promises.copyFile(repositoryScript, path.join(testDir, 'scripts', 'postinstall.mjs'));

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

    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('failed to start test server');
    }

    const directory = testDir;
    if (!directory) {
      throw new Error('test directory was not created');
    }

    const result = await new Promise<{ status: number | null; stdout: string; stderr: string }>(
      (resolve) => {
        const child = spawn(process.execPath, ['scripts/postinstall.mjs'], {
          cwd: directory,
          env: {
            ...process.env,
            QPQ_RELEASE_BASE: `http://127.0.0.1:${address.port}`,
            QPQ_SKIP_NATIVE_DOWNLOAD: '',
          },
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk: Buffer) => {
          stdout += String(chunk);
        });
        child.stderr.on('data', (chunk: Buffer) => {
          stderr += String(chunk);
        });
        child.on('close', (status: number | null) => resolve({ status, stdout, stderr }));
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('installed native binary');

    const installed = await fs.promises.readFile(path.join(directory, 'bin', 'qpq-native'));
    expect(installed).toEqual(binary);

    const mode = await fs.promises.stat(path.join(directory, 'bin', 'qpq-native'));
    expect(mode.mode & 0o111).not.toBe(0);
  });
});
