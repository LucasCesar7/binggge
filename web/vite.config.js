import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // <-- Chemins relatifs : marche sur localhost:3000 ET sur le serveur IUT
  build: {
    outDir: '../api/public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});