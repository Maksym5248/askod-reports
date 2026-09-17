import { test, expect } from './fixtures/desktop';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
const templates: string[] = JSON.parse(
  readFileSync(
    new URL(
      '../../../backend/templates/reports/styled-appendices.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

function formatRecords(bytes: Buffer) {
  const container = XLSX.CFB.read(bytes, { type: 'buffer' });
  const stream = Buffer.from(XLSX.CFB.find(container, 'Workbook').content);
  const records: string[] = [];
  for (let offset = 0; offset + 4 <= stream.length;) {
    const id = stream.readUInt16LE(offset);
    const size = stream.readUInt16LE(offset + 2);
    if (!id && !size) break;
    // Fonts, XF alignment/borders, row/column sizes, merges and print setup.
    if ([0x31, 0xe0, 0x7d, 0x208, 0xe5, 0xa1].includes(id))
      records.push(stream.subarray(offset, offset + size + 4).toString('hex'));
    offset += size + 4;
  }
  return records;
}

test('downloads all six report templates in their original file formats', async ({
  desktop: { window, app, userData },
}, testInfo) => {
  await window.getByRole('link', { name: 'Звіти', exact: true }).click();
  await expect(
    window.getByRole('heading', { name: 'Звіти', exact: true }),
  ).toBeVisible();
  await window.getByLabel('Початок періоду').fill('2026-01-01');
  await window.getByLabel('Кінець періоду').fill('2026-03-31');
  for (let i = 0; i < 6; i++) {
    const extension = i < 4 ? 'xls' : 'docx';
    const path = join(userData, `report-${i}.${extension}`);
    const download = app.evaluate(
      ({ BrowserWindow }, path) =>
        new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('Download timed out')),
            15000,
          );
          BrowserWindow.getAllWindows()[0]!.webContents.session.once(
            'will-download',
            (_event, item) => {
              item.setSavePath(path);
              item.once('done', (_event, state) => {
                clearTimeout(timeout);
                state === 'completed' ? resolve() : reject(new Error(state));
              });
            },
          );
        }),
      path,
    );
    await Promise.all([
      download,
      window
        .getByRole('button', {
          name: `Експорт ${extension.toUpperCase()}`,
          exact: true,
        })
        .nth(i < 4 ? i : i - 4)
        .click(),
    ]);
    const bytes = await readFile(path);
    expect(bytes.subarray(0, 2).toString('hex')).toBe(i < 4 ? 'd0cf' : '504b');
    if (i < 4) {
      expect(XLSX.read(bytes).SheetNames).toEqual([
        'Sheet1',
        'Sheet2',
        'Sheet3',
      ]);
      expect(formatRecords(bytes)).toEqual(
        formatRecords(Buffer.from(templates[i]!, 'base64')),
      );
    }
  }
  await window.screenshot({
    path: testInfo.outputPath('reports.png'),
    fullPage: true,
  });
});
