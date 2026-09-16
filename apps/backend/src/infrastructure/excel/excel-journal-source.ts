import ExcelJS from 'exceljs';
import yauzl from 'yauzl';
import { createHash } from 'node:crypto';
import { ImportValidationError } from '../../domain/index';
import type { SourceRow, SourceValue } from '../../domain/index';
import type { JournalSource } from '../../application/index';
import { journalColumns } from './journal-columns';

const fail = (message: string, row = 1, field = ''): never => {
  throw new ImportValidationError([{ row, field, message }]);
};

// Bound the expanded archive before ExcelJS allocates worksheet data.
async function validateArchive(bytes: Buffer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    yauzl.fromBuffer(bytes, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) {
        reject(
          new ImportValidationError([
            { row: 1, field: '', message: 'Файл не є коректним XLSX-архівом' },
          ]),
        );
        return;
      }
      let size = 0;
      let entries = 0;
      zip.on('error', reject);
      zip.on('end', resolve);
      zip.on('entry', (entry: yauzl.Entry) => {
        size += entry.uncompressedSize;
        entries++;
        if (
          size > 50 * 1024 * 1024 ||
          entries > 1000 ||
          entry.generalPurposeBitFlag & 1
        ) {
          zip.close();
          reject(
            new ImportValidationError([
              {
                row: 1,
                field: '',
                message: 'Архів завеликий або захищений паролем',
              },
            ]),
          );
          return;
        }
        zip.readEntry();
      });
      zip.readEntry();
    });
  });
}

function cellValue(cell: ExcelJS.Cell): SourceValue {
  const value = cell.value;
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime()))
      return fail('Некоректна дата', Number(cell.row), cell.address);
    return value.toISOString();
  }
  if (typeof value !== 'object') return value;
  if ('richText' in value)
    return value.richText.map((part) => part.text).join('');
  if ('hyperlink' in value) return value.text;
  return fail(
    'Формули та помилки Excel не підтримуються. Експортуйте значення.',
    Number(cell.row),
    cell.address,
  );
}

const normalizeHeader = (text: string) =>
  text.trim().replace(/\s+/g, ' ').replace(/[’ʼ]/g, "'");

export class ExcelJournalSource implements JournalSource {
  async parse(input: Uint8Array) {
    if (!input.byteLength || input.byteLength > 10 * 1024 * 1024)
      return fail('Оберіть непорожній XLSX до 10 МБ');
    const bytes = Buffer.from(input);
    try {
      await validateArchive(bytes);
    } catch (error) {
      if (error instanceof ImportValidationError) throw error;
      return fail('Не вдалося прочитати XLSX-архів');
    }
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
    } catch {
      return fail(
        'Не вдалося прочитати Excel. Потрібен файл .xlsx з експорту АСКОД.',
      );
    }
    const sheets = workbook.worksheets.filter(
      (sheet) => sheet.actualRowCount > 0,
    );
    if (sheets.length !== 1)
      return fail('Очікується один заповнений аркуш журналу');
    const sheet = sheets[0]!;
    if (sheet.rowCount > 10001 || sheet.columnCount > 100)
      return fail('Ліміт імпорту — 10 000 рядків та 100 колонок');
    const positions = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, column) => {
      const header = normalizeHeader(String(cellValue(cell) ?? ''));
      if (!header) return;
      if (positions.has(header))
        return fail(`Заголовок повторюється: ${header}`);
      positions.set(header, column);
    });
    const expected = new Set(
      journalColumns.map((column) => normalizeHeader(column.header)),
    );
    for (const column of journalColumns) {
      if (!positions.has(normalizeHeader(column.header)))
        return fail(`Відсутня колонка «${column.header}»`);
    }
    for (const header of positions.keys()) {
      if (!expected.has(header))
        return fail(
          `Невідома колонка «${header}». Потрібно оновити схему імпорту.`,
        );
    }
    const covered = new Set(positions.values());
    const rows: SourceRow[] = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      if (!row.hasValues) continue;
      row.eachCell((cell, column) => {
        if (!covered.has(column) && cellValue(cell) !== null)
          fail('Значення в колонці без заголовка', rowNumber, cell.address);
      });
      const values: Record<string, SourceValue> = {};
      const raw: Record<string, SourceValue> = {};
      for (const column of journalColumns) {
        const cell = row.getCell(
          positions.get(normalizeHeader(column.header))!,
        );
        const value = cellValue(cell);
        raw[column.header] = value;
        if (
          (column.type === 'date' || column.type === 'requiredDate') &&
          value !== null &&
          value !== ''
        ) {
          if (cell.value instanceof Date)
            values[column.field] = value.toString().slice(0, 10);
          else if (typeof value === 'number') {
            // Excel's 1900 calendar has a fictitious leap day; 1904 workbooks have a different epoch.
            if (
              !Number.isInteger(value) ||
              value < 1 ||
              value > 2958465 ||
              (!workbook.properties.date1904 && value === 60)
            )
              fail('Некоректна Excel-дата', rowNumber, column.header);
            const epoch = workbook.properties.date1904
              ? Date.UTC(1904, 0, 1)
              : Date.UTC(1899, 11, 31);
            const days =
              !workbook.properties.date1904 && value > 60 ? value - 1 : value;
            values[column.field] = new Date(epoch + days * 86400000)
              .toISOString()
              .slice(0, 10);
          } else values[column.field] = value;
        } else values[column.field] = value;
      }
      if (
        Object.values(raw).some(
          (value) => value !== null && String(value).trim() !== '',
        )
      )
        rows.push({ rowNumber, values, raw });
    }
    return {
      rows,
      sheetName: sheet.name,
      fileHash: createHash('sha256').update(bytes).digest('hex'),
    };
  }
}
