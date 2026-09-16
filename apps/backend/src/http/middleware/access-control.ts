import type { RequestHandler } from 'express';
import type { HttpOptions } from '../../config/backend-options';

export function accessControl(options: HttpOptions): RequestHandler {
  return (req, res, next) => {
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
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
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
  };
}
