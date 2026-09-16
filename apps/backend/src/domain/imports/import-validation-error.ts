export interface ImportIssue {
  row: number;
  field: string;
  message: string;
  value?: string;
  allowedValues?: readonly string[];
}
export class ImportValidationError extends Error {
  constructor(public readonly issues: ImportIssue[]) {
    super('Файл не імпортовано. Виправте помилки та повторіть спробу.');
  }
}
