import type { ErrorRequestHandler } from 'express';
import { ImportValidationError } from '../../domain/index';
import { HttpError } from '../errors/http-error';

export function errorHandler(
  importFieldLabel: (field: string) => string,
): ErrorRequestHandler {
  return (error: unknown, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (error instanceof ImportValidationError) {
      res.status(422).json({
        error: error.message,
        issues: error.issues.map((issue) => ({
          ...issue,
          field: importFieldLabel(issue.field),
        })),
      });
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (
      error &&
      typeof error === 'object' &&
      'type' in error &&
      error.type === 'entity.too.large'
    ) {
      res.status(413).json({ error: 'Максимальний розмір файлу — 10 МБ' });
      return;
    }
    console.error(
      'API request failed',
      error instanceof Error ? error.name : 'Unknown error',
    );
    res
      .status(500)
      .json({ error: 'Не вдалося отримати дані. Спробуйте ще раз.' });
  };
}
