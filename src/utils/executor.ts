import { execSync, spawn } from 'child_process';
import process from 'process';

export function executeCommand(command: string): void {
  const result = spawn(command, [], {
    shell: true,
    stdio: 'inherit',
    detached: false,
  });

  result.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  result.on('error', (error) => {
    console.error('Command failed:', error);
    process.exit(1);
  });
}