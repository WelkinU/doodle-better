import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

// Read config.yaml for port settings
let backendPort = 8000;
let devPort = 5173;
try {
  const configPath = path.resolve(__dirname, '..', 'config.yaml');
  const raw = fs.readFileSync(configPath, 'utf-8');
  const cfg = parse(raw);
  backendPort = cfg?.server?.port ?? 8000;
  devPort = cfg?.frontend?.dev_port ?? 5173;
} catch {}

export default defineConfig({
  plugins: [react()],
  server: {
    port: devPort,
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
      '/health': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
