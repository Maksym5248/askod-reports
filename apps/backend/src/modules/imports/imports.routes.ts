import { Router, raw } from 'express';
import type { BackendDependencies } from '../../bootstrap/backend-dependencies';
import {
  createImportController,
  listImportsController,
} from './imports.controller';
export function importsRoutes(
  dependencies: Pick<BackendDependencies, 'importJournal' | 'listImports'>,
) {
  return Router()
    .get('/', listImportsController(dependencies.listImports))
    .post(
      '/',
      raw({
        type: [
          'application/octet-stream',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        limit: '10mb',
      }),
      createImportController(dependencies.importJournal),
    );
}
