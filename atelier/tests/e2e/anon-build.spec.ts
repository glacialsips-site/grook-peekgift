import { expect, test } from '@playwright/test';

test.describe('Anonymous /build flow', () => {
  test('visiting /build either redirects to sign-in or starts a draft peek', async ({
    page,
  }) => {
    const response = await page.goto('/build', { waitUntil: 'load' });
    expect(response).not.toBeNull();
    expect([200, 302, 303, 307, 308]).toContain(response?.status() ?? 0);
    await expect(page).toHaveURL(/(\/sign-in|\/build)/);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('clicking Start a Peek from the landing page lands on /build or /sign-in', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /start a peek/i }).click();
    await page.waitForLoadState('load');
    await expect(page).toHaveURL(/(\/build|\/sign-in)/);
  });
});
