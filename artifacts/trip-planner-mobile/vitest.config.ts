import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      'react-native': 'react-native-web',
    },
  },
  // Rutas absolutas: funciona igual desde la raíz del monorepo o desde esta carpeta.
  root: __dirname,
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.integration.test.tsx', '**/*.spec.ts'],
    exclude: ['**/node_modules/**'],
    setupFiles: [path.resolve(__dirname, 'test/setup.ts')],
  },
});