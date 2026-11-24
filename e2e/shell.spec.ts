import { expect, test } from '@playwright/test';

test('app shell loads with the coach disclaimer and a manifest', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Motivator' })).toBeVisible();
  await expect(page.getByText(/coach, not a therapist/i)).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
});

test('no requests leave the origin on first load', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const external: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.protocol.startsWith('http') && url.origin !== origin) external.push(req.url());
  });
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
});
