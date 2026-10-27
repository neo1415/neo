// Single-file build for the published direction review: one script, one stylesheet, fonts inlined.
import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config';

export default mergeConfig(base, defineConfig({
  build: { outDir: 'dist-review', cssCodeSplit: false, assetsInlineLimit: 100_000_000, rollupOptions: { output: { inlineDynamicImports: true } } },
}));
