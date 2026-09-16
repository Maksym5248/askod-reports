import { documentsSchema } from '@askod/shared';
import { request } from '../../shared/api/client';
export async function getDocuments(page: number, signal: AbortSignal) {
  return documentsSchema.parse(
    await request(`/api/documents?page=${page}&pageSize=25`, { signal }),
  );
}
