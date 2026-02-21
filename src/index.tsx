#!/usr/bin/env node

import fs from 'fs';
import { render } from 'ink';
import { App } from './components/App.js';
import FullScreen from './utils/fullscreen.js';

// Parse command line arguments
const args = process.argv.slice(2);
const versionFlag = args.includes('--version') || args.includes('-v');

if (versionFlag) {
  const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
  console.log(`qpq v${packageJson.version}`);
  process.exit(0);
}

const program = render(
  <FullScreen>
    <App />
  </FullScreen>
);
await program.waitUntilExit();