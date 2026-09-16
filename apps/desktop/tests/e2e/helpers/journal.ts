import ExcelJS from 'exceljs';
import { expect, type Page, type APIRequestContext } from '@playwright/test';
import { journalColumns } from '../../../../backend/src/infrastructure/excel/journal-columns';
import { documentsSchema } from '@askod/shared';
export type JournalRow = Record<string, ExcelJS.CellValue>;
export async function journal(rows: JournalRow[] = [{}]): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Журнал');
  sheet.addRow(journalColumns.map((column) => column.header));
  rows.forEach((row, index) => {
    const values: JournalRow = {
      sourceOrdinal: index + 1,
      registrationNumber: `E2E-${String(index + 1).padStart(3, '0')}`,
      registeredAt: '2026-09-15',
      title: 'Тестовий документ',
      organization: 'Тестова організація',
      folder: 'Звернення громадян',
      status: 'Чернетка',
      documentType: 'Заява (клопотання)',
      pageCount: 1,
      ...row,
    };
    sheet.addRow(journalColumns.map((column) => values[column.field] ?? null));
  });
  return Buffer.from(await book.xlsx.writeBuffer());
}
export async function uploadInUi(
  window: Page,
  rows: JournalRow[] = [{}],
  name = 'journal.xlsx',
) {
  await window.getByRole('link', { name: 'Імпорти', exact: true }).click();
  await window
    .locator('input[type=file]')
    .setInputFiles({
      name,
      mimeType: 'application/octet-stream',
      buffer: await journal(rows),
    });
  await window
    .getByRole('button', { name: 'Імпортувати в базу', exact: true })
    .click();
}
// API setup keeps editing/table tests focused; the real import pipeline still validates/persists fixtures.
export async function seed(api: APIRequestContext, rows: JournalRow[] = [{}]) {
  const response = await api.post('/api/imports?fileName=fixture.xlsx', {
    headers: { 'Content-Type': 'application/octet-stream' },
    data: await journal(rows),
  });
  expect(response.status(), await response.text()).toBe(201);
}
export async function documents(api: APIRequestContext) {
  const response = await api.get('/api/documents?pageSize=100');
  expect(response.ok()).toBe(true);
  return documentsSchema.parse(await response.json());
}
export async function openDocuments(window: Page, count: number) {
  await window.getByRole('link', { name: 'Документи', exact: true }).click();
  await window.getByRole('button', { name: 'Оновити', exact: true }).click();
  await expect(
    window.getByText(`Документів у сховищі: ${count}.`, { exact: true }),
  ).toBeVisible();
}
