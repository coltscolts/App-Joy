import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  root: import.meta.dirname,
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
