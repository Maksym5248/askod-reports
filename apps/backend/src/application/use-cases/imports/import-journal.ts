import {
  documentIdentity,
  normalizeDocument,
  ImportValidationError,
  type ImportIssue,
} from '../../../domain';
import type { JournalSource } from '../../interfaces/journal-source';
import type { JournalRepository } from '../../interfaces/journal-repository';
import type { ImportRecord, ImportSummary } from '../../models/import-summary';
export class ImportJournal {
  constructor(
    private readonly source: JournalSource,
    private readonly repository: Pick<JournalRepository, 'save'>,
  ) {}
  async execute(input: {
    fileName: string;
    bytes: Uint8Array;
  }): Promise<ImportSummary> {
    const parsed = await this.source.parse(input.bytes);
    if (!parsed.rows.length)
      throw new ImportValidationError([
        { row: 1, field: '', message: 'Файл не містить документів' },
      ]);
    const records: ImportRecord[] = [];
    const issues: ImportIssue[] = [];
    const keys = new Set<string>();
    for (const row of parsed.rows) {
      try {
        const document = normalizeDocument(row);
        const identityKey = documentIdentity(document);
        if (keys.has(identityKey))
          issues.push({
            row: row.rowNumber,
            field: 'registrationNumber',
            message:
              'Документ з таким номером і роком реєстрації повторюється в цьому файлі',
            value: document.registrationNumber,
          });
        else {
          keys.add(identityKey);
          records.push({ document, source: row });
        }
      } catch (error) {
        if (!(error instanceof ImportValidationError)) throw error;
        issues.push(...error.issues);
      }
    }
    if (issues.length) throw new ImportValidationError(issues);
    return this.repository.save({
      fileName: input.fileName,
      fileHash: parsed.fileHash,
      sheetName: parsed.sheetName,
      records,
    });
  }
}
