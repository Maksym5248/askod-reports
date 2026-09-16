import {
  documentsSchema,
  documentSchema,
  documentColumnsSchema,
  documentHistorySchema,
} from '@askod/shared';
import { request } from '../../shared/api/client';
export async function getDocuments(query: string, signal: AbortSignal) {
  return documentsSchema.parse(
    await request(`/api/documents?${query}`, { signal }),
  );
}
export async function getDocumentColumns(signal: AbortSignal) {
  return documentColumnsSchema.parse(
    await request('/api/documents/columns', { signal }),
  );
}
export async function updateDocument(input: {
  id: string;
  version: number;
  field: string;
  value: string | number | null;
}) {
  const { id, ...body } = input;
  return documentSchema.parse(
    await request(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}
export async function deleteDocuments(
  items: Array<{ id: string; version: number }>,
) {
  await request('/api/documents/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
}
export async function getDocumentHistory(id: string, signal: AbortSignal) {
  return documentHistorySchema.parse(
    await request(`/api/documents/${id}/history`, { signal }),
  );
}
