import { _electron as electron } from 'playwright-core';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

// Requires a GUI session and npm run build. Uses the normal desktop userData database.
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key, value]) => key !== 'ELECTRON_RUN_AS_NODE' && value !== undefined,
  ),
) as Record<string, string>;
const app = await electron.launch({ args: [resolve('apps/desktop')], env });
try {
  const page = await app.firstWindow();
  await page
    .getByRole('heading', { name: 'Робочий простір готовий' })
    .waitFor({ timeout: 30_000 });
  assert.equal(await page.title(), 'ASKOD Звіти');
  assert.equal(
    await page.evaluate(
      () => typeof (globalThis as { require?: unknown }).require,
    ),
    'undefined',
  );
  await mkdir('.data', { recursive: true });
  await page.screenshot({ path: '.data/desktop-smoke.png' });
  console.log(
    'Electron smoke passed: renderer → HTTP → SQLite; Node globals isolated.',
  );
} finally {
  await app.close();
}
