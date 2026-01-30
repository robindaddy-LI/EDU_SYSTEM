
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  // 開發環境設定 (npm run dev 時生效)
  server: {
    proxy: {
      // 當在開發環境呼叫 /api 時，轉發到本機的後端測試伺服器
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
        // No rewrite - backend expects /api/v1 prefix
      }
    }
  }
});
