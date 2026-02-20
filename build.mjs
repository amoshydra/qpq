import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  minify: true,
  treeShaking: true,
  packages: 'external',
});

fs.chmodSync(path.join(distDir, 'index.js'), 0o755);

fs.copyFileSync('sample-commands.json', path.join(distDir, 'sample-commands.json'));

console.log('Build complete!');
