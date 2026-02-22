#!/usr/bin/env node

import fs from 'fs';
import { render } from 'ink';
import os from 'os';
import path from 'path';
import { App } from './components/App.js';
import FullScreen from './utils/fullscreen.js';
import { getDefaultConfigPath } from './utils/config.js';

// Parse command line arguments
const args = process.argv.slice(2);
const versionFlag = args.includes('--version') || args.includes('-v');
const pathsFlag = args.includes('--paths');

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