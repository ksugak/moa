import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = import.meta.dirname;

export default defineConfig({
  // Relative paths so the built site works anywhere (its own domain, a GitHub Pages
  // sub-folder, or a folder dragged onto a hosting service).
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        issue: resolve(root, 'issue/index.html'),
        mirror: resolve(root, 'mirror/index.html'),
        deal: resolve(root, 'deal/index.html'),
        my: resolve(root, 'my/index.html'),
      },
    },
  },
});
