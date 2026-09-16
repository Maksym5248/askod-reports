import {
  DocumentConflict,
  DocumentNotFound,
} from '../../domain/documents/document-conflict';
import type { BackendDependencies } from '../../bootstrap/backend-dependencies';
import type { ErrorRequestHandler } from 'express';
import { ImportValidationError } from '../../domain/index';
import { HttpError } from '../errors/http-error';

export function errorHandler(
  importFieldLabel: (field: string) => string,
  report: BackendDependencies['generateImportErrorReport'],
): ErrorRequestHandler {
  return async (error: unknown, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (
      error instanceof DocumentConflict ||
      error instanceof DocumentNotFound
    ) {
      res
        .status(error instanceof DocumentNotFound ? 404 : 409)
        .json({ error: error.message });
      return;
    }
    if (
      error &&
      typeof error === 'object' &&
      'type' in error &&
      error.type === 'entity.parse.failed'
    ) {
      res.status(400).json({ error: 'Некоректний JSON.' });
      return;
    }
    if (error instanceof ImportValidationError) {
      let bytes: Uint8Array;
      try {
        bytes = await report.execute(error.issues);
      } catch {
        res.status(500).json({
          error: 'Не вдалося створити звіт про помилки. Файл не імпортовано.',
        });
        return;
      }
      res.status(422).json({
        issueCount: error.issues.length,
        report: {
          fileName: 'import-errors.xlsx',
          base64: Buffer.from(bytes).toString('base64'),
        },
        error: error.message,
        issues: error.issues.slice(0, 100).map((issue) => ({
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
