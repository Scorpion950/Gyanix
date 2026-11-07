import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@gyanix/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if ((err as any).code === 'ECONNREFUSED') {
              if (res && 'writeHead' in res && !(res as any).headersSent) {
                (res as any).writeHead(503, { 'Content-Type': 'application/json' });
                (res as any).end(JSON.stringify({ success: false, error: 'API server starting up, retrying...' }));
              }
              return;
            }
            console.error('[vite proxy error]:', err.message);
          });
        },
      },
    },
  },
  build: {
    // Code splitting by route — keep main bundle under ~200KB gzipped
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'sonner'],
          'vendor-data': ['@tanstack/react-query', 'zustand', 'zod'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Report chunk sizes
    reportCompressedSize: true,
  },
  // Optimise dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
});
