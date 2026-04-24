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
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/forms-download': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/prod-api': {
        target: 'https://eastafricanip.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/prod-api/, '/api'),
      },
    }
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Keep only selective heavy-library chunks.
          // Do not force React (or a catch-all vendor chunk), which can create
          // circular chunk dependencies and runtime hook access failures.
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts')) return 'vendor-charts';
          if (id.includes('framer-motion')) return 'vendor-animation';
          if (id.includes('pdf-lib')) return 'vendor-pdf';
          if (id.includes('zustand')) return 'vendor-state';
          if (id.includes('swr')) return 'vendor-swr';
          if (id.includes('exceljs')) return 'vendor-excel';
          if (id.includes('axios')) return 'vendor-http';
          if (id.includes('sonner')) return 'vendor-toast';
          if (id.includes('zod')) return 'vendor-validation';
          if (id.includes('date-fns')) return 'vendor-date';
          if (id.includes('world-countries')) return 'vendor-countries';
        }
      }
    }
  }
})
