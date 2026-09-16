import { ManageDocuments } from '../application/use-cases/documents/manage-documents';
import {
  documentEnums,
  type DocumentEnumField,
} from '../domain/documents/document-enums';
import { GenerateImportErrorReport } from '../application/use-cases/imports/generate-import-error-report';
import { ExcelImportErrorReportWriter } from '../infrastructure/excel/excel-import-error-report-writer';
import {
  GetWorkspaceStatus,
  ImportJournal,
  ListDocuments,
  ListImports,
} from '../application/index';
import {
  connectDatabase,
  ExcelJournalSource,
  journalColumns,
} from '../infrastructure/index';
import type { BackendResources } from './backend-dependencies';
import type { BackendOptions } from '../config/backend-options';

// Composition root: the only API module that imports concrete infrastructure.
export async function createDependencies(
  options: BackendOptions,
): Promise<BackendResources> {
  const database = await connectDatabase(
    options.databaseUrl,
    options.schemaPath,
  );
  const labels = new Map<string, string>(
    journalColumns.map((column) => [column.field, column.header]),
  );
  return {
    dependencies: {
      manageDocuments: new ManageDocuments(database.journal),
      documentColumns: journalColumns.map((column) => ({
        ...column,
        ...(Object.hasOwn(documentEnums, column.field)
          ? {
              allowedValues: [
                ...documentEnums[column.field as DocumentEnumField],
              ],
            }
          : {}),
      })),
      generateImportErrorReport: new GenerateImportErrorReport(
        new ExcelImportErrorReportWriter(),
      ),
      getWorkspaceStatus: new GetWorkspaceStatus(database.documents),
      importJournal: new ImportJournal(
        new ExcelJournalSource(),
        database.journal,
      ),
      listDocuments: new ListDocuments(database.journal),
      listImports: new ListImports(database.journal),
      importFieldLabel: (field) => labels.get(field) ?? field,
    },
    close: () => database.close(),
  };
}
