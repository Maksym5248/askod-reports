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
    window.getByRole('heading', { name: 'Вхідні документи', exact: true }),
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
  await window.getByRole('button', { name: 'Сторінка 2', exact: true }).click();
  await expect(
    window.getByRole('button', { name: 'Сторінка 2', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(window.locator('tbody tr')).toHaveCount(1);
  await window.reload();
  await expect(
    window.getByRole('button', { name: 'Сторінка 2', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(window.locator('tbody tr')).toHaveCount(1);
  await expect(
    window.getByRole('button', { name: 'Далі', exact: true }),
  ).toBeDisabled();
});

test('applies popover filters explicitly and keeps search when filters are reset', async ({
  desktop: { window, api },
}) => {
  await seed(api, [
    { title: 'Спільний текст', documentType: 'Скарга' },
    { title: 'Спільний текст', documentType: 'Заява (клопотання)' },
  ]);
  await openDocuments(window, 2);
  await expect(
    window.getByRole('button', { name: 'Видалити вибрані', exact: true }),
  ).not.toBeVisible();
  await expect(window.getByText('Робочий простір готовий')).not.toBeVisible();
  const search = window.getByRole('textbox', {
    name: 'Пошук за номером, змістом або заявником',
  });
  await search.fill('Спільний');
  await search.press('Enter');
  await expect(window).toHaveURL(/search=/);
  await window.getByRole('button', { name: 'Фільтри', exact: true }).click();
  await window
    .getByRole('combobox', { name: 'Вид документа', exact: true })
    .click();
  await window.getByRole('option', { name: 'Скарга', exact: true }).click();
  expect(window.url()).not.toContain('documentType=');
  await window
    .getByRole('button', { name: 'Застосувати', exact: true })
    .click();
  await expect(window.getByLabel('Діапазон документів')).toHaveText('1–1 з 1');
  await window
    .getByRole('button', { name: 'Фільтри · 1', exact: true })
    .click();
  await window.getByRole('button', { name: 'Скинути', exact: true }).click();
  await expect(window.getByLabel('Діапазон документів')).toHaveText('1–2 з 2');
  await expect(search).toHaveValue('Спільний');
});
