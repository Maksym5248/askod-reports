import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['apps/api/src/main.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'apps/api/dist',
  clean: true,
  noExternal: [/^@askod\//],
  external: ['express', 'zod', '@prisma/client'],
});
