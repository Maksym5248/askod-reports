import { resolve } from 'node:path';
import { z } from 'zod';
import { backendOptionsSchema } from './backend-options';

// Called at startup, never when this module is imported. Environment is injectable in tests.
export function readEnvironment(env: NodeJS.ProcessEnv, workspaceRoot: string) {
  const dataDirectory = resolve(workspaceRoot, '.data');
  const port = z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .parse(env.PORT ?? 4310);
  return {
    dataDirectory: env.DATABASE_URL ? undefined : dataDirectory,
    options: backendOptionsSchema.parse({
      host: env.HOST ?? '127.0.0.1',
      port,
      databaseUrl:
        env.DATABASE_URL ?? `file:${resolve(dataDirectory, 'askod.db')}`,
      schemaPath: resolve(
        workspaceRoot,
        env.PRISMA_SCHEMA_PATH ?? 'apps/backend/prisma/schema.prisma',
      ),
      ...(env.API_TOKEN !== undefined ? { token: env.API_TOKEN } : {}),
      ...(env.ALLOWED_ORIGIN !== undefined
        ? { allowedOrigin: env.ALLOWED_ORIGIN }
        : {}),
    }),
  };
}
