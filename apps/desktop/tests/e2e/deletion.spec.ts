import { test, expect } from './fixtures/desktop';
import { seed, openDocuments, documents, uploadInUi } from './helpers/journal';
test('cancels deletion, then deletes selected rows while retaining history and rejecting reimport', async ({
  desktop: { window, api },
}) => {
  await seed(api, [{}, {}]);
  await openDocuments(window, 2);
  const original = (await documents(api)).items[0]!;
  await window
    .getByRole('checkbox', { name: 'Вибрати поточну сторінку', exact: true })
    .check();
  await window
    .getByRole('button', { name: 'Видалити вибрані', exact: true })
    .click();
  await expect(window.getByRole('dialog')).toContainText(
    'Буде приховано 2 документів',
  );
  await window.getByRole('button', { name: 'Скасувати', exact: true }).click();
  expect((await documents(api)).total).toBe(2);
  await window
    .getByRole('button', { name: 'Видалити вибрані', exact: true })
    .click();
  await window
    .getByRole('button', { name: 'Підтвердити видалення', exact: true })
    .click();
  await expect(
    window.getByText('Документів у сховищі: 0.', { exact: true }),
  ).toBeVisible();
  expect(
    await (await api.get(`/api/documents/${original.id}/history`)).json(),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ source: 'delete' }),
      expect.objectContaining({ source: 'import:created' }),
    ]),
  );
  await uploadInUi(window);
  await expect(
    window.getByRole('button', {
      name: 'Завантажити помилки Excel (1)',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    window.getByText(/Документ видалено з робочого списку/),
  ).toBeVisible();
  expect((await documents(api)).total).toBe(0);
});
test('selection is limited to the current page and clears on pagination', async ({
  desktop: { window, api },
}) => {
  await seed(
    api,
    Array.from({ length: 26 }, () => ({})),
  );
  await openDocuments(window, 26);
  await window
    .getByRole('checkbox', { name: 'Вибрати поточну сторінку', exact: true })
    .check();
  await expect(
    window.getByText('Вибрано: 25 (поточна сторінка)', { exact: true }),
  ).toBeVisible();
  await window.getByRole('button', { name: 'Далі', exact: true }).click();
  await expect(window.getByText('Сторінка 2', { exact: true })).toBeVisible();
  await expect(
    window.getByText('Вибрано: 0 (поточна сторінка)', { exact: true }),
  ).toBeVisible();
  await expect(
    window.getByRole('button', { name: 'Видалити вибрані', exact: true }),
  ).toBeDisabled();
});
