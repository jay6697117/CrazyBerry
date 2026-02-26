import { test, expect } from '@playwright/test';

test('reset save button resets to a fresh slot and persists after reload', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean(window.__crazyberry));

  await page.evaluate(() => {
    const api = window.__crazyberry;
    api.setDay(7);
    api.forceTool('seed');
    api.performAction(0, 0);
    api.setAutoFarmEnabled(true);
  });

  await expect(page.locator('[data-testid="hud-day"]')).toContainText('第 7 天');
  await expect(page.locator('[data-testid="toggle-auto-farm"]')).toHaveAttribute('data-active', 'true');
  await expect(page.locator('[data-testid="hud-coins"]')).toHaveText('90');

  const resetButton = page.locator('[data-testid="reset-save-btn"]');
  await expect(resetButton).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await resetButton.click();

  await expect(page.locator('[data-testid="hud-day"]')).toContainText('第 1 天');
  await expect(page.locator('[data-testid="hud-clock"]')).toHaveText('上午 06:00');
  await expect(page.locator('[data-testid="toggle-auto-farm"]')).toHaveAttribute('data-active', 'false');
  await expect(page.locator('[data-testid="toolbar-active"]')).toContainText('工具：自动');
  await expect(page.locator('[data-testid="hud-coins"]')).toHaveText('100');
  await expect(page.locator('[data-testid="hud-strawberry"]')).toHaveText('0');
  await expect(page.locator('[data-testid="toolbar-seeds"]')).toHaveText('0');

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__crazyberry));

  await expect(page.locator('[data-testid="hud-day"]')).toContainText('第 1 天');
  await expect(page.locator('[data-testid="hud-coins"]')).toHaveText('100');
  await expect(page.locator('[data-testid="toggle-auto-farm"]')).toHaveAttribute('data-active', 'false');
});
