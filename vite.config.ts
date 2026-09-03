import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        worklet: resolve(__dirname, 'src/worklet/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'worklet') {
            return 'assets/modular-processor.js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
    target: 'esnext',
  },
});
