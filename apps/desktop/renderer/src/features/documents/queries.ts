import { queryOptions } from '@tanstack/react-query';
import { getDocuments } from './api';
export const documentsQuery = (page: number) =>
  queryOptions({
    queryKey: ['documents', page],
    queryFn: ({ signal }) => getDocuments(page, signal),
  });
