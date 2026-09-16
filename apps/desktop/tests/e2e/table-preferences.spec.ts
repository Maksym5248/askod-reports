import { test, expect } from './fixtures/desktop';
import { seed, openDocuments } from './helpers/journal';
test('persists compact mode after reload', async ({ desktop: { window } }) => {
  await window.getByRole('link', { name: 'Налаштування', exact: true }).click();
  const compact = window.getByRole('switch', { name: 'Компактні таблиці' });
  await expect(compact).not.toBeChecked();
  await compact.check();
  await window.reload();
  await expect(compact).toBeChecked();
});
test('persists column order and visibility, then restores the original journal layout', async ({
  desktop: { window, api },
}) => {
  await seed(api);
  await openDocuments(window, 1);
  const original = await window.locator('thead th').allTextContents();
  await window.getByRole('button', { name: 'Колонки', exact: true }).click();
  await window
    .getByRole('button', { name: 'Праворуч Короткий зміст', exact: true })
    .click();
  await window.getByRole('checkbox', { name: 'Дод.', exact: true }).uncheck();
  await window.keyboard.press('Escape');
  await expect(window.getByRole('dialog')).not.toBeVisible();
  await window.reload();
  await expect(window.locator('thead th')).toHaveCount(46);
  const reordered = await window.locator('thead th').allTextContents();
  expect(reordered.indexOf('Арк.')).toBeLessThan(
    reordered.indexOf('Короткий зміст'),
  );
  expect(reordered).not.toContain('Дод.');
  await window.getByRole('button', { name: 'Колонки', exact: true }).click();
  await window
    .getByRole('button', { name: 'Відновити вигляд як у файлі', exact: true })
    .click();
  await window.keyboard.press('Escape');
  await expect(window.getByRole('dialog')).not.toBeVisible();
  await expect(window.locator('thead th')).toHaveCount(47);
  expect(await window.locator('thead th').allTextContents()).toEqual(original);
});
