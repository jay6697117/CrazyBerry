import { test, expect } from '@playwright/test';

test('postprocessing render loop does not trigger stack overflow', async ({ page }) => {
  const stackOverflowErrors = [];
  const stackOverflowPattern = /Maximum call stack size exceeded/i;

  page.on('pageerror', (error) => {
    const message = String(error?.message ?? error);
    if (stackOverflowPattern.test(message)) {
      stackOverflowErrors.push(`pageerror: ${message}`);
    }
  });

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (stackOverflowPattern.test(text)) {
      stackOverflowErrors.push(`console: ${text}`);
    }
  });

  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean(window.__crazyberry));
  await expect(page.locator('canvas')).toBeVisible();

  // Wait for a few render frames to ensure recursive rendering would surface.
  await page.waitForTimeout(800);

  expect(stackOverflowErrors).toEqual([]);
});
