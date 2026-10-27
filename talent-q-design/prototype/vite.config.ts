import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@contracts': fileURLToPath(new URL('../contracts', import.meta.url)) } },
  server: { fs: { allow: ['..'] } },
});
