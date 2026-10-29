// Offline build: one classic script that runs from a double-clicked file (file://), where browsers refuse
// module scripts. Used for the downloadable review package; the normal build is vite.config.ts.
import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config';

export default mergeConfig(base, defineConfig({
  build: { modulePreload: false, cssCodeSplit: false, rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } } },
}));
