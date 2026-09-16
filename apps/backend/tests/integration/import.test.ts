import {
  documentsSchema,
  documentSchema,
  documentHistorySchema,
  importErrorResponseSchema,
} from '@askod/shared';
import { documentEnums } from '../../src/domain/documents/document-enums';
import { fileURLToPath } from 'node:url';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { startBackend } from '../../src/index';
import { ExcelJournalSource } from '../../src/infrastructure/index';
import { journalColumns } from '../../src/infrastructure/excel/journal-columns';
import { createPrismaJournalRepository } from '../../src/infrastructure/database/repositories/prisma-journal.repository';
import {
  documentIdentity,
  normalizeDocument,
  ImportValidationError,
} from '../../src/domain/index';

// Synthetic fixtures only: no personal data from the user's export enters the repository.
async function workbook(
  rows: Array<Record<string, ExcelJS.CellValue>>,
  options: {
    reverse?: boolean;
    date1904?: boolean;
    missingHeader?: boolean;
  } = {},
) {
  const book = new ExcelJS.Workbook();
  book.properties.date1904 = options.date1904 ?? false;
  const sheet = book.addWorksheet('Журнал');
  let columns = [...journalColumns];
  if (options.reverse) columns.reverse();
  if (options.missingHeader) columns = columns.slice(1);
  sheet.addRow(columns.map((column) => column.header));
  for (const [index, row] of rows.entries()) {
    const values: Record<string, ExcelJS.CellValue> = {
      sourceOrdinal: index + 1,
      registrationNumber: 'Т-001',
      registeredAt: new Date('2026-09-15T00:00:00Z'),
      title: 'Тестовий документ',
      organization: 'Тестова організація',
      folder: 'Звернення громадян',
      mobilePhone: '0012345678',
      pageCount: 0,
      ...row,
    };
    sheet.addRow(columns.map((column) => values[column.field] ?? null));
  }
  return new Uint8Array(await book.xlsx.writeBuffer());
}

const source = new ExcelJournalSource();
describe('Excel journal adapter', () => {
  it('maps all columns by header, keeps identifiers and normalizes dates and blanks', async () => {
    const parsed = await source.parse(await workbook([{}], { reverse: true }));
    const row = parsed.rows[0]!;
    const document = normalizeDocument(row);
    expect(Object.keys(row.raw)).toHaveLength(43);
    expect(document.registeredAt).toBe('2026-09-15');
    expect(document.mobilePhone).toBe('0012345678');
    expect(document.pageCount).toBe(0);
    expect(document.applicantCount).toBeNull();
  });
  it('accepts every approved enum value and rejects different spelling', async () => {
    for (const [field, values] of Object.entries(documentEnums)) {
      for (const value of values) {
        const parsed = await source.parse(await workbook([{ [field]: value }]));
        expect(normalizeDocument(parsed.rows[0]!)).toHaveProperty(field, value);
      }
      const parsed = await source.parse(
        await workbook([{ [field]: 'НЕВІДОМЕ' }]),
      );
      expect(() => normalizeDocument(parsed.rows[0]!)).toThrow(
        ImportValidationError,
      );
    }
    const parsed = await source.parse(await workbook([{ status: 'чернетка' }]));
    expect(() => normalizeDocument(parsed.rows[0]!)).toThrow(
      ImportValidationError,
    );
  });
  it('handles numeric Excel serials in the 1900 and 1904 calendars', async () => {
    const standard = await source.parse(
      await workbook([{ registeredAt: 46280 }]),
    );
    const alternate = await source.parse(
      await workbook([{ registeredAt: 44818 }], { date1904: true }),
    );
    expect(normalizeDocument(standard.rows[0]!).registeredAt).toBe(
      '2026-09-15',
    );
    expect(normalizeDocument(alternate.rows[0]!).registeredAt).toBe(
      '2026-09-15',
    );
  });
  it('rejects malformed files, missing columns, formulas and impossible dates', async () => {
    await expect(
      source.parse(new Uint8Array([1, 2, 3])),
    ).rejects.toBeInstanceOf(ImportValidationError);
    await expect(
      source.parse(await workbook([{}], { missingHeader: true })),
    ).rejects.toBeInstanceOf(ImportValidationError);
    await expect(
      source.parse(await workbook([{ title: { formula: '1+1', result: 2 } }])),
    ).rejects.toBeInstanceOf(ImportValidationError);
    const parsed = await source.parse(
      await workbook([{ registeredAt: '31.02.2026' }]),
    );
    expect(() => normalizeDocument(parsed.rows[0]!)).toThrow(
      ImportValidationError,
    );
  });
});

