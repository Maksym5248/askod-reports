import type { JournalRepository } from '../../interfaces/journal-repository';
import { documentFieldTypes } from '../../../domain/documents/document-fields';
import { normalizeDocument } from '../../../domain/documents/normalize-document';
import {
  DocumentConflict,
  DocumentNotFound,
} from '../../../domain/documents/document-conflict';
import { ImportValidationError } from '../../../domain/imports/import-validation-error';
export class ManageDocuments {
  constructor(
    private readonly repository: Pick<
      JournalRepository,
      'find' | 'update' | 'deleteMany' | 'history'
    >,
  ) {}
  async update(input: {
    id: string;
    version: number;
    field: string;
    value: string | number | null;
  }) {
    if (!Object.hasOwn(documentFieldTypes, input.field))
      throw new DocumentConflict('Це поле не можна редагувати.');
    const current = await this.repository.find(input.id);
    if (!current)
      throw new DocumentNotFound('Документ не знайдено або видалено.');
    if (current.version !== input.version)
      throw new DocumentConflict(
        'Документ уже змінено. Оновіть таблицю та повторіть редагування.',
      );
    let document;
    try {
      document = normalizeDocument({
        rowNumber: 0,
        values: { ...current, [input.field]: input.value },
        raw: {},
      });
    } catch (error) {
      if (error instanceof ImportValidationError)
        throw new DocumentConflict(
          error.issues
            .map(
              (issue) =>
                issue.message +
                (issue.allowedValues
                  ? ` Дозволено: ${issue.allowedValues.join(', ')}`
                  : ''),
            )
            .join(' '),
        );
      throw error;
    }
    return this.repository.update(input.id, input.version, document);
  }
  async deleteMany(items: Array<{ id: string; version: number }>) {
    if (
      !items.length ||
      items.length > 100 ||
      new Set(items.map((item) => item.id)).size !== items.length
    )
      throw new DocumentConflict('Оберіть від 1 до 100 різних документів.');
    await this.repository.deleteMany(items);
  }
  history(id: string) {
    return this.repository.history(id);
  }
}
