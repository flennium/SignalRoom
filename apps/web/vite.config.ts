import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/ws': {
          target: 'ws://127.0.0.1:8080',
          ws: true,
        },
        '/health': 'http://127.0.0.1:8080',
      },
    },
  };
});
