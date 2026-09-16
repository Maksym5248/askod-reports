import {
  test as base,
  expect,
  _electron as electron,
  request,
  type ElectronApplication,
  type Page,
  type APIRequestContext,
} from '@playwright/test';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
type Desktop = {
  app: ElectronApplication;
  window: Page;
  api: APIRequestContext;
  userData: string;
};
export const test = base.extend<{ desktop: Desktop }>({
  desktop: async ({}, use, testInfo) => {
    const userData = await realpath(
      await mkdtemp(join(tmpdir(), 'askod-e2e-')),
    );
    let app: ElectronApplication | undefined;
    let api: APIRequestContext | undefined;
    let window: Page | undefined;
    const errors: string[] = [];
    const logs: string[] = [];
    let tracing = false;
    try {
      const env = Object.fromEntries(
        Object.entries(process.env).filter(
          ([key, value]) =>
            key !== 'ELECTRON_RUN_AS_NODE' && value !== undefined,
        ),
      ) as Record<string, string>;
      app = await electron.launch({
        args: [
          fileURLToPath(new URL('../../../', import.meta.url)),
          `--user-data-dir=${userData}`,
        ],
        env,
        timeout: 30_000,
      });
      expect(await app.evaluate(({ app }) => app.getPath('userData'))).toBe(
        userData,
      );
      await app
        .context()
        .tracing.start({ screenshots: true, snapshots: true, sources: true });
      tracing = true;
      window = await app.firstWindow();
      window.on('pageerror', (error) => errors.push(error.message));
      window.on('console', (message) => {
        if (message.type() === 'error') logs.push(message.text());
      });
      await window.waitForLoadState('domcontentloaded');
      const config = await window.evaluate(() =>
        globalThis.window.askod!.getRuntimeConfig(),
      );
      api = await request.newContext({
        baseURL: config.apiUrl,
        extraHTTPHeaders: { Authorization: `Bearer ${config.token}` },
      });
      await use({ app, window, api, userData });
      expect(errors, 'Unhandled renderer exceptions').toEqual([]);
    } finally {
      // Diagnostics must not prevent shutdown or removal of the temporary database.
      try {
        if (testInfo.status !== testInfo.expectedStatus || errors.length > 0) {
          if (window && !window.isClosed()) {
            const path = testInfo.outputPath('failure.png');
            await window
              .screenshot({ path, timeout: 5000 })
              .then(() =>
                testInfo.attach('screenshot', {
                  path,
                  contentType: 'image/png',
                }),
              )
              .catch(() => {});
          }
          await testInfo.attach('renderer-errors', {
            body: JSON.stringify({ errors, logs }, null, 2),
            contentType: 'application/json',
          });
          if (app && tracing) {
            const path = testInfo.outputPath('trace.zip');
            await app
              .context()
              .tracing.stop({ path })
              .then(() =>
                testInfo.attach('trace', {
                  path,
                  contentType: 'application/zip',
                }),
              )
              .catch(() => {});
          }
        } else if (app && tracing) await app.context().tracing.stop();
      } finally {
        try {
          await api?.dispose();
        } finally {
          try {
            await app?.close();
          } finally {
            await rm(userData, { recursive: true, force: true });
          }
        }
      }
    }
  },
});
export { expect };
export type { Desktop };
