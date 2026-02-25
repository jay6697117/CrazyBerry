import { test, expect } from '@playwright/test';

test('game renders canvas and supports player movement input', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean(window.__crazyberry));
  await expect(page.locator('canvas')).toBeVisible();

  const before = await page.evaluate(() => window.__crazyberry.getPlayerPosition());
  await page.keyboard.down('d');
  await page.waitForTimeout(250);
  await page.keyboard.up('d');
  const after = await page.evaluate(() => window.__crazyberry.getPlayerPosition());

  expect(after.x).toBeGreaterThan(before.x);
});
