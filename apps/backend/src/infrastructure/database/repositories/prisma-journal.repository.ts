import { createHash } from 'node:crypto';
import type { PrismaClient, Import as PrismaImport } from '@prisma/client';
import type {
  JournalRepository,
  ImportSummary,
} from '../../../application/index';

import { toPersistence, toDomain } from '../mappers/document-mapper';

const summary = (row: PrismaImport): ImportSummary => ({
  id: row.id,
  fileName: row.fileName,
  importedAt: row.importedAt.toISOString(),
  totalRows: row.totalRows,
  created: row.created,
  updated: row.updated,
  unchanged: row.unchanged,
});

export function createPrismaJournalRepository(
  client: PrismaClient,
): JournalRepository {
  return {
    async save(input) {
      return client.$transaction(
        async (tx) => {
          const batch = await tx.import.create({
            data: {
              fileName: input.fileName,
              fileHash: input.fileHash,
              sheetName: input.sheetName,
              totalRows: input.records.length,
              created: 0,
              updated: 0,
              unchanged: 0,
            },
          });
          const counts = { created: 0, updated: 0, unchanged: 0 };
          for (const record of input.records) {
            const contentHash = createHash('sha256')
              .update(JSON.stringify(record.document))
              .digest('hex');
            const existing = await tx.document.findUnique({
              where: {
                registrationNumber_registrationYear: {
                  registrationNumber: record.document.registrationNumber,
                  registrationYear: Number(
                    record.document.registeredAt.slice(0, 4),
                  ),
                },
              },
            });
            const outcome = !existing
              ? 'created'
              : existing.contentHash === contentHash
                ? 'unchanged'
                : 'updated';
            const data = {
              ...toPersistence(record.document),
              registrationNumber: record.document.registrationNumber,
              contentHash,
            };
            const document = !existing
              ? await tx.document.create({ data })
              : outcome === 'updated'
                ? await tx.document.update({ where: { id: existing.id }, data })
                : existing;
            counts[outcome]++;
            await tx.importRow.create({
              data: {
                importId: batch.id,
                documentId: document.id,
                rowNumber: record.source.rowNumber,
                outcome,
                raw: { ...record.source.raw },
                snapshot: { ...record.document },
              },
            });
          }
          return summary(
            await tx.import.update({ where: { id: batch.id }, data: counts }),
          );
        },
        { timeout: 60_000, maxWait: 10_000 },
      );
    },
    async recentImports() {
      return (
        await client.import.findMany({
          orderBy: [{ importedAt: 'desc' }, { id: 'desc' }],
          take: 20,
        })
      ).map(summary);
    },
    async list({ page, pageSize }) {
      const [total, items] = await client.$transaction([
        client.document.count(),
        client.document.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [
            { registeredAt: 'desc' },
            { registrationNumber: 'asc' },
            { id: 'asc' },
          ],
        }),
      ]);
      return { total, items: items.map(toDomain) };
    },
  };
}
