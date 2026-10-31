import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emitCommand } from './commandOutput.js';

describe('emitCommand', () => {
  let testDir: string;
  const originalCommandFile = process.env.QPQ_COMMAND_FILE;

  beforeEach(async () => {
    testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'qpq-output-'));
    delete process.env.QPQ_COMMAND_FILE;
  });

  afterEach(async () => {
    if (originalCommandFile === undefined) {
      delete process.env.QPQ_COMMAND_FILE;
    } else {
      process.env.QPQ_COMMAND_FILE = originalCommandFile;
    }

    vi.restoreAllMocks();
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  it('writes the command to QPQ_COMMAND_FILE when set', () => {
    const outputPath = path.join(testDir, 'command');
    process.env.QPQ_COMMAND_FILE = outputPath;
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    emitCommand('echo one\necho two');

    expect(fs.readFileSync(outputPath, 'utf-8')).toBe('echo one\necho two');
    expect(stderrWrite).not.toHaveBeenCalled();
  });

  it('falls back to the marker protocol without QPQ_COMMAND_FILE', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    emitCommand('echo hello');

    expect(stderrWrite).toHaveBeenCalledWith('__QEXEC__ echo hello\n');
  });

  it('falls back to the marker protocol when the command file cannot be written', () => {
    process.env.QPQ_COMMAND_FILE = path.join(testDir, 'missing', 'command');
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    emitCommand('echo hello');

    expect(stderrWrite).toHaveBeenCalledWith('__QEXEC__ echo hello\n');
  });
});
