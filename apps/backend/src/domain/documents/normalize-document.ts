import { documentEnums, type DocumentEnumField } from './document-enums';
import { documentFieldTypes } from './document-fields';
import type { JournalDocument } from './document';
import type { SourceRow } from '../imports/source-row';
import {
  ImportValidationError,
  type ImportIssue,
} from '../imports/import-validation-error';
export function normalizeDocument(row: SourceRow): JournalDocument {
  const result: Record<string, string | number | null> = {};
  const issues: ImportIssue[] = [];
  for (const [field, type] of Object.entries(documentFieldTypes)) {
    const value = row.values[field];
    const text =
      value === null || value === undefined ? '' : String(value).trim();
    const invalid = (message: string) =>
      issues.push({
        row: row.rowNumber,
        field,
        message,
        value: value == null ? '' : String(value),
      });
    if (!text) {
      if (type.startsWith('required')) invalid('Обов’язкове поле не заповнено');
      result[field] = null;
    } else if (type === 'integer') {
      const number = Number(text);
      if (
        !/^\d+$/.test(text) ||
        !Number.isSafeInteger(number) ||
        number > 2147483647
      )
        invalid('Очікується ціле невід’ємне число');
      result[field] = number;
    } else if (type === 'date' || type === 'requiredDate') {
      const date = /^\d{2}\.\d{2}\.\d{4}$/.test(text)
        ? text.split('.').reverse().join('-')
        : text;
      const parsed = new Date(`${date}T00:00:00.000Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== date
      )
        invalid('Очікується коректна дата');
      result[field] = date;
    } else {
      if (typeof value === 'boolean' || text.length > 32767)
        invalid('Некоректне текстове значення');
      if (Object.hasOwn(documentEnums, field)) {
        const allowed = documentEnums[field as DocumentEnumField];
        if (!(allowed as readonly string[]).includes(text))
          issues.push({
            row: row.rowNumber,
            field,
            value: String(value),
            message:
              'Значення відсутнє в дозволеному переліку. Використайте точний текст одного з варіантів або зверніться для оновлення довідника.',
            allowedValues: [...allowed],
          });
      }
      result[field] = text;
    }
  }
  if (issues.length) throw new ImportValidationError(issues);
  return result as unknown as JournalDocument;
}
