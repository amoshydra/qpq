import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const rootDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDirectory, 'package.json'), 'utf-8'));

if (fs.existsSync(path.join(rootDirectory, '.git'))) {
  // Source checkout: use go/qpq or make install for development.
  process.exit(0);
}

if (process.env.QPQ_SKIP_NATIVE_INSTALL === '1') {
  console.warn('qpq: native installation skipped; qpq will not run until a native binary is installed');
  process.exit(0);
}

if (process.platform === 'win32') {
  console.error('qpq: npm installation is not supported on Windows; download qpq-windows-amd64.exe from GitHub Releases');
  process.exit(1);
}

function packageForPlatform() {
  const platform = process.platform === 'android' ? 'linux' : process.platform;
  const architecture = process.arch;

  if (platform === 'linux' && architecture === 'x64') return 'qpq-linux-x64';
  if (platform === 'linux' && architecture === 'arm64') return 'qpq-linux-arm64';
  if (platform === 'linux' && architecture === 'arm') return 'qpq-linux-armv7';
  if (platform === 'darwin' && architecture === 'x64') return 'qpq-darwin-x64';
  if (platform === 'darwin' && architecture === 'arm64') return 'qpq-darwin-arm64';
  return null;
}

const packageName = packageForPlatform();
if (!packageName) {
  console.error(`qpq: no native binary available for ${process.platform}/${process.arch}`);
  console.error('qpq: download a release binary from https://github.com/amoshydra/qpq/releases');
  process.exit(1);
}

const version = packageJson.optionalDependencies?.[packageName] ?? packageJson.version;
const targetBinary = path.join(rootDirectory, 'bin', 'qpq-native');
fs.mkdirSync(path.dirname(targetBinary), { recursive: true });

function copyBinary(source) {
  if (!fs.existsSync(source)) {
    throw new Error(`binary not found at ${source}`);
  }

  fs.mkdirSync(path.dirname(targetBinary), { recursive: true });
  if (fs.existsSync(targetBinary)) {
    fs.unlinkSync(targetBinary);
  }

  try {
    fs.linkSync(source, targetBinary);
  } catch {
    fs.copyFileSync(source, targetBinary);
  }
  fs.chmodSync(targetBinary, 0o755);
}

function verifyBinary() {
  const result = spawnSync(targetBinary, ['--version'], {
    encoding: 'utf-8',
    stdio: 'ignore',
    windowsHide: true,
  });
  return result.status === 0;
}

function installFromOptionalPackage() {
  const packageJsonPath = require.resolve(`${packageName}/package.json`);
  const binaryPath = path.join(path.dirname(packageJsonPath), 'bin', 'qpq');
  copyBinary(binaryPath);
  return verifyBinary();
}

function installFromNpmFallback() {
  if (process.env.QPQ_DISABLE_NPM_FALLBACK === '1') {
    return false;
  }

  const temporaryDirectory = fs.mkdtempSync(path.join(path.dirname(targetBinary), 'qpq-npm-'));
  try {
    const result = spawnSync(
      'npm',
      [
        'install',
        '--ignore-scripts',
        '--no-save',
        '--loglevel=error',
        '--prefix',
        temporaryDirectory,
        `${packageName}@${version}`,
      ],
      {
        stdio: 'inherit',
        windowsHide: true,
      },
    );

    if (result.status !== 0) {
      return false;
    }

    copyBinary(path.join(temporaryDirectory, 'node_modules', packageName, 'bin', 'qpq'));
    return verifyBinary();
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

try {
  if (!installFromOptionalPackage()) {
    throw new Error('optional package did not contain a working binary');
  }
  console.log(`qpq: installed native binary from ${packageName}`);
} catch (optionalError) {
  try {
    if (!installFromNpmFallback()) {
      throw new Error('npm fallback did not produce a working binary');
    }
    console.log(`qpq: installed native binary from ${packageName}`);
  } catch (fallbackError) {
    console.error(`qpq: could not install the native binary (${packageName}@${version})`);
    console.error(`qpq: optional package error: ${optionalError.message}`);
    console.error(`qpq: fallback error: ${fallbackError.message}`);
    console.error('qpq: download a release binary from https://github.com/amoshydra/qpq/releases');
    process.exit(1);
  }
}
