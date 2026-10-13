import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2019',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      // 真身是 app.html；dist/index.html 由 public/index.html 原样拷入，
      // 作为内容永不改动的引导页，避免中间层把旧版首页缓存住。
      input: { app: resolve(__dirname, 'app.html') },
    },
  },
  server: { host: '0.0.0.0', allowedHosts: true as any },
  preview: { host: '0.0.0.0', allowedHosts: true as any },
})
