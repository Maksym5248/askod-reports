import { Router, json } from 'express';
import { reportInputSchema } from '@askod/shared';
import { reportCatalog } from '../../application/use-cases/reports/generate-report';
import type { BackendDependencies } from '../../bootstrap/backend-dependencies';
import { parseRequest } from '../../http/validation/parse-request';

export function reportsRoutes(dependencies: BackendDependencies) {
  return Router()
    .get('/', (_req, res) => res.json(reportCatalog))
    .post('/export', json({ limit: '4kb' }), async (req, res) => {
      const input = parseRequest(reportInputSchema, req.body);
      const bytes = await dependencies.generateReport.execute(input);
      const extension = input.id.startsWith('appendix-') ? 'xls' : 'docx';
      res.json({
        fileName: `${input.id}_${input.from}_${input.to}.${extension}`,
        base64: Buffer.from(bytes).toString('base64'),
      });
    });
}
