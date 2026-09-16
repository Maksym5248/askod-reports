import { Router } from 'express';
import type { BackendDependencies } from '../../bootstrap/backend-dependencies';
import { documentsController } from './documents.controller';
export function documentsRoutes(useCase: BackendDependencies['listDocuments']) {
  return Router().get('/', documentsController(useCase));
}
