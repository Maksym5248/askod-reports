import { Router, json } from 'express';
import type { BackendDependencies } from '../../bootstrap/backend-dependencies';
import {
  documentsController,
  documentColumnsController,
  updateDocumentController,
  deleteDocumentsController,
  documentHistoryController,
} from './documents.controller';
export function documentsRoutes(dependencies: BackendDependencies) {
  return Router()
    .get('/', documentsController(dependencies.listDocuments))
    .get('/columns', documentColumnsController(dependencies))
    .get('/:id/history', documentHistoryController(dependencies))
    .patch(
      '/:id',
      json({ limit: '256kb' }),
      updateDocumentController(dependencies),
    )
    .post(
      '/delete',
      json({ limit: '32kb' }),
      deleteDocumentsController(dependencies),
    );
}
