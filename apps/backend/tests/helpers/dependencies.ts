import type { BackendDependencies } from '../../src/bootstrap/backend-dependencies';
export function testDependencies(
  overrides: Partial<BackendDependencies> = {},
): BackendDependencies {
  return {
    getWorkspaceStatus: { execute: async () => ({ documentCount: 0 }) },
    listDocuments: { execute: async () => ({ total: 0, items: [] }) },
    listImports: { execute: async () => [] },
    importJournal: {
      execute: async () => {
        throw new Error('Import not configured in this test');
      },
    },
    importFieldLabel: (field) => field,
    ...overrides,
  };
}
