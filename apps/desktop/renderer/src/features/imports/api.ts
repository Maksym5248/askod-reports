import { importsSchema, importSummarySchema } from '@askod/shared';
import { request } from '../../shared/api/client';
export async function importJournal(file: File) {
  return importSummarySchema.parse(
    await request(`/api/imports?fileName=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
    }),
  );
}
export async function getImports(signal: AbortSignal) {
  return importsSchema.parse(await request('/api/imports', { signal }));
}
