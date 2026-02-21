#!/usr/bin/env node

import fs from 'fs';
import { render } from 'ink';
import os from 'os';
import path from 'path';
import { App } from './components/App.js';
import FullScreen from './utils/fullscreen.js';

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
  const platform = os.platform();
  const homeDir = os.homedir();
  const configDir = path.join(
    platform === 'win32' ? path.join(homeDir, 'AppData', 'Local', 'qpq') :
    platform === 'darwin' ? path.join(homeDir, 'Library', 'Application Support', 'qpq') :
    path.join(homeDir, '.local', 'state', 'qpq')
  );

  console.log('Configuration paths:');
  console.log(`  Config directory: ${configDir}`);
  console.log(`  Favorites file: ${path.join(configDir, 'favorites.json')}`);
  console.log(`  Recent commands file: ${path.join(configDir, 'recent.json')}`);
  console.log(`  Main config file: ${path.join(configDir, 'fav.json')}`);
  process.exit(0);
}

const program = render(
  <FullScreen>
    <App />
  </FullScreen>
);
await program.waitUntilExit();