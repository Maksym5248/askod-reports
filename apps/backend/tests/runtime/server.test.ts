import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { expect, it } from 'vitest';
import { startBackend } from '../../src/index';

it('releases resources after failed bind and closes idempotently', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'askod-lifecycle-'));
  const blocker = createServer();
  await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve));
  const address = blocker.address();
  if (!address || typeof address === 'string') throw new Error('Expected port');
  const options = {
    port: address.port,
    databaseUrl: `file:${join(directory, 'test.db')}`,
    schemaPath: resolve(
      __dirname,
      '../../../../apps/backend/prisma/schema.prisma',
    ),
  };
  let api: Awaited<ReturnType<typeof startBackend>> | undefined;
  try {
    await expect(startBackend(options)).rejects.toMatchObject({
      code: 'EADDRINUSE',
    });
    await new Promise<void>((resolve) => blocker.close(() => resolve()));
    api = await startBackend(options);
    expect((await fetch(`${api.url}/api/workspace`)).status).toBe(200);
    await Promise.all([api.close(), api.close()]);
    await expect(fetch(`${api.url}/api/workspace`)).rejects.toThrow();
  } finally {
    if (blocker.listening) blocker.close();
    await api?.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
