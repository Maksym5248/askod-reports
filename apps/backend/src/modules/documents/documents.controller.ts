import type { RequestHandler } from 'express';
import { z } from 'zod';
import {
  documentListQuerySchema,
  documentsSchema,
  documentSchema,
  updateDocumentSchema,
  deleteDocumentsSchema,
  documentColumnsSchema,
  documentHistorySchema,
} from '@askod/shared';
import type { BackendDependencies } from '../../bootstrap/backend-dependencies';
import { parseRequest } from '../../http/validation/parse-request';
const idSchema = z.string().uuid();
export function documentsController(
  useCase: BackendDependencies['listDocuments'],
): RequestHandler {
  return async (req, res) => {
    res.json(
      documentsSchema.parse(
        await useCase.execute(parseRequest(documentListQuerySchema, req.query)),
      ),
    );
  };
}
export function documentColumnsController(
  dependencies: BackendDependencies,
): RequestHandler {
  return (_req, res) => {
    res.json(documentColumnsSchema.parse(dependencies.documentColumns));
  };
}
export function updateDocumentController(
  dependencies: BackendDependencies,
): RequestHandler {
  return async (req, res) => {
    const id = parseRequest(idSchema, req.params.id);
    const input = parseRequest(updateDocumentSchema, req.body);
    res.json(
      documentSchema.parse(
        await dependencies.manageDocuments.update({ id, ...input }),
      ),
    );
  };
}
export function deleteDocumentsController(
  dependencies: BackendDependencies,
): RequestHandler {
  return async (req, res) => {
    const input = parseRequest(deleteDocumentsSchema, req.body);
    await dependencies.manageDocuments.deleteMany(input.items);
    res.status(204).end();
  };
}
export function documentHistoryController(
  dependencies: BackendDependencies,
): RequestHandler {
  return async (req, res) => {
    const id = parseRequest(idSchema, req.params.id);
    res.json(
      documentHistorySchema.parse(
        await dependencies.manageDocuments.history(id),
      ),
    );
  };
}
