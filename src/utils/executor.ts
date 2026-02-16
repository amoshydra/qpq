import { execSync, spawn } from 'child_process';
import process from 'process';

export function executeCommand(command: string): void {
  const result = spawn(command, [], {
    shell: true,
    stdio: 'inherit',
    detached: true,
  });

  result.unref();
}