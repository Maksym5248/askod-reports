import type {
  GetWorkspaceStatus,
  ImportJournal,
  ListDocuments,
  ListImports,
} from '../application/index';

// HTTP depends on callable use cases, never on database adapters.
export interface BackendDependencies {
  getWorkspaceStatus: Pick<GetWorkspaceStatus, 'execute'>;
  importJournal: Pick<ImportJournal, 'execute'>;
  listDocuments: Pick<ListDocuments, 'execute'>;
  listImports: Pick<ListImports, 'execute'>;
  importFieldLabel(field: string): string;
}
export interface BackendResources {
  dependencies: BackendDependencies;
  close(): Promise<void>;
}
