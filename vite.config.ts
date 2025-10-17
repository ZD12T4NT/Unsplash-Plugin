import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'public',        // stay inside the project
    emptyOutDir: true,       // clears before building
    rollupOptions: {
      input: 'src/widget.tsx',
      output: {
        entryFileNames: 'widget.js',
        format: 'iife',
        name: 'VennWidget',
      },
    },
  },
});
