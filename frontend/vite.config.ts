import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  // IMPORTANT: match Django STATIC_URL
  base: '/static/',

  plugins: [
    tailwindcss(),
    react(),
  ],

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Django serves assets separately via WhiteNoise
  },

  server: {
    port: 5173,

    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.warn('[vite proxy] Django backend offline:', err.message)

            if (!res.headersSent) {
              res.writeHead(503, {
                'Content-Type': 'application/json'
              })

              res.end(
                JSON.stringify({
                  error: 'Backend offline'
                })
              )
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
              res.writeHead(503, {
                'Content-Type': 'application/json'
              })

              res.end(
                JSON.stringify({
                  error: 'Backend offline'
                })
              )
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