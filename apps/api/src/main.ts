import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { startApi } from './index';

await mkdir(resolve('.data'), { recursive: true });
const port = z.coerce
  .number()
  .int()
  .min(1)
  .max(65535)
  .parse(process.env.PORT ?? 4310);
const api = await startApi({
  port,
  databaseUrl: process.env.DATABASE_URL ?? `file:${resolve('.data/askod.db')}`,
  schemaPath: resolve('packages/infrastructure/prisma/schema.prisma'),
  ...(process.env.API_TOKEN ? { token: process.env.API_TOKEN } : {}),
  ...(process.env.ALLOWED_ORIGIN
    ? { allowedOrigin: process.env.ALLOWED_ORIGIN }
    : {}),
});
console.log(`ASKOD API: ${api.url}`);
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    void api.close().then(
      () => process.exit(0),
      (error) => {
        console.error(error);
        process.exit(1);
      },
    );
  });
