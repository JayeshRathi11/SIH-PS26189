import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true, // needed for the /api/ws/case live-sync WebSocket to upgrade through this proxy
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});