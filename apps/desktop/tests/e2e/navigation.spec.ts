import { test, expect } from './fixtures/desktop';
import { seed, openDocuments } from './helpers/journal';
test('navigates between pages and restores an import route on reload', async ({
  desktop: { window },
}) => {
  await window.getByRole('link', { name: 'Імпорти', exact: true }).click();
  await expect(
    window.getByRole('heading', { name: 'Імпорт з Excel', exact: true }),
  ).toBeVisible();
  await window.reload();
  await expect(window).toHaveURL(/#\/imports$/);
  await expect(
    window.getByRole('heading', { name: 'Імпорт з Excel', exact: true }),
  ).toBeVisible();
  await window.getByRole('link', { name: 'Налаштування', exact: true }).click();
  await expect(
    window.getByRole('heading', { name: 'Налаштування', exact: true }),
  ).toBeVisible();
  await window.goBack();
  await expect(window).toHaveURL(/#\/imports$/);
});
test('shows 404 for an unknown route and returns to documents', async ({
  desktop: { window },
}) => {
  await window.evaluate(() => {
    location.hash = '/missing';
  });
  await expect(
    window.getByRole('heading', { name: 'Сторінку не знайдено' }),
  ).toBeVisible();
  await window.getByRole('link', { name: 'До документів' }).click();
  await expect(
    window.getByRole('heading', { name: 'Документи', exact: true }),
  ).toBeVisible();
});
test('paginates real documents and retains page 2 after reload', async ({
  desktop: { window, api },
}) => {
  await seed(
    api,
    Array.from({ length: 26 }, () => ({})),
  );
  await openDocuments(window, 26);
  await expect(window.locator('tbody tr')).toHaveCount(25);
  await window.getByRole('button', { name: 'Далі', exact: true }).click();
  await expect(window.getByText('Сторінка 2', { exact: true })).toBeVisible();
  await expect(window.locator('tbody tr')).toHaveCount(1);
  await window.reload();
  await expect(window.getByText('Сторінка 2', { exact: true })).toBeVisible();
  await expect(window.locator('tbody tr')).toHaveCount(1);
  await expect(
    window.getByRole('button', { name: 'Далі', exact: true }),
  ).toBeDisabled();
});
