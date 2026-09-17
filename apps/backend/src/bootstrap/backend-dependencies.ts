import type { ManageDocuments } from '../application/use-cases/documents/manage-documents';
import type { DocumentColumn } from '@askod/shared';
import type { GenerateImportErrorReport } from '../application/use-cases/imports/generate-import-error-report';
import type {
  GetWorkspaceStatus,
  ImportJournal,
  ListDocuments,
  ListImports,
} from '../application/index';

// HTTP depends on callable use cases, never on database adapters.
export interface BackendDependencies {
  generateReport: Pick<GenerateReport, 'execute'>;
  manageDocuments: Pick<ManageDocuments, 'update' | 'deleteMany' | 'history'>;
  documentColumns: DocumentColumn[];
  getWorkspaceStatus: Pick<GetWorkspaceStatus, 'execute'>;
  importJournal: Pick<ImportJournal, 'execute'>;
  listDocuments: Pick<ListDocuments, 'execute'>;
  listImports: Pick<ListImports, 'execute'>;
  generateImportErrorReport: Pick<GenerateImportErrorReport, 'execute'>;
  importFieldLabel(field: string): string;
}
export interface BackendResources {
  dependencies: BackendDependencies;
  close(): Promise<void>;
}
import type { GenerateReport } from '../application/use-cases/reports/generate-report';
