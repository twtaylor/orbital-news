import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  base: mode === 'production' ? '/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    minify: mode === 'production',
    target: 'es2015',
  },
}))
