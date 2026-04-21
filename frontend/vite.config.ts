import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Do NOT use singlefile plugin anymore — Django serves assets separately
  },

  server: {
    port: 5173,
    proxy: {
      // All API calls and auth forwarded to Django in development
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            // Django not running — return a clean 503 instead of crashing the proxy
            console.warn('[vite proxy] Django backend offline:', err.message)
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Backend offline' }))
            }
          })
        },
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Backend offline' }))
            }
          })
        },
      },
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})