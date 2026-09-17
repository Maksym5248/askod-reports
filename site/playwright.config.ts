import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  outputDir: '../.data/site-tests',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4175',
    ...(process.env.PLAYWRIGHT_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_CHANNEL }
      : {}),
  },
  webServer: {
    command: 'npm run site:dev -- --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
  },
});
