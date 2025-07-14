import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wasm', '**/*.worker.js'],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['pdfjs-dist'],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  worker: {
    format: 'es',
    plugins: []
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'pdfjs': ['pdfjs-dist']
        }
      }
    }
  }
});
