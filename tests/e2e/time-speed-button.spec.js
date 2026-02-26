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

  await speedBtn.click();
  await expect(speedBtn).toHaveText('2x');

  await speedBtn.click();
  await expect(speedBtn).toHaveText('4x');

  await speedBtn.click();
  await expect(speedBtn).toHaveText('8x');

  await speedBtn.click();
  await expect(speedBtn).toHaveText('16x');

  await speedBtn.click();
  await expect(speedBtn).toHaveText('32x');

  await speedBtn.click();
  await expect(speedBtn).toHaveText('64x');

  await speedBtn.click();
  await expect(speedBtn).toHaveText('1x');

  const interceptedErrors = errorMessages.filter((msg) => /intercepts pointer events/i.test(msg));
  expect(interceptedErrors).toEqual([]);
});
