import type { SourceRow } from '../../domain';
export interface JournalSource {
  parse(
    bytes: Uint8Array,
  ): Promise<{ rows: SourceRow[]; sheetName: string; fileHash: string }>;
}
