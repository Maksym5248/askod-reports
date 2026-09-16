import { test, expect } from './fixtures/desktop';
test('launches the workspace, reaches the backend and isolates Node APIs @smoke', async ({
  desktop: { window, api },
}) => {
  await expect(window).toHaveTitle('ASKOD Звіти');
  await expect(
    window.getByRole('region', { name: 'Таблиця документів' }),
  ).toBeVisible();
  expect(await (await api.get('/api/workspace')).json()).toEqual({
    documentCount: 0,
  });
  expect(
    await window.evaluate(
      () => typeof (globalThis as { require?: unknown }).require,
    ),
  ).toBe('undefined');
});
