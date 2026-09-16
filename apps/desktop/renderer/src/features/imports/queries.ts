import { queryOptions } from '@tanstack/react-query';
import { getImports } from './api';
export const importsQuery = queryOptions({
  queryKey: ['imports'],
  queryFn: ({ signal }) => getImports(signal),
});
