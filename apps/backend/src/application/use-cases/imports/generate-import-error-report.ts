import type { ImportErrorReportWriter } from '../../interfaces/import-error-report-writer';
import type { ImportIssue } from '../../../domain/imports/import-validation-error';
export class GenerateImportErrorReport {
  constructor(private readonly writer: ImportErrorReportWriter) {}
  execute(issues: readonly ImportIssue[]) {
    return this.writer.write(issues);
  }
}
