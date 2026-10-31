import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

const distDir = 'dist';

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

await build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: path.join(distDir, 'index.js'),
  format: 'esm',
  minify: false,
  treeShaking: true,
  packages: 'external',
});

if (process.platform !== 'win32') {
  fs.chmodSync(path.join(distDir, 'index.js'), 0o755);
}

console.log('Build complete!');
