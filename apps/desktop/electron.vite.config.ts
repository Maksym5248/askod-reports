import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    build: {
      externalizeDeps: false,
      rollupOptions: {
        input: resolve('electron/main.ts'),
        external: ['@prisma/client', 'express', 'zod', 'exceljs', 'yauzl'],
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve('electron/preload.ts'),
        output: { format: 'cjs', entryFileNames: 'preload.cjs' },
      },
    },
  },
  renderer: {
    root: 'renderer',
    plugins: [
      react(),
      {
        name: 'development-csp',
        apply: 'serve',
        transformIndexHtml(html) {
          // React Fast Refresh injects an inline preamble in development only.
          return html.replace(
            "script-src 'self';",
            "script-src 'self' 'unsafe-inline';",
          );
        },
      },
    ],
    build: {
      minify: true,
      rollupOptions: { input: resolve('renderer/index.html') },
    },
  },
});
