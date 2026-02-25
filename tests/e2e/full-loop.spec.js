import { test, expect } from '@playwright/test';

test('full loop advances economy and harvest count', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean(window.__crazyberry));

  await page.evaluate(() => window.__crazyberry.debugRunFullLoop());
  const state = await page.evaluate(() => window.__crazyberry.getState());

  expect(state.dayNumber).toBeGreaterThan(1);
  expect(state.economy.coins).toBeGreaterThan(100);
  expect(state.inventory.totalHarvested).toBeGreaterThan(0);
});
