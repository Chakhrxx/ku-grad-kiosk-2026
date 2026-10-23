import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const host = '172.20.10.7'
const backend = `http://${host}:8000`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // The backend owns /assets (gowns, backgrounds), so the build's own files go elsewhere
    assetsDir: 'static',
  },
  server: {
    host,
    proxy: { '/api': backend, '/assets': backend, '/photos': backend, '/p/': backend },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
