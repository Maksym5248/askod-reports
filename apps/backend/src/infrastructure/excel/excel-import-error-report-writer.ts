import ExcelJS from 'exceljs';
import type { ImportErrorReportWriter } from '../../application/interfaces/import-error-report-writer';
import type { ImportIssue } from '../../domain/imports/import-validation-error';
import { journalColumns } from './journal-columns';
export class ExcelImportErrorReportWriter implements ImportErrorReportWriter {
  async write(issues: readonly ImportIssue[]): Promise<Uint8Array> {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('Помилки імпорту');
    sheet.columns = [
      { header: 'Рядок Excel', key: 'row', width: 14 },
      { header: 'Поле', key: 'field', width: 28 },
      { header: 'Отримане значення', key: 'value', width: 36 },
      { header: 'Що не так і як виправити', key: 'message', width: 65 },
      { header: 'Дозволені значення', key: 'allowed', width: 55 },
    ];
    const labels = new Map<string, string>(
      journalColumns.map((c) => [c.field, c.header]),
    );
    for (const issue of issues) {
      const row = sheet.addRow({
        row: issue.row,
        field: labels.get(issue.field) ?? issue.field,
        value: issue.value ?? '',
        message: issue.message,
        allowed: issue.allowedValues?.join('\n') ?? '',
      });
      row.alignment = { vertical: 'top', wrapText: true };
      row.height = Math.min(
        409,
        Math.max(
          45,
          (issue.allowedValues?.length ?? 1) * 16,
          Math.ceil(issue.message.length / 60) * 16,
        ),
      );
    }
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF245C53' },
    };
    sheet.getRow(1).height = 30;
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: `E${sheet.rowCount}` };
    const help = book.addWorksheet('Інструкція');
    help.getColumn(1).width = 110;
    help.addRows([
      ['Імпорт відхилено. Жоден документ із цього файла не збережено.'],
      [
        `Знайдено помилок: ${issues.length}. Номери рядків відповідають вихідному Excel, заголовок — рядок 1.`,
      ],
      [
        'Виправте вихідний журнал, збережіть його та повторіть імпорт. Цей звіт не є файлом для імпорту.',
      ],
      [
        'Значення довідників порівнюються після обрізання пробілів по краях. Регістр і написання мають точно збігатися.',
      ],
      [
        'Структурні помилки XLSX можуть зупинити перевірку до перевірки всіх рядків. Після виправлення повторіть імпорт.',
      ],
    ]);
    help.eachRow((row) => {
      row.alignment = { wrapText: true, vertical: 'top' };
      row.height = 42;
    });
    return new Uint8Array(await book.xlsx.writeBuffer());
  }
}
