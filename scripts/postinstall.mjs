import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDirectory, 'package.json'), 'utf-8'));

if (fs.existsSync(path.join(rootDirectory, '.git'))) {
  // Source checkout: keep the Node fallback / local development setup.
  process.exit(0);
}

if (process.env.QPQ_SKIP_NATIVE_DOWNLOAD === '1') {
  console.warn('qpq: native download skipped; qpq will not run until a native binary is installed');
  process.exit(0);
}

if (process.platform === 'win32') {
  console.error('qpq: npm installation is not supported on Windows; download qpq-windows-amd64.exe from GitHub Releases');
  process.exit(1);
}

const assets = {
  'linux-x64': 'qpq-linux-amd64',
  'linux-arm64': 'qpq-linux-arm64',
  'linux-arm': 'qpq-linux-armv7',
  'darwin-x64': 'qpq-darwin-amd64',
  'darwin-arm64': 'qpq-darwin-arm64',
};

const asset = assets[`${process.platform}-${process.arch}`];
if (!asset) {
  console.error(`qpq: no native binary available for ${process.platform}/${process.arch}`);
  console.error('qpq: download a release binary from https://github.com/amoshydra/qpq/releases');
  process.exit(1);
}

const version = packageJson.version;
const releaseBase = process.env.QPQ_RELEASE_BASE
  ?? `https://github.com/amoshydra/qpq/releases/download/v${version}`;

async function fetchWithTimeout(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response;
}

async function downloadNativeBinary() {
  const checksumsResponse = await fetchWithTimeout(`${releaseBase}/SHA256SUMS`);
  const checksums = await checksumsResponse.text();
  const checksumLine = checksums
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.endsWith(`  ${asset}`) || line.endsWith(` *${asset}`));

  if (!checksumLine) {
    throw new Error(`checksum for ${asset} was not found`);
  }

  const expectedHash = checksumLine.split(/\s+/)[0];
  const binaryResponse = await fetchWithTimeout(`${releaseBase}/${asset}`);
  const binary = Buffer.from(await binaryResponse.arrayBuffer());
  const actualHash = createHash('sha256').update(binary).digest('hex');

  if (actualHash !== expectedHash) {
    throw new Error(`checksum mismatch for ${asset}`);
  }

  const binDirectory = path.join(rootDirectory, 'bin');
  const destination = path.join(binDirectory, 'qpq-native');
  fs.mkdirSync(binDirectory, { recursive: true });
  fs.writeFileSync(destination, binary, { mode: 0o755 });
  fs.chmodSync(destination, 0o755);
  console.log(`qpq: installed native binary (${asset})`);
}

try {
  await downloadNativeBinary();
} catch (error) {
  console.error(`qpq: could not install the native binary: ${error.message}`);
  console.error('qpq: download a release binary from https://github.com/amoshydra/qpq/releases');
  process.exit(1);
}
