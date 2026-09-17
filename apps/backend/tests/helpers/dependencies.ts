import type { BackendDependencies } from '../../src/bootstrap/backend-dependencies';
export function testDependencies(
  overrides: Partial<BackendDependencies> = {},
): BackendDependencies {
  return {
    generateReport: { execute: async () => new Uint8Array() },
    documentColumns: [],
    manageDocuments: {
      update: async () => {
        throw new Error('Not configured');
      },
      deleteMany: async () => {},
      history: async () => [],
    },
    getWorkspaceStatus: { execute: async () => ({ documentCount: 0 }) },
    listDocuments: { execute: async () => ({ total: 0, items: [] }) },
    listImports: { execute: async () => [] },
    importJournal: {
      execute: async () => {
        throw new Error('Import not configured in this test');
      },
    },
    generateImportErrorReport: { execute: async () => new Uint8Array() },
    importFieldLabel: (field) => field,
    ...overrides,
  };
}
