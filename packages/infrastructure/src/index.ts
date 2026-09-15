import { PrismaClient } from '@prisma/client';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import type { DocumentRepository } from '@askod/application';

export async function connectDatabase(databaseUrl: string, schemaPath: string) {
  const require = createRequire(import.meta.url);
  // Opening the connection creates a fresh SQLite file before migrations.
  const client = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    await client.$connect();
    await promisify(execFile)(
      process.execPath,
      [
        require.resolve('prisma/build/index.js'),
        'migrate',
        'deploy',
        '--schema',
        schemaPath,
      ],
      {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          ELECTRON_RUN_AS_NODE: '1',
        },
        timeout: 60_000,
      },
    );
  } catch (error) {
    await client.$disconnect();
    throw error;
  }
  const documents: DocumentRepository = {
    count: () => client.document.count(),
  };
  return { documents, close: () => client.$disconnect() };
}
