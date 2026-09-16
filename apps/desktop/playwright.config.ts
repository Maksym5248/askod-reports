import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: fileURLToPath(new URL('../../.data/e2e/results', import.meta.url)),
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: fileURLToPath(
          new URL('../../.data/e2e/report', import.meta.url),
        ),
        open: 'never',
      },
    ],
  ],
});
