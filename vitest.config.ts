import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    globals: true,
    alias: {
      '.js': '.ts',
    },
  },
  esbuild: {
    target: 'node20',
  },
});
