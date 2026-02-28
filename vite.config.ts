import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3001,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false
        },
        "/ws": {
          target: "ws://127.0.0.1:8000",
          changeOrigin: true,
          ws: true
        },
        "/livekit": {
          target: "http://127.0.0.1:7880",
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/livekit/, ""),
        },
        "/avatar_output": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true
        }
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
