import { test, expect } from '@playwright/test';

test('hud weather icon follows deterministic day cycle', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean(window.__crazyberry));

  await page.evaluate(() => window.__crazyberry.setDay(1));
  await expect(page.locator('[data-testid="hud-day"]')).toContainText('第 1 天');
  await expect(page.locator('[data-testid="hud-weather"]')).toContainText('☀️');

  await page.evaluate(() => window.__crazyberry.setDay(2));
  await expect(page.locator('[data-testid="hud-weather"]')).toContainText('☁️');

  await page.evaluate(() => window.__crazyberry.setDay(3));
  await expect(page.locator('[data-testid="hud-weather"]')).toContainText('🌧️');

  await expect(page.locator('[data-testid="hud-clock"]')).not.toHaveText('');
});
