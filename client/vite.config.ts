import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['@eai/database']
  },
  server: {
    port: 5173
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('pdf-lib') ||
              id.includes('@pdf-lib/fontkit')
            ) {
              return 'pdf-vendor'
            }
            if (id.includes('xlsx')) {
              return 'spreadsheet-vendor'
            }
            if (
              id.includes('@phosphor-icons') ||
              id.includes('phosphor-react') ||
              id.includes('lucide-react')
            ) {
              return 'icons-vendor'
            }
            if (id.includes('date-fns')) {
              return 'date-vendor'
            }
            if (
              id.includes('react') ||
              id.includes('scheduler') ||
              id.includes('react-router') ||
              id.includes('@remix-run/router')
            ) {
              return 'react-vendor'
            }
            if (
              id.includes('@radix-ui') ||
              id.includes('@headlessui') ||
              id.includes('framer-motion') ||
              id.includes('zustand')
            ) {
              return 'ui-vendor'
            }
            if (id.includes('axios')) {
              return 'network-vendor'
            }
            return 'misc-vendor'
          }
        }
      }
    }
  }
})
