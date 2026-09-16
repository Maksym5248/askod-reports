import type { ImportIssue } from '../../domain/imports/import-validation-error';
export interface ImportErrorReportWriter {
  write(issues: readonly ImportIssue[]): Promise<Uint8Array>;
}
