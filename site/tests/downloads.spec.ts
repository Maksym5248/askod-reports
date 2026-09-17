import { test, expect } from '@playwright/test';
const api =
  'https://api.github.com/repos/Maksym5248/askod-reports/releases/latest';
const releases = 'https://github.com/Maksym5248/askod-reports/releases';
function asset(suffix: string, version = '0.1.1') {
  const name = `ASKOD-Reports-${version}-${suffix}`;
  return {
    name,
    browser_download_url: `${releases}/download/v${version}/${name}`,
    state: 'uploaded',
    size: 104857600,
  };
}
const release = {
  tag_name: 'v0.1.1',
  html_url: `${releases}/tag/v0.1.1`,
  draft: false,
  prerelease: false,
};
test('links to current assets and never substitutes old macOS builds', async ({
  page,
}) => {
  await page.route(api, (route) =>
    route.fulfill({
      json: {
        ...release,
        assets: [
          asset('win-x64.exe'),
          asset('linux-amd64.deb'),
          asset('linux-x86_64.AppImage'),
          asset('mac-arm64.dmg', '0.1.0'),
        ],
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('0.1.1');
  await expect(
    page.getByRole('link', { name: 'Завантажити інсталятор' }),
  ).toHaveAttribute('href', asset('win-x64.exe').browser_download_url);
  await expect(page.getByRole('link', { name: 'DEB-пакет' })).toHaveAttribute(
    'href',
    asset('linux-amd64.deb').browser_download_url,
  );
  await expect(
    page.getByRole('link', { name: 'Завантажити AppImage' }),
  ).toHaveAttribute(
    'href',
    asset('linux-x86_64.AppImage').browser_download_url,
  );
  await expect(page.locator('#mac')).toContainText('ще не опубліковано');
  await expect(page.locator('#mac a')).toHaveCount(0);
});
test('shows a pending state before the first release', async ({ page }) => {
  await page.route(api, (route) => route.fulfill({ status: 404, json: {} }));
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Перший реліз');
  await expect(page.locator('.downloads a')).toHaveCount(0);
});
test('keeps release links available on API failure', async ({ page }) => {
  await page.route(api, (route) => route.fulfill({ status: 403, json: {} }));
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Відкрити GitHub Releases' }),
  ).toHaveCount(3);
});
test('rejects download URLs outside the repository', async ({ page }) => {
  await page.route(api, (route) =>
    route.fulfill({
      json: {
        ...release,
        assets: [
          {
            ...asset('win-x64.exe'),
            browser_download_url: 'https://example.com/download.exe',
          },
        ],
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('0.1.1');
  await expect(page.locator('.downloads a')).toHaveCount(0);
});
test('supports mobile layout with available builds', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(api, (route) =>
    route.fulfill({
      json: {
        ...release,
        assets: [
          asset('win-x64.exe'),
          asset('linux-x86_64.AppImage'),
          asset('mac-arm64.dmg'),
        ],
      },
    }),
  );
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'DMG · Apple Silicon' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath('mobile.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: info.outputPath('desktop.png'),
    fullPage: true,
  });
});
