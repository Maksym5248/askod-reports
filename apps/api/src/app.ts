import express from 'express';
import type { GetWorkspaceStatus } from '@askod/application';
import { workspaceStatusSchema } from '@askod/shared';

export function createApp(
  status: GetWorkspaceStatus,
  options: { token?: string; allowedOrigin?: string } = {},
) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && origin !== options.allowedOrigin) {
      res.sendStatus(403);
      return;
    }
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type',
      );
      res.setHeader('Access-Control-Allow-Methods', 'GET');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    if (
      options.token &&
      req.headers.authorization !== `Bearer ${options.token}`
    ) {
      res.sendStatus(401);
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/workspace', async (_req, res) => {
    res.json(workspaceStatusSchema.parse(await status.execute()));
  });
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error('API request failed', error);
      res
        .status(500)
        .json({ error: 'Не вдалося отримати дані. Спробуйте ще раз.' });
    },
  );
  return app;
}
