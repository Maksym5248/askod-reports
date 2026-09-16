import {
  DocumentConflict,
  DocumentNotFound,
} from '../../../domain/documents/document-conflict';
import { ImportValidationError } from '../../../domain/imports/import-validation-error';
import { documentFieldTypes } from '../../../domain/documents/document-fields';
import type { Prisma } from '@prisma/client';
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
            if (existing?.deletedAt)
              throw new ImportValidationError([
                {
                  row: record.source.rowNumber,
                  field: 'registrationNumber',
                  value: record.document.registrationNumber,
                  message:
                    'Документ видалено з робочого списку. Імпорт не відновлює його автоматично; зверніться до адміністратора.',
                },
              ]);
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
                ? await tx.document.update({
                    where: { id: existing.id },
                    data: {
                      ...data,
                      updatedAt: new Date(),
                      version: { increment: 1 },
                    },
                  })
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
    async find(id) {
      const row = await client.document.findFirst({
        where: { id, deletedAt: null },
      });
      return row ? toDomain(row) : null;
    },
    async update(id, version, document) {
      try {
        return await client.$transaction(async (tx) => {
          const current = await tx.document.findFirst({
            where: { id, deletedAt: null },
          });
          if (!current) throw new DocumentNotFound('Документ не знайдено.');
          if (current.version !== version)
            throw new DocumentConflict(
              'Документ уже змінено. Оновіть таблицю.',
            );
          const contentHash = createHash('sha256')
            .update(JSON.stringify(document))
            .digest('hex');
          if (current.contentHash === contentHash) return toDomain(current);
          const result = await tx.document.updateMany({
            where: { id, version, deletedAt: null },
            data: {
              ...toPersistence(document),
              contentHash,
              updatedAt: new Date(),
              version: { increment: 1 },
            },
          });
          if (result.count !== 1)
            throw new DocumentConflict(
              'Документ уже змінено. Оновіть таблицю.',
            );
          const updated = await tx.document.findUniqueOrThrow({
            where: { id },
          });
          await tx.documentChange.create({
            data: {
              documentId: id,
              source: 'manual',
              before: { ...toDomain(current) },
              after: { ...toDomain(updated) },
            },
          });
          return toDomain(updated);
        });
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'P2002'
        )
          throw new DocumentConflict(
            'Документ з таким номером і роком уже існує.',
          );
        throw error;
      }
    },
    async deleteMany(items) {
      await client.$transaction(async (tx) => {
        for (const item of items) {
          const current = await tx.document.findFirst({
            where: { id: item.id, deletedAt: null },
          });
          if (!current || current.version !== item.version)
            throw new DocumentConflict(
              'Один із документів уже змінено або видалено. Оновіть таблицю; нічого не видалено.',
            );
          const deletedAt = new Date();
          const result = await tx.document.updateMany({
            where: { id: item.id, version: item.version, deletedAt: null },
            data: {
              deletedAt,
              updatedAt: deletedAt,
              version: { increment: 1 },
            },
          });
          if (result.count !== 1)
            throw new DocumentConflict(
              'Документ уже змінено. Нічого не видалено.',
            );
          await tx.documentChange.create({
            data: {
              documentId: item.id,
              source: 'delete',
              before: { ...toDomain(current) },
              after: { deletedAt: deletedAt.toISOString() },
            },
          });
        }
      });
    },
    async history(id) {
      const [changes, imports] = await Promise.all([
        client.documentChange.findMany({
          where: { documentId: id },
          orderBy: { changedAt: 'desc' },
        }),
        client.importRow.findMany({
          where: { documentId: id },
          include: { import: true },
        }),
      ]);
      return [
        ...changes.map((row) => ({
          id: row.id,
          changedAt: row.changedAt.toISOString(),
          source: row.source,
          before: row.before,
          after: row.after,
        })),
        ...imports.map((row) => ({
          id: row.id,
          changedAt: row.import.importedAt.toISOString(),
          source: `import:${row.outcome}`,
          before: null,
          after: row.snapshot,
        })),
      ].sort((a, b) => b.changedAt.localeCompare(a.changedAt));
    },
    async list({
      page,
      pageSize,
      search,
      documentType,
      sortBy,
      sortDirection,
    }) {
      const where: Prisma.DocumentWhereInput = {
        deletedAt: null,
        ...(documentType ? { documentType } : {}),
        ...(search
          ? {
              OR: ['registrationNumber', 'title', 'applicant'].map((field) => ({
                [field]: { contains: search },
              })),
            }
          : {}),
      };
      const field =
        sortBy &&
        (Object.hasOwn(documentFieldTypes, sortBy) ||
          ['createdAt', 'updatedAt'].includes(sortBy))
          ? sortBy
          : 'registeredAt';
      const [total, items] = await client.$transaction([
        client.document.count({ where }),
        client.document.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [
            { [field]: sortDirection === 'asc' ? 'asc' : 'desc' },
            { registrationNumber: 'asc' },
            { id: 'asc' },
          ],
        }),
      ]);
      return { total, items: items.map(toDomain) };
    },
  };
}
