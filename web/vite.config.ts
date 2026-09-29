import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The dev server proxies API calls to the backend, so the browser sees a single origin (no CORS).
const apiTarget = 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': apiTarget,
      '/docs': apiTarget,
    },
  },
});
