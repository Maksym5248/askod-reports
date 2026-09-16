import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { startBackend } from '../../src/index';

it('migrates a fresh SQLite database and retains documents across API restarts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'askod-test-'));
  const databaseUrl = `file:${join(directory, 'test.db')}`;
  const options = {
    databaseUrl,
    schemaPath: fileURLToPath(
      new URL('../../prisma/schema.prisma', import.meta.url),
    ),
  };
  let api: Awaited<ReturnType<typeof startBackend>> | undefined;
  const client = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    api = await startBackend(options);
    expect(await (await fetch(`${api.url}/api/workspace`)).json()).toEqual({
      documentCount: 0,
    });
    await client.document.create({
      data: {
        registrationNumber: 'TEST-1',
        registrationYear: 2026,
        title: 'Test document',
        registeredAt: new Date('2026-01-01'),
      },
    });
    await api.close();
    api = undefined;
    api = await startBackend(options);
    expect(await (await fetch(`${api.url}/api/workspace`)).json()).toEqual({
      documentCount: 1,
    });
  } finally {
    await client.$disconnect();
    await api?.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
