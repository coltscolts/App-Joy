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
  test: {
    environment: 'node',
    globals: true,
    include: ['artifacts/trip-planner-mobile/**/*.integration.test.tsx'],
    setupFiles: ['artifacts/trip-planner-mobile/test/setup.ts'],
  },
});