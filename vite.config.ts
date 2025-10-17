import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public',   // put your built widget.js in public/
    emptyOutDir: true,     // clears public before building
    rollupOptions: {
      input: 'src/widget.tsx',
      output: {
        entryFileNames: 'widget.js',
        format: 'iife',     // immediately-invoked function expression
        name: 'VennWidget', // global variable name
      },
    },
  },
})
