import type { RequestHandler } from 'express';
import { workspaceStatusSchema } from '@askod/shared';
import type { BackendDependencies } from '../../bootstrap/backend-dependencies';
export function workspaceController(
  useCase: BackendDependencies['getWorkspaceStatus'],
): RequestHandler {
  return async (_req, res) => {
    res.json(workspaceStatusSchema.parse(await useCase.execute()));
  };
}
