import express from 'express';
import type { BackendDependencies } from './bootstrap/backend-dependencies';
import type { HttpOptions } from './config/backend-options';
import { accessControl } from './http/middleware/access-control';
import { errorHandler } from './http/middleware/error-handler';
import { notFound } from './http/middleware/not-found';
import { workspaceRoutes } from './modules/workspace/workspace.routes';
import { documentsRoutes } from './modules/documents/documents.routes';
import { importsRoutes } from './modules/imports/imports.routes';

// Pure HTTP assembly: no environment reads, DB connections or open ports.
export function createApp(
  dependencies: BackendDependencies,
  options: HttpOptions = {},
) {
  const app = express();
  app.disable('x-powered-by');
  app.use(accessControl(options));
  app.use('/api/workspace', workspaceRoutes(dependencies.getWorkspaceStatus));
  app.use('/api/documents', documentsRoutes(dependencies));
  app.use('/api/imports', importsRoutes(dependencies));
  app.use(notFound);
  app.use(
    errorHandler(
      dependencies.importFieldLabel,
      dependencies.generateImportErrorReport,
    ),
  );
  return app;
}
