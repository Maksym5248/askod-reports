import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from './fixtures/desktop';
import { uploadInUi, documents, openDocuments } from './helpers/journal';
test('imports a journal and exposes every column and service date', async ({
  desktop: { window, api },
}) => {
  await uploadInUi(window, [{ mobilePhone: '0012345678', pageCount: 0 }]);
  await expect(
    window.getByText(
      'Імпорт завершено: додано 1, оновлено 0, без змін 0. Усього рядків: 1.',
      { exact: true },
    ),
  ).toBeVisible();
  await openDocuments(window, 1);
  await expect(window.locator('thead th')).toHaveCount(47);
  const [doc] = (await documents(api)).items;
  expect(doc).toMatchObject({
    mobilePhone: '0012345678',
    pageCount: 0,
    version: 1,
  });
  expect(doc!.createdAt).toBeTruthy();
  expect(doc!.updatedAt).toBeTruthy();
});
test('reimport keeps identity and dates for unchanged data, then updates with history', async ({
  desktop: { window, api },
}) => {
  await uploadInUi(window);
  await expect(window.getByText(/Імпорт завершено: додано 1,/)).toBeVisible();
  const original = (await documents(api)).items[0]!;
  await uploadInUi(window);
  await expect(
    window.getByText(
      'Імпорт завершено: додано 0, оновлено 0, без змін 1. Усього рядків: 1.',
      { exact: true },
    ),
  ).toBeVisible();
  expect((await documents(api)).items[0]).toMatchObject({
    id: original.id,
    updatedAt: original.updatedAt,
    version: original.version,
  });
  await uploadInUi(window, [{ title: 'Оновлений імпорт' }]);
  await expect(
    window.getByText(
      'Імпорт завершено: додано 0, оновлено 1, без змін 0. Усього рядків: 1.',
      { exact: true },
    ),
  ).toBeVisible();
  expect((await documents(api)).items[0]).toMatchObject({
    id: original.id,
    title: 'Оновлений імпорт',
    version: 2,
  });
  expect(await (await api.get('/api/imports')).json()).toHaveLength(3);
});
test('rejects the entire invalid journal and downloads an explanatory Excel report', async ({
  desktop: { window, app, api, userData },
}) => {
  await uploadInUi(window, [{}, { status: 'НЕВІДОМИЙ' }]);
  const button = window.getByRole('button', {
    name: 'Завантажити помилки Excel (1)',
    exact: true,
  });
  await expect(button).toBeVisible();
  expect((await documents(api)).total).toBe(0);
  expect(await (await api.get('/api/imports')).json()).toEqual([]);
  const path = join(userData, 'errors.xlsx');
  // Electron downloads are observed through the session, not Playwright's browser download event.
  const download = app.evaluate(
    ({ BrowserWindow }, path) =>
      new Promise<void>((resolve, reject) => {
        const session = BrowserWindow.getAllWindows()[0]!.webContents.session;
        const timeout = setTimeout(
          () => reject(new Error('Download timed out')),
          15_000,
        );
        session.once('will-download', (_event, item) => {
          item.setSavePath(path);
          item.once('done', (_event, state) => {
            clearTimeout(timeout);
            state === 'completed' ? resolve() : reject(new Error(state));
          });
        });
      }),
    path,
  );
  await Promise.all([download, button.click()]);
  const report = new ExcelJS.Workbook();
  await report.xlsx.load(await readFile(path));
  const sheet = report.getWorksheet('Помилки імпорту')!;
  expect(sheet.getCell('A2').value).toBe(3);
  expect(sheet.getCell('B2').value).toBe('Стан документа');
  expect(sheet.getCell('C2').value).toBe('НЕВІДОМИЙ');
  expect(sheet.getCell('D2').text).toContain('дозволеному переліку');
  expect(sheet.getCell('E2').value).toBe('Чернетка');
});
test('blocks a wrong file extension before sending a POST', async ({
  desktop: { window },
}) => {
  let posts = 0;
  window.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/imports')) posts++;
  });
  await uploadInUi(window, [{}], 'journal.txt');
  await expect(
    window.getByText('Оберіть непорожній XLSX-файл розміром до 10 МБ.', {
      exact: true,
    }),
  ).toBeVisible();
  expect(posts).toBe(0);
});
