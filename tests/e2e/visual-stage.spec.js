import { test, expect } from '@playwright/test';

test('debug api can switch crop stage deterministically', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean(window.__crazyberry));

  for (const stage of [1, 2, 3, 4, 5]) {
    const crop = await page.evaluate((value) => window.__crazyberry.setCropStage(0, 0, value, false), stage);
    expect(crop.stage).toBe(stage);

    const state = await page.evaluate(() => window.__crazyberry.getState());
    expect(state.crops['0,0'].stage).toBe(stage);
  }

  const withered = await page.evaluate(() => window.__crazyberry.setCropStage(0, 0, 3, true));
  expect(withered.isWithered).toBe(true);

  const state = await page.evaluate(() => window.__crazyberry.getState());
  expect(state.crops['0,0'].isWithered).toBe(true);
});
