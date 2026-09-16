import { queryOptions } from '@tanstack/react-query';
import { getDocuments, getDocumentColumns } from './api';
export const documentsQuery = (query: string) =>
  queryOptions({
    queryKey: ['documents', query],
    queryFn: ({ signal }) => getDocuments(query, signal),
  });
export const documentColumnsQuery = queryOptions({
  queryKey: ['document-columns'],
  queryFn: ({ signal }) => getDocumentColumns(signal),
  staleTime: Infinity,
});
