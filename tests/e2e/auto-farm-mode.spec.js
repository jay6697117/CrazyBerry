import { test, expect } from '@playwright/test';

test('auto farm moves player, runs task loop, and yields to manual input', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean(window.__crazyberry));

  const autoBtn = page.locator('[data-testid="toggle-auto-farm"]');
  await expect(autoBtn).toHaveAttribute('data-active', 'false');

  await page.evaluate(() => {
    window.__crazyberry.setCropStage(0, 0, 5, false);
  });

  const beforePos = await page.evaluate(() => window.__crazyberry.getPlayerPosition());

  await autoBtn.click();
  await expect(autoBtn).toHaveAttribute('data-active', 'true');

  await page.waitForFunction(() => {
    const status = window.__crazyberry.getAutoFarmStatus();
    const snapshot = window.__crazyberry.getState();
    return status.actionCount > 0 && status.tradeCount > 0 && snapshot.inventory.totalHarvested > 0;
  });

  const afterPos = await page.evaluate(() => window.__crazyberry.getPlayerPosition());
  const movedDistance = Math.hypot(afterPos.x - beforePos.x, afterPos.z - beforePos.z);
  expect(movedDistance).toBeGreaterThan(0.01);

  await page.keyboard.down('d');
  await page.waitForTimeout(120);
  await page.keyboard.up('d');

  await expect(autoBtn).toHaveAttribute('data-active', 'false');
  const statusAfterManual = await page.evaluate(() => window.__crazyberry.getAutoFarmStatus());
  expect(statusAfterManual.enabled).toBe(false);
});
