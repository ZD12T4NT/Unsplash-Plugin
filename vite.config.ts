import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true, // clears dist before building
    rollupOptions: {
      input: 'src/widget.tsx', // your entry file
      output: {
        entryFileNames: 'widget.js',
        format: 'iife',         // immediately-invoked function expression
        name: 'VennWidget',     // global variable name on window
      },
    },
  },
})
