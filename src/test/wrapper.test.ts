import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const repositoryScript = fileURLToPath(new URL('../../qpq.sh', import.meta.url));

const STUB = `
const fs = require('fs');
const outputFile = process.env.QPQ_COMMAND_FILE;
const args = process.argv.slice(2);

if (args.includes('--fail')) {
  process.stderr.write('stub failure\\n');
  process.exit(2);
}

if (args.includes('--marker')) {
  process.stderr.write('__QEXEC__ echo marker-ok\\n');
  process.exit(0);
}

let command = ${JSON.stringify('echo wrapper-one\necho wrapper-two')};

if (args.includes('--exit-7')) {
  command = ${JSON.stringify('exit 7')};
}

if (args.includes('--quoted')) {
  command = ${JSON.stringify('printf "%s\\n" "hello world"')};
}

if (outputFile) {
  fs.writeFileSync(outputFile, command);
}
`;

const describePosix = process.platform === 'win32' ? describe.skip : describe;

describePosix('qpq.sh wrapper', () => {
  let testDir: string;
  let scriptPath: string;

  beforeEach(async () => {
    testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'qpq-wrapper-'));
    scriptPath = path.join(testDir, 'qpq.sh');
    await fs.promises.copyFile(repositoryScript, scriptPath);
    await fs.promises.chmod(scriptPath, 0o755);
    await fs.promises.mkdir(path.join(testDir, 'dist'));
    await fs.promises.writeFile(path.join(testDir, 'dist', 'index.js'), STUB);
  });

  afterEach(async () => {
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  function run(executable: string, args: string[] = []) {
    return spawnSync(executable, args, { encoding: 'utf-8' });
  }

  it('evaluates multi-line commands written to the command file', () => {
    const result = run('sh', [scriptPath]);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('wrapper-one\nwrapper-two\n');
  });

  it('evaluates commands with quoted arguments', () => {
    const result = run('sh', [scriptPath, '--quoted']);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('hello world\n');
  });

  it('propagates the selected command exit status', () => {
    const result = run('sh', [scriptPath, '--exit-7']);

    expect(result.status).toBe(7);
  });

  it('passes app errors through and propagates the app exit status', () => {
    const result = run('sh', [scriptPath, '--fail']);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('stub failure');
  });

  it('supports the legacy stderr marker fallback', () => {
    const result = run('sh', [scriptPath, '--marker']);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('marker-ok\n');
  });

  it('resolves symlinked entry points', async () => {
    const binDir = path.join(testDir, 'bin');
    const linkPath = path.join(binDir, 'qpq');
    await fs.promises.mkdir(binDir);
    await fs.promises.symlink(scriptPath, linkPath);

    const result = run(linkPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('wrapper-one\nwrapper-two\n');
  });
});
