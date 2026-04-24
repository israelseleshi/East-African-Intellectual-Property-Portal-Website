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
    }
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks for better caching
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('react-dom')) return 'vendor-react';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('lucide-react')) return 'vendor-icons-lucide';
            if (id.includes('@phosphor')) return 'vendor-icons-phosphor';
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
            return 'vendor-misc';
          }
          if (id.includes('fonts')) return 'fonts';
        }
      }
    }
  }
})
