import type { RequestHandler } from 'express';
import {
  importRequestSchema,
  importSummarySchema,
  importsSchema,
} from '@askod/shared';
import type { BackendDependencies } from '../../bootstrap/backend-dependencies';
import { parseRequest } from '../../http/validation/parse-request';
import { HttpError } from '../../http/errors/http-error';
export function createImportController(
  useCase: BackendDependencies['importJournal'],
): RequestHandler {
  return async (req, res) => {
    const { fileName } = parseRequest(importRequestSchema, {
      fileName: req.query.fileName,
    });
    if (!Buffer.isBuffer(req.body))
      throw new HttpError(415, 'Потрібен XLSX-файл у тілі запиту');
    const result = await useCase.execute({ fileName, bytes: req.body });
    res.status(201).json(importSummarySchema.parse(result));
  };
}
export function listImportsController(
  useCase: BackendDependencies['listImports'],
): RequestHandler {
  return async (_req, res) => {
    res.json(importsSchema.parse(await useCase.execute()));
  };
}
