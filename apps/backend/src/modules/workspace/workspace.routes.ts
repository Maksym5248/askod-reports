import { Router } from 'express';
import type { BackendDependencies } from '../../bootstrap/backend-dependencies';
import { workspaceController } from './workspace.controller';
export function workspaceRoutes(
  useCase: BackendDependencies['getWorkspaceStatus'],
) {
  return Router().get('/', workspaceController(useCase));
}
