import type { Document, JournalDocument } from '../../domain';
import type { ImportRecord, ImportSummary } from '../models/import-summary';
export interface JournalRepository {
  save(input: {
    fileName: string;
    fileHash: string;
    sheetName: string;
    records: ImportRecord[];
  }): Promise<ImportSummary>;
  find(id: string): Promise<Document | null>;
  update(
    id: string,
    version: number,
    document: JournalDocument,
  ): Promise<Document>;
  deleteMany(items: Array<{ id: string; version: number }>): Promise<void>;
  history(id: string): Promise<
    Array<{
      id: string;
      changedAt: string;
      source: string;
      before: unknown;
      after: unknown;
    }>
  >;
  recentImports(): Promise<ImportSummary[]>;
  list(input: {
    page: number;
    pageSize: number;
    search?: string | undefined;
    documentType?: string | undefined;
    sortBy?: string | undefined;
    sortDirection?: 'asc' | 'desc' | undefined;
  }): Promise<{
    total: number;
    items: Document[];
  }>;
}
