import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => ({
  plugins: [react()], resolve: { dedupe: ['react', 'react-dom'], alias: { events: 'events/' } },
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    proxy: { '/api': process.env.VITE_API_TARGET || loadEnv(mode, process.cwd(), 'VITE_').VITE_API_TARGET || 'http://127.0.0.1:5005' }
  },
  preview: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true
  }
}));
