import type { ImportErrorResponse } from '@askod/shared';
export class ApiError extends Error {
  constructor(
    message: string,
    public issues: ImportErrorResponse['issues'] = [],
    public report: ImportErrorResponse['report'] = undefined,
    public issueCount: number = issues.length,
  ) {
    super(message);
  }
}
