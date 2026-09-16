import type { RequestHandler } from 'express';
import { paginationSchema, documentsSchema } from '@askod/shared';
import type { BackendDependencies } from '../../bootstrap/backend-dependencies';
import { parseRequest } from '../../http/validation/parse-request';
export function documentsController(
  useCase: BackendDependencies['listDocuments'],
): RequestHandler {
  return async (req, res) => {
    const input = parseRequest(paginationSchema, req.query);
    res.json(documentsSchema.parse(await useCase.execute(input)));
  };
}
