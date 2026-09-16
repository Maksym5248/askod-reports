import type { JournalDocument, SourceRow } from '../../domain';
export interface ImportSummary {
  id: string;
  fileName: string;
  importedAt: string;
  totalRows: number;
  created: number;
  updated: number;
  unchanged: number;
}
export interface ImportRecord {
  document: JournalDocument;
  source: SourceRow;
}
