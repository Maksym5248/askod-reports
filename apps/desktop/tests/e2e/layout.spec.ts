import { test, expect } from './fixtures/desktop';
import { seed, openDocuments } from './helpers/journal';

test('fills the workspace and scrolls only the document grid at different window sizes', async ({
  desktop: { app, window, api },
}, testInfo) => {
  await seed(
    api,
    Array.from({ length: 25 }, () => ({
      title: 'Довгий зміст документа.\n'.repeat(15),
    })),
  );
  await openDocuments(window, 25);
  const grid = window.getByRole('region', {
    name: 'Таблиця документів',
    exact: true,
  });
  for (const [width, height] of [
    [960, 640],
    [1600, 1000],
  ] as const) {
    await app.evaluate(
      ({ BrowserWindow }, size) =>
        BrowserWindow.getAllWindows()[0]!.setContentSize(
          size.width,
          size.height,
        ),
      { width, height },
    );
    await expect.poll(() => window.evaluate(() => innerWidth)).toBe(width);
    await expect
      .poll(() =>
        window.evaluate(
          () =>
            document.documentElement.scrollHeight -
            document.documentElement.clientHeight,
        ),
      )
      .toBeLessThanOrEqual(1);
    await expect
      .poll(() =>
        window.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      )
      .toBeLessThanOrEqual(1);
    const bounds = await grid.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThan(width - 300);
    expect(bounds!.height).toBeGreaterThan(height === 640 ? 80 : 500);
    expect(
      (await window
        .getByRole('button', { name: 'Далі', exact: true })
        .boundingBox())!.y,
    ).toBeLessThan(height - 20);
    const overflow = await grid.evaluate((element) => ({
      vertical: element.scrollHeight > element.clientHeight,
      horizontal: element.scrollWidth > element.clientWidth,
    }));
    expect(overflow).toEqual({ vertical: true, horizontal: true });
    await grid.evaluate((element) => {
      element.scrollTop = 350;
      element.scrollLeft = 600;
    });
    await expect
      .poll(() => grid.evaluate((element) => element.scrollTop))
      .toBe(350);
    expect(await window.evaluate(() => scrollY)).toBe(0);
    expect(
      (await window
        .getByRole('button', { name: 'Далі', exact: true })
        .boundingBox())!.y,
    ).toBeLessThan(height - 20);
  }
  await grid.evaluate((element) => {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  });
  await window.screenshot({
    path: testInfo.outputPath('document-workspace.png'),
  });
});
