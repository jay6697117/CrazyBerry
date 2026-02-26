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

test('auto farm waters crops when seeds are unavailable and unaffordable', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean(window.__crazyberry));

  await page.evaluate(() => {
    const api = window.__crazyberry;
    const spendTiles = [
      [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 0], [1, 1], [1, 2], [1, 3], [1, 4]
    ];

    for (const [row, col] of spendTiles) {
      api.forceTool('hoe');
      api.performAction(row, col);
      api.forceTool('seed');
      api.performAction(row, col);
    }

    api.setCropStage(5, 5, 2, false);

    api.forceTool('hoe');
    api.performAction(4, 5);
    api.forceTool(null);

    api.setAutoFarmEnabled(true);
  });

  await page.waitForFunction(() => {
    const state = window.__crazyberry.getState();
    return state.grid.tiles[5][5].wateredToday === true;
  });

  const result = await page.evaluate(() => {
    const state = window.__crazyberry.getState();
    const status = window.__crazyberry.getAutoFarmStatus();
    const hint = document.querySelector('[data-testid="hud-hint"]')?.textContent ?? '';
    return {
      wateredToday: state.grid.tiles[5][5].wateredToday,
      coins: state.economy.coins,
      seedCount: state.economy.seedCount,
      autoEnabled: status.enabled,
      actionCount: status.actionCount,
      hint
    };
  });

  expect(result.wateredToday).toBe(true);
  expect(result.autoEnabled).toBe(true);
  expect(result.actionCount).toBeGreaterThan(0);
  expect(result.coins).toBe(0);
  expect(result.seedCount).toBe(0);
  expect(result.hint).not.toContain('金币不足，无法购买种子');
});
