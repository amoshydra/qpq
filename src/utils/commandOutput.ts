import * as fs from 'fs';

const COMMAND_MARKER = '__QEXEC__';

export function emitCommand(command: string): void {
  const outputPath = process.env.QPQ_COMMAND_FILE;

  if (outputPath) {
    try {
      fs.writeFileSync(outputPath, command, 'utf-8');
      return;
    } catch {
      // Fall back to the marker protocol if the wrapper's file is unavailable.
    }
  }

  process.stderr.write(`${COMMAND_MARKER} ${command}\n`);
}
