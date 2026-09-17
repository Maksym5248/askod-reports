import type { Document } from '../../../domain';

export const reportCatalog = [
  {
    id: 'appendix-1',
    name: 'Додаток 1 — види та результати звернень',
    description: 'Порожній шаблон: суб’єкти, види, результати розгляду.',
  },
  {
    id: 'appendix-2',
    name: 'Додаток 2 — тематика звернень',
    description: 'Порожній шаблон: тематика та підкатегорії.',
  },
  {
    id: 'appendix-3',
    name: 'Додаток 3 — категорії заявників',
    description: 'Порожній шаблон: пільгові категорії заявників.',
  },
  {
    id: 'appendix-4',
    name: 'Додаток 4 — соціальний стан',
    description: 'Порожній шаблон: соціальний стан заявників.',
  },
  {
    id: 'journal',
    name: 'Журнал звернень',
    description:
      'Частково заповнений: документи за період, відомі канали та види. Невизначені показники порожні.',
  },
  {
    id: 'public-information',
    name: 'ЗПІ — запити на публічну інформацію',
    description: 'Порожній шаблон: окремі дані запитів ще не підключені.',
  },
] as const;
export type ReportId = (typeof reportCatalog)[number]['id'];
export interface ReportInput {
  id: ReportId;
  from: string;
  to: string;
  organization: string;
}
export interface ReportData {
  input: ReportInput;
  rows: Array<Array<string | number | null>>;
}
export interface ReportWriter {
  write(data: ReportData): Promise<Uint8Array>;
}
export interface ReportDocumentReader {
  between(from: string, to: string): Promise<Document[]>;
}

export class GenerateReport {
  constructor(
    private readonly reader: ReportDocumentReader,
    private readonly writer: ReportWriter,
  ) {}
  async execute(input: ReportInput) {
    const documents =
      input.id === 'journal'
        ? await this.reader.between(input.from, input.to)
        : [];
    const rows = documents.map((d) => [
      d.registrationNumber,
      d.receivedVia === 'Поштою/електронною поштою' ? 1 : null,
      d.receivedVia === 'Через органи влади' ? 1 : null,
      d.receivedVia === 'Через органи влади' &&
      d.correspondent === 'Державна служба України з надзвичайних ситуацій'
        ? 1
        : null,
      d.receivedVia === 'Від інших органів, установ, організацій' ? 1 : null,
      d.documentType === 'Заява (клопотання)' ? 1 : null,
      d.documentType === 'Скарга' ? 1 : null,
      null,
      null,
      null,
      null,
    ]);
    return this.writer.write({ input, rows });
  }
}
