import { expect, test } from '@playwright/test';

test.describe('Landing page', () => {
  test('renders the peek.gift heading and primary CTA', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /peek\.gift/i }),
    ).toBeVisible();
    const startCta = page.getByRole('link', { name: /start a peek/i });
    await expect(startCta).toBeVisible();
    await expect(startCta).toHaveAttribute('href', /\/build/);
  });

  test('shows a sign-in link that points to /sign-in', async ({ page }) => {
    await page.goto('/');
    const signIn = page.getByRole('link', { name: /sign in/i });
    await expect(signIn).toBeVisible();
    await expect(signIn).toHaveAttribute('href', /\/sign-in/);
  });
});
