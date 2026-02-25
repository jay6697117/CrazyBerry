import { test, expect } from '@playwright/test';

test('hud and toolbar reflect game state', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean(window.__crazyberry));

  await page.evaluate(() => window.__crazyberry.setDay(2));
  await expect(page.locator('[data-testid="hud-day"]')).toContainText('Day 2');

  await page.evaluate(() => window.__crazyberry.forceTool('water'));
  await expect(page.locator('[data-testid="tool-water"]')).toHaveAttribute('data-active', 'true');
});
