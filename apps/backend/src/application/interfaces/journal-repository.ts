import type { JournalDocument } from '../../domain';
import type { ImportRecord, ImportSummary } from '../models/import-summary';
export interface JournalRepository {
  save(input: {
    fileName: string;
    fileHash: string;
    sheetName: string;
    records: ImportRecord[];
  }): Promise<ImportSummary>;
  recentImports(): Promise<ImportSummary[]>;
  list(input: { page: number; pageSize: number }): Promise<{
    total: number;
    items: Array<JournalDocument & { id: string }>;
  }>;
}
