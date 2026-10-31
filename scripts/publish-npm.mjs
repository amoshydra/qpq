import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rootPackage = JSON.parse(fs.readFileSync(path.join(rootDirectory, 'package.json'), 'utf-8'));
const stagingRoot = path.join(rootDirectory, 'build', 'npm-packages');
const generateBinaries = path.join(rootDirectory, 'go', 'dist');
const bootstrapVersion = '0.0.1';

const platformPackages = [
  {
    name: 'qpq-linux-x64',
    asset: 'qpq-linux-amd64',
    os: ['linux', 'android'],
    cpu: ['x64'],
  },
  {
    name: 'qpq-linux-arm64',
    asset: 'qpq-linux-arm64',
    os: ['linux', 'android'],
    cpu: ['arm64'],
  },
  {
    name: 'qpq-linux-armv7',
    asset: 'qpq-linux-armv7',
    os: ['linux', 'android'],
    cpu: ['arm'],
  },
  {
    name: 'qpq-darwin-x64',
    asset: 'qpq-darwin-amd64',
    os: ['darwin'],
    cpu: ['x64'],
  },
  {
    name: 'qpq-darwin-arm64',
    asset: 'qpq-darwin-arm64',
    os: ['darwin'],
    cpu: ['arm64'],
  },
];

function repositoryField() {
  return rootPackage.repository;
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function platformPackageJson(target, version) {
  return {
    name: target.name,
    version,
    description: `qpq native binary for ${target.os.join('/')} ${target.cpu.join('/')}`,
    repository: repositoryField(),
    homepage: rootPackage.homepage,
    license: rootPackage.license ?? 'MIT',
    os: target.os,
    cpu: target.cpu,
    files: ['bin'],
  };
}

function topLevelPackageJson(version) {
  return {
    name: rootPackage.name,
    version,
    description: rootPackage.description,
    repository: repositoryField(),
    homepage: rootPackage.homepage,
    bin: rootPackage.bin,
    os: rootPackage.os,
    engines: rootPackage.engines,
    license: rootPackage.license ?? 'MIT',
    keywords: rootPackage.keywords,
    files: rootPackage.files,
    scripts: {
      postinstall: 'node scripts/postinstall.mjs',
    },
    optionalDependencies: Object.fromEntries(
      platformPackages.map(target => [target.name, version]),
    ),
  };
}

function prepareReleasePackages() {
  fs.rmSync(stagingRoot, { recursive: true, force: true });
  fs.mkdirSync(stagingRoot, { recursive: true });

  for (const target of platformPackages) {
    const source = path.join(generateBinaries, target.asset);
    if (!fs.existsSync(source)) {
      throw new Error(`missing binary ${source}; run make -C go cross first`);
    }

    const directory = path.join(stagingRoot, target.name);
    writeJson(path.join(directory, 'package.json'), platformPackageJson(target, rootPackage.version));
    copyFile(source, path.join(directory, 'bin', 'qpq'));
    fs.chmodSync(path.join(directory, 'bin', 'qpq'), 0o755);
    if (fs.existsSync(path.join(rootDirectory, 'LICENSE'))) {
      copyFile(path.join(rootDirectory, 'LICENSE'), path.join(directory, 'LICENSE'));
    }
  }

  const qpqDirectory = path.join(stagingRoot, rootPackage.name);
  writeJson(path.join(qpqDirectory, 'package.json'), topLevelPackageJson(rootPackage.version));
  copyFile(path.join(rootDirectory, 'qpq.sh'), path.join(qpqDirectory, 'qpq.sh'));
  copyFile(
    path.join(rootDirectory, 'scripts', 'postinstall.mjs'),
    path.join(qpqDirectory, 'scripts', 'postinstall.mjs'),
  );
  if (fs.existsSync(path.join(rootDirectory, 'README.md'))) {
    copyFile(path.join(rootDirectory, 'README.md'), path.join(qpqDirectory, 'README.md'));
  }
  if (fs.existsSync(path.join(rootDirectory, 'LICENSE'))) {
    copyFile(path.join(rootDirectory, 'LICENSE'), path.join(qpqDirectory, 'LICENSE'));
  }
}

function prepareBootstrapPackages() {
  fs.rmSync(stagingRoot, { recursive: true, force: true });
  fs.mkdirSync(stagingRoot, { recursive: true });

  for (const target of platformPackages) {
    const directory = path.join(stagingRoot, target.name);
    writeJson(path.join(directory, 'package.json'), {
      ...platformPackageJson(target, bootstrapVersion),
      files: [],
    });
  }
}

function isPublished(name, version) {
  const result = spawnSync('npm', ['view', `${name}@${version}`, 'version', '--json'], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return result.status === 0 && result.stdout.trim() !== '';
}

function publishDirectory(directory, tag) {
  const args = ['publish', '--access', 'public'];
  if (tag) {
    args.push('--tag', tag);
  }

  const result = spawnSync('npm', args, {
    cwd: directory,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`npm publish failed in ${directory}`);
  }
}

function publishTarget(target, version, tag) {
  if (isPublished(target.name, version)) {
    console.log(`qpq: ${target.name}@${version} already published; skipping`);
    return;
  }
  publishDirectory(path.join(stagingRoot, target.name), tag);
}

function publishRelease() {
  prepareReleasePackages();

  for (const target of platformPackages) {
    publishTarget(target, rootPackage.version);
  }

  if (isPublished(rootPackage.name, rootPackage.version)) {
    console.log(`qpq: ${rootPackage.name}@${rootPackage.version} already published; skipping`);
    return;
  }
  publishDirectory(path.join(stagingRoot, rootPackage.name));
}

function bootstrap() {
  prepareBootstrapPackages();

  for (const target of platformPackages) {
    publishTarget(target, bootstrapVersion, 'bootstrap');
  }
}

const args = process.argv.slice(2);

try {
  if (args.includes('--bootstrap')) {
    bootstrap();
  } else if (args.includes('--prepare-only')) {
    prepareReleasePackages();
    console.log(`qpq: prepared npm packages in ${stagingRoot}`);
  } else {
    publishRelease();
  }
} catch (error) {
  console.error(`qpq: ${error.message}`);
  process.exit(1);
}
