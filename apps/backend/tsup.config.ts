import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node24',
  outDir: 'dist',
  clean: true,
  noExternal: [/^@askod\//],
  external: ['express', 'zod', 'exceljs', 'yauzl', '@prisma/client'],
});
