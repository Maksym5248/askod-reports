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

it('backfills dates from legacy import history without counting unchanged imports', async () => {
  const { cp, mkdir } = await import('node:fs/promises');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { createRequire } = await import('node:module');
  const directory = await mkdtemp(join(tmpdir(), 'askod-legacy-'));
  const schemaRoot = fileURLToPath(new URL('../../prisma/', import.meta.url));
  const databaseUrl = `file:${join(directory, 'legacy.db')}`;
  const client = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  let api: Awaited<ReturnType<typeof startBackend>> | undefined;
  try {
    await mkdir(join(directory, 'migrations'));
    await cp(
      join(schemaRoot, 'schema.prisma'),
      join(directory, 'schema.prisma'),
    );
    for (const name of [
      '20260915000000_initial',
      '20260915120000_journal_import',
      'migration_lock.toml',
    ])
      await cp(
        join(schemaRoot, 'migrations', name),
        join(directory, 'migrations', name),
        { recursive: true },
      );
    await client.$connect();
    await promisify(execFile)(
      process.execPath,
      [
        createRequire(import.meta.url).resolve('prisma/build/index.js'),
        'migrate',
        'deploy',
        '--schema',
        join(directory, 'schema.prisma'),
      ],
      { env: { ...process.env, DATABASE_URL: databaseUrl } },
    );
    await client.$executeRaw`INSERT INTO Document (id, registrationNumber, registrationYear, title, registeredAt) VALUES ('legacy', 'OLD-1', 2026, 'Legacy', '2026-01-01T00:00:00.000Z')`;
    for (const [id, date, outcome] of [
      ['one', '2026-01-02T00:00:00.000Z', 'created'],
      ['two', '2026-02-02T00:00:00.000Z', 'updated'],
      ['three', '2026-03-02T00:00:00.000Z', 'unchanged'],
    ] as const) {
      await client.$executeRaw`INSERT INTO Import (id, fileName, fileHash, sheetName, importedAt, totalRows, created, updated, unchanged) VALUES (${id}, 'fixture.xlsx', 'hash', 'Sheet', ${date}, 1, 0, 0, 0)`;
      await client.$executeRaw`INSERT INTO ImportRow (id, importId, documentId, rowNumber, outcome, raw, snapshot) VALUES (${id}, ${id}, 'legacy', 2, ${outcome}, '{}', '{}')`;
    }
    await client.$disconnect();
    api = await startBackend({
      databaseUrl,
      schemaPath: join(schemaRoot, 'schema.prisma'),
    });
    const document = await client.document.findUniqueOrThrow({
      where: { id: 'legacy' },
    });
    expect(document.createdAt.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(document.updatedAt.toISOString()).toBe('2026-02-02T00:00:00.000Z');
    expect(document.version).toBe(1);
    expect(await client.importRow.count()).toBe(3);
  } finally {
    await client.$disconnect();
    await api?.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
