#!/usr/bin/env node

import { render } from 'ink';
import { App } from './components/App.js';
import FullScreen from './utils/fullscreen.js';

const program = render(
  <FullScreen>
    <App />
  </FullScreen>
);
await program.waitUntilExit();