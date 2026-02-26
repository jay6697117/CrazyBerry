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
  expect(result.hint).not.toContain('金币不足，无法购买种子');
  expect(result.coins).toBeGreaterThanOrEqual(0);
  expect(result.seedCount).toBeGreaterThanOrEqual(0);
});

test('auto farm borrows working capital and later repays debt', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean(window.__crazyberry));

  const debtLabel = page.locator('[data-testid="hud-debt"]');
  await expect(debtLabel).toHaveText('0');

  await page.evaluate(() => {
    const api = window.__crazyberry;
    api.forceTool('hoe');
    api.performAction(0, 0);

    // Drain initial coins while keeping only one tilled-empty tile.
    for (let i = 0; i < 10; i += 1) {
      api.forceTool('seed');
      api.performAction(0, 0);
      api.forceTool('shovel');
      api.performAction(0, 0);
    }

    api.forceTool(null);
    api.setAutoFarmEnabled(true);
  });

  await page.waitForFunction(() => {
    const economy = window.__crazyberry.getEconomyState();
    const cropCount = Object.keys(window.__crazyberry.getState().crops).length;
    return economy.loanDebtTotal > 0 && (economy.seedCount > 0 || cropCount > 0);
  });

  const debtAtBorrow = await page.evaluate(() => window.__crazyberry.getEconomyState().loanDebtTotal);
  expect(debtAtBorrow).toBeGreaterThan(0);
  await expect(debtLabel).toHaveText(String(debtAtBorrow));

  const repayResult = await page.evaluate((startDebt) => {
    const api = window.__crazyberry;
    let debtAfter = api.getEconomyState().loanDebtTotal;
    for (let i = 0; i < 30; i += 1) {
      api.simulateTicks(120, 1);
      debtAfter = api.getEconomyState().loanDebtTotal;
      if (debtAfter < startDebt) {
        return { repaid: true, debtAfter };
      }
    }
    return { repaid: false, debtAfter };
  }, debtAtBorrow);

  expect(repayResult.repaid).toBe(true);
  const debtAfterRepay = repayResult.debtAfter;
  expect(debtAfterRepay).toBeLessThan(debtAtBorrow);
});

test('auto farm avoids unrecoverable deadlock at high speed and engages speed guard', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean(window.__crazyberry));

  await page.evaluate(() => {
    const api = window.__crazyberry;
    const tiles = [
      [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 0], [1, 1], [1, 2], [1, 3], [1, 4]
    ];

    for (const [row, col] of tiles) {
      api.forceTool('hoe');
      api.performAction(row, col);
      api.forceTool('seed');
      api.performAction(row, col);
    }
    for (const [row, col] of tiles) {
      api.forceTool('shovel');
      api.performAction(row, col);
    }
    api.forceTool(null);

    api.setTimeMultiplier(64);
    api.setAutoFarmEnabled(true);
    api.simulateTicks(60, 0.2);
    api.simulateTicks(1200, 0.5);
  });

  const outcome = await page.evaluate(() => {
    const economy = window.__crazyberry.getEconomyState();
    const runtime = window.__crazyberry.getAutoRuntimeState();
    const snapshot = window.__crazyberry.getState();
    const cropCount = Object.keys(snapshot.crops).length;
    const deadlocked = economy.coins < 10 && economy.seedCount === 0 && cropCount === 0;

    return {
      deadlocked,
      runtime,
      autoEnabled: window.__crazyberry.getAutoFarmStatus().enabled
    };
  });

  expect(outcome.deadlocked).toBe(false);
  expect(outcome.autoEnabled).toBe(true);
  expect(outcome.runtime.timeMultiplier).toBe(1);
  expect(outcome.runtime.lastSpeedGuardDay).toBeGreaterThan(0);
});

test('auto farm keeps selected 32x when field is still recoverable', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean(window.__crazyberry));

  await page.evaluate(() => {
    const api = window.__crazyberry;
    const tiles = [
      [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 0], [1, 1], [1, 2], [1, 3], [1, 4]
    ];

    for (const [row, col] of tiles) {
      api.setCropStage(row, col, 2, false);
    }

    api.setTimeMultiplier(32);
    api.setAutoFarmEnabled(true);
    api.simulateTicks(120, 0.1);
  });

  const outcome = await page.evaluate(() => ({
    runtime: window.__crazyberry.getAutoRuntimeState(),
    autoEnabled: window.__crazyberry.getAutoFarmStatus().enabled
  }));

  expect(outcome.autoEnabled).toBe(true);
  expect(outcome.runtime.timeMultiplier).toBe(32);
  expect(outcome.runtime.lastSpeedGuardDay).toBe(0);
});
