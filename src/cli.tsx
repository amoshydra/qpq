#!/usr/bin/env node

import { render } from 'ink';
import { App } from './components/App.js';

const program = render(<App />);
await program.waitUntilExit();
