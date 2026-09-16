import { test, expect } from './fixtures/desktop';
import { seed, openDocuments, documents } from './helpers/journal';
test('saves a cell edit, preserves it on reload and records before/after history', async ({
  desktop: { window, api },
}) => {
  await seed(api);
  await openDocuments(window, 1);
  await window
    .getByRole('button', {
      name: 'Редагувати Короткий зміст: Тестовий документ',
      exact: true,
    })
    .click();
  await window
    .getByRole('textbox', { name: 'Короткий зміст', exact: true })
    .fill('Ручне виправлення');
  await window.getByRole('button', { name: 'Зберегти', exact: true }).click();
  await expect(
    window.getByRole('button', {
      name: 'Редагувати Короткий зміст: Ручне виправлення',
      exact: true,
    }),
  ).toBeVisible();
  await window.reload();
  await expect(
    window.getByRole('button', {
      name: 'Редагувати Короткий зміст: Ручне виправлення',
      exact: true,
    }),
  ).toBeVisible();
  const doc = (await documents(api)).items[0]!;
  const history = await (
    await api.get(`/api/documents/${doc.id}/history`)
  ).json();
  expect(history).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        source: 'manual',
        before: expect.objectContaining({ title: 'Тестовий документ' }),
        after: expect.objectContaining({ title: 'Ручне виправлення' }),
      }),
    ]),
  );
  await window.getByRole('button', { name: 'Історія', exact: true }).click();
  await expect(window.getByRole('dialog')).toContainText('Ручне редагування');
});
test('Escape cancels an edit and an invalid required field keeps the editor open', async ({
  desktop: { window, api },
}) => {
  await seed(api);
  await openDocuments(window, 1);
  const cell = window.getByRole('button', {
    name: 'Редагувати Короткий зміст: Тестовий документ',
    exact: true,
  });
  await cell.click();
  await window
    .getByRole('textbox', { name: 'Короткий зміст', exact: true })
    .fill('Не зберігати');
  await window.keyboard.press('Escape');
  await expect(cell).toBeVisible();
  expect((await documents(api)).items[0]!.version).toBe(1);
  await cell.click();
  await window
    .getByRole('textbox', { name: 'Короткий зміст', exact: true })
    .fill('');
  await window.getByRole('button', { name: 'Зберегти', exact: true }).click();
  await expect(window.getByRole('alert')).toContainText('Обов’язкове поле');
  await expect(
    window.getByRole('textbox', { name: 'Короткий зміст', exact: true }),
  ).toBeVisible();
  expect((await documents(api)).items[0]!.title).toBe('Тестовий документ');
});
test('does not overwrite a document changed after the editor opened', async ({
  desktop: { window, api },
}) => {
  await seed(api);
  await openDocuments(window, 1);
  const original = (await documents(api)).items[0]!;
  await window
    .getByRole('button', {
      name: 'Редагувати Короткий зміст: Тестовий документ',
      exact: true,
    })
    .click();
  await window
    .getByRole('textbox', { name: 'Короткий зміст', exact: true })
    .fill('Застаріле виправлення');
  expect(
    (
      await api.patch(`/api/documents/${original.id}`, {
        data: {
          version: original.version,
          field: 'title',
          value: 'Паралельна зміна',
        },
      })
    ).status(),
  ).toBe(200);
  await window.getByRole('button', { name: 'Зберегти', exact: true }).click();
  await expect(window.getByRole('alert')).toContainText('Документ уже змінено');
  expect((await documents(api)).items[0]!.title).toBe('Паралельна зміна');
});
