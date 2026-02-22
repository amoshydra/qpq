#!/usr/bin/env node

import fs from 'fs';
import { render } from 'ink';
import os from 'os';
import path from 'path';
import { App } from './components/App.js';
import FullScreen from './utils/fullscreen.js';
import { getDefaultConfigPath } from './utils/config.js';

const validFlags = ['--version', '-v', '--help', '-h', '--paths'];
const args = process.argv.slice(2);
const versionFlag = args.includes('--version') || args.includes('-v');
const helpFlag = args.includes('--help') || args.includes('-h');
const pathsFlag = args.includes('--paths');
const unknownArgs = args.filter((arg) => !validFlags.includes(arg));

function showHelp(): void {
  console.log(`Usage: qpq [options]

A TUI launcher for frequently used commands.

Run without arguments to launch the interactive menu.

Options:
  -v, --version    Show version number
  -h, --help       Show this help message
  --paths          Show configuration paths

For more information, visit: https://github.com/amoshydra/qpq`);
}

function showErrorAndHelp(invalidArgs: string[]): void {
  console.error(`Error: Unknown option(s): ${invalidArgs.join(', ')}\n`);
  showHelp();
  process.exit(1);
}

if (unknownArgs.length > 0) {
  showErrorAndHelp(unknownArgs);
}

if (helpFlag) {
  showHelp();
  process.exit(0);
}

if (versionFlag) {
  const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
  console.log(`qpq v${packageJson.version}`);
  process.exit(0);
}

if (pathsFlag) {
  const configPath = getDefaultConfigPath();

  console.log('Configuration paths:');
  console.log(`  Config directory: ${path.dirname(configPath)}`);
  console.log(`  Main config file: ${configPath}`);
  process.exit(0);
}

const program = render(
  <FullScreen>
    <App />
  </FullScreen>
);
await program.waitUntilExit();