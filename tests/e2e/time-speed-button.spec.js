import { test, expect } from '@playwright/test';

test('time speed button is clickable and cycles multiplier', async ({ page }) => {
  const errorMessages = [];

  page.on('pageerror', (error) => {
    errorMessages.push(String(error?.message ?? error));
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errorMessages.push(msg.text());
    }
  });

  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean(window.__crazyberry));

  const speedBtn = page.locator('[data-testid="time-speed-btn"]');
  await expect(speedBtn).toHaveText('1x');

  const expectedSequence = [
    2, 4, 8, 16, 24, 32, 48, 64,
    48, 32, 24, 16, 8, 4, 2, 1, 2
  ];

  for (const expectedMultiplier of expectedSequence) {
    await speedBtn.click();
    await expect(speedBtn).toHaveText(`${expectedMultiplier}x`);
  }

  const interceptedErrors = errorMessages.filter((msg) => /intercepts pointer events/i.test(msg));
  expect(interceptedErrors).toEqual([]);
});