describe('journal HTTP + SQLite', () => {
  let directory: string;
  let api: Awaited<ReturnType<typeof startBackend>>;
  let client: PrismaClient;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'askod-import-'));
    const databaseUrl = `file:${join(directory, 'journal.db')}`;
    api = await startBackend({
      databaseUrl,
      schemaPath: fileURLToPath(
        new URL('../../prisma/schema.prisma', import.meta.url),
      ),
      token: 'test-session',
    });
    client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  }, 60_000);
  afterAll(async () => {
    await client?.$disconnect();
    await api?.close();
    if (directory) await rm(directory, { recursive: true, force: true });
  });
  async function upload(bytes: Uint8Array, token = 'test-session') {
    return fetch(`${api.url}/api/imports?fileName=journal.xlsx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        Authorization: `Bearer ${token}`,
      },
      body: Buffer.from(bytes),
    });
  }
  it('creates, updates and repeats without duplicates while retaining every snapshot', async () => {
    const original = await workbook([{}]);
    const created = await upload(original);
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      totalRows: 1,
      created: 1,
      updated: 0,
      unchanged: 0,
    });
    const originalId = (await client.document.findFirstOrThrow()).id;
    const edited = await workbook([{ title: 'Оновлений зміст' }]);
    expect(await (await upload(edited)).json()).toMatchObject({
      created: 0,
      updated: 1,
      unchanged: 0,
    });
    expect(await (await upload(edited)).json()).toMatchObject({
      created: 0,
      updated: 0,
      unchanged: 1,
    });
    expect(await client.document.count()).toBe(1);
    expect(await client.document.findFirstOrThrow()).toMatchObject({
      id: originalId,
      title: 'Оновлений зміст',
    });
    const history = await client.importRow.findMany({
      include: { import: true },
      orderBy: { import: { importedAt: 'asc' } },
    });
    expect(history).toHaveLength(3);
    expect(history[0]!.snapshot).toMatchObject({ title: 'Тестовий документ' });
    expect(Object.keys(history[0]!.raw as object)).toHaveLength(43);
    expect(history[0]!.import.fileHash).toHaveLength(64);
    const response = await fetch(`${api.url}/api/documents?page=1&pageSize=1`, {
      headers: { Authorization: 'Bearer test-session' },
    });
    expect(await response.json()).toMatchObject({
      total: 1,
      items: [
        {
          id: originalId,
          registeredAt: '2026-09-15',
          title: 'Оновлений зміст',
        },
      ],
    });
  });
  it('rejects the entire import when any row is invalid or keys repeat', async () => {
    const before = await client.import.count();
    const invalid = await upload(
      await workbook([
        { registrationNumber: 'Т-002' },
        { registrationNumber: 'Т-003', registeredAt: 'invalid' },
      ]),
    );
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toMatchObject({ issues: [{ row: 3 }] });
    expect((await upload(await workbook([{}, {}]))).status).toBe(422);
    expect(await client.document.count()).toBe(1);
    expect(await client.import.count()).toBe(before);
  });
  it('rolls back earlier rows and history when persistence fails mid-import', async () => {
    const parsed = await source.parse(
      await workbook([
        { registrationNumber: 'TX-1' },
        { registrationNumber: 'TX-2' },
      ]),
    );
    const records = parsed.rows.map((row) => ({
      source: row,
      document: normalizeDocument(row),
    }));
    records[1]!.document = { ...records[1]!.document, registeredAt: 'invalid' };
    const countBefore = await client.import.count();
    await expect(
      createPrismaJournalRepository(client).save({
        fileName: 'rollback.xlsx',
        fileHash: parsed.fileHash,
        sheetName: parsed.sheetName,
        records,
      }),
    ).rejects.toThrow();
    expect(
      await client.document.findUnique({
        where: {
          registrationNumber_registrationYear: {
            registrationNumber: 'TX-1',
            registrationYear: 2026,
          },
        },
      }),
    ).toBeNull();
    expect(await client.import.count()).toBe(countBefore);
  });
  it('keeps equal numbers in different years separate and updates dates within a year', async () => {
    const newer = await upload(
      await workbook([{ registeredAt: '15.09.2027' }]),
    );
    expect(await newer.json()).toMatchObject({ created: 1, updated: 0 });
    const corrected = await upload(
      await workbook([{ registeredAt: '01.08.2027' }]),
    );
    expect(await corrected.json()).toMatchObject({ created: 0, updated: 1 });
    expect(await client.document.count()).toBe(2);
    const old = await client.document.findUniqueOrThrow({
      where: {
        registrationNumber_registrationYear: {
          registrationNumber: 'Т-001',
          registrationYear: 2026,
        },
      },
    });
    expect(old.title).toBe('Оновлений зміст');
  });
  it('returns a complete Excel error report beyond the JSON preview and writes nothing', async () => {
    const before = await client.import.count();
    const documentsBefore = await client.document.count();
    const response = await upload(
      await workbook(
        Array.from({ length: 105 }, (_, index) => ({
          registrationNumber: `ERR-${index}`,
          status: '=INVALID()',
          receivedVia: null,
        })),
      ),
    );
    expect(response.status).toBe(422);
    const body = importErrorResponseSchema.parse(await response.json());
    expect(body.issues).toHaveLength(100);
    expect(body.issueCount).toBe(105);
    const report = new ExcelJS.Workbook();
    await report.xlsx.load(Buffer.from(body.report!.base64, 'base64'));
    const sheet = report.getWorksheet('Помилки імпорту')!;
    expect(sheet.rowCount).toBe(106);
    expect(sheet.getCell('A2').value).toBe(2);
    expect(sheet.getCell('A106').value).toBe(106);
    expect(sheet.getCell('B2').value).toBe('Стан документа');
    expect(sheet.getCell('C2').value).toBe('=INVALID()');
    expect(sheet.getCell('C2').type).toBe(ExcelJS.ValueType.String);
    expect(sheet.getCell('D2').text).toContain('дозволеному переліку');
    expect(sheet.getCell('E2').value).toBe('Чернетка');
    expect(await client.import.count()).toBe(before);
    expect(await client.document.count()).toBe(documentsBefore);
  });
  it('edits full documents with version checks, history, stable no-op dates and unique keys', async () => {
    await upload(
      await workbook([
        { registrationNumber: 'EDIT-1' },
        { registrationNumber: 'EDIT-2' },
      ]),
    );
    const headers = {
      Authorization: 'Bearer test-session',
      'Content-Type': 'application/json',
    };
    const listResponse = await fetch(
      `${api.url}/api/documents?search=EDIT-&sortBy=registrationNumber&sortDirection=asc`,
      { headers },
    );
    const list = documentsSchema.parse(await listResponse.json());
    expect(list.items).toHaveLength(2);
    const original = list.items[0]!;
    expect(Object.keys(original)).toHaveLength(46);
    const columnsResponse = await fetch(`${api.url}/api/documents/columns`, {
      headers,
    });
    expect(await columnsResponse.json()).toHaveLength(43);
    const patch = (version: number, field: string, value: string) =>
      fetch(`${api.url}/api/documents/${original.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ version, field, value }),
      });
    expect((await patch(original.version, 'status', 'Unknown')).status).toBe(
      409,
    );
    expect(
      (await patch(original.version, 'registrationNumber', 'EDIT-2')).status,
    ).toBe(409);
    const response = await patch(
      original.version,
      'title',
      'Ручне виправлення',
    );
    expect(response.status).toBe(200);
    const edited = documentSchema.parse(await response.json());
    expect(edited.version).toBe(original.version + 1);
    expect(edited.createdAt).toBe(original.createdAt);
    expect(edited.updatedAt >= original.updatedAt).toBe(true);
    expect(
      (await patch(original.version, 'title', 'Застаріла зміна')).status,
    ).toBe(409);
    const unchanged = documentSchema.parse(
      await (await patch(edited.version, 'title', edited.title)).json(),
    );
    expect(unchanged.updatedAt).toBe(edited.updatedAt);
    expect(unchanged.version).toBe(edited.version);
    const historyResponse = await fetch(
      `${api.url}/api/documents/${original.id}/history`,
      { headers },
    );
    const history = documentHistorySchema.parse(await historyResponse.json());
    expect(history.find((item) => item.source === 'manual')).toMatchObject({
      before: { title: 'Тестовий документ' },
      after: { title: 'Ручне виправлення' },
    });
    await upload(
      await workbook([{ registrationNumber: 'EDIT-1', title: edited.title }]),
    );
    expect(
      (
        await client.document.findUniqueOrThrow({ where: { id: original.id } })
      ).updatedAt.toISOString(),
    ).toBe(edited.updatedAt);
  });
  it('soft deletes a selection atomically, retains history and refuses resurrection by import', async () => {
    const headers = {
      Authorization: 'Bearer test-session',
      'Content-Type': 'application/json',
    };
    const rows = await client.document.findMany({
      where: { registrationNumber: { startsWith: 'EDIT-' } },
      orderBy: { registrationNumber: 'asc' },
    });
    const first = rows[0]!;
    const second = rows[1]!;
    const remove = (items: Array<{ id: string; version: number }>) =>
      fetch(`${api.url}/api/documents/delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ items }),
      });
    expect(
      (
        await remove([
          { id: first.id, version: first.version },
          { id: second.id, version: 999 },
        ])
      ).status,
    ).toBe(409);
    expect(
      await client.document.count({
        where: { id: { in: rows.map((row) => row.id) }, deletedAt: null },
      }),
    ).toBe(2);
    expect(
      (await remove(rows.map((row) => ({ id: row.id, version: row.version }))))
        .status,
    ).toBe(204);
    const listed = documentsSchema.parse(
      await (
        await fetch(`${api.url}/api/documents?search=EDIT-`, { headers })
      ).json(),
    );
    expect(listed.total).toBe(0);
    expect(
      await client.importRow.count({ where: { documentId: first.id } }),
    ).toBeGreaterThan(0);
    expect(
      await client.documentChange.count({
        where: { documentId: first.id, source: 'delete' },
      }),
    ).toBe(1);
    const importsBefore = await client.import.count();
    const response = await upload(
      await workbook([
        { registrationNumber: 'WILL-ROLLBACK' },
        { registrationNumber: 'EDIT-1' },
      ]),
    );
    expect(response.status).toBe(422);
    expect(
      await client.document.count({
        where: { registrationNumber: 'WILL-ROLLBACK' },
      }),
    ).toBe(0);
    expect(await client.import.count()).toBe(importsBefore);
    expect(
      (await client.document.findUniqueOrThrow({ where: { id: first.id } }))
        .deletedAt,
    ).not.toBeNull();
  });
  it('enforces authorization, filename and pagination validation', async () => {
    expect((await upload(await workbook([{}]), 'wrong')).status).toBe(401);
    const response = await fetch(`${api.url}/api/documents?page=0`, {
      headers: { Authorization: 'Bearer test-session' },
    });
    expect(response.status).toBe(400);
    const filename = await fetch(
      `${api.url}/api/imports?fileName=../../secret.xlsx`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-session',
          'Content-Type': 'application/octet-stream',
        },
        body: Buffer.from(await workbook([{}])),
      },
    );
    expect(filename.status).toBe(400);
  });
});

it('uses document number and registration year as the business key', async () => {
  const parsed = await source.parse(await workbook([{}]));
  const document = normalizeDocument(parsed.rows[0]!);
  expect(documentIdentity(document)).toBe(
    documentIdentity({
      ...document,
      title: 'Changed',
      registeredAt: '2026-08-01',
    }),
  );
  expect(documentIdentity(document)).not.toBe(
    documentIdentity({ ...document, registeredAt: '2027-09-15' }),
  );
  expect(documentIdentity(document)).toBe(
    documentIdentity({ ...document, organization: 'Other' }),
  );
  expect(documentIdentity(document)).not.toBe(
    documentIdentity({ ...document, registrationNumber: 'Т-002' }),
  );
});
