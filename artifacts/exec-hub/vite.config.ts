import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const port = Number(process.env.PORT || '5174');
// En producción la API la sirve bajo /oficina/ (ver api-server/src/app.ts).
const basePath = process.env.BASE_PATH || '/oficina/';
const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:8080';

export default defineConfig({
  base: basePath,
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: { '/api': { target: apiProxyTarget, changeOrigin: true } },
  },
  preview: { port, host: '0.0.0.0', allowedHosts: true },
});
