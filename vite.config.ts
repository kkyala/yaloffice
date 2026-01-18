import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3001,
      host: '0.0.0.0',
      allowedHosts: ["demo.yalhire.ai", "lk.yalhire.ai", "stasia-mediastinal-fathomlessly.ngrok-free.dev", "unmerchantable-lorina-broodily.ngrok-free.dev", "ai-dream-machin", "100.78.55.80", "localhost", "ai-dream-machin.taild234f9.ts.net"],
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
          target: "http://localhost:8000",
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
