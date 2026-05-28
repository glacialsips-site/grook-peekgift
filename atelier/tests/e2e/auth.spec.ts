import { expect, test } from '@playwright/test';

test.describe('Clerk auth flows (skipped until test mode is configured)', () => {
  test.skip(
    !process.env['CLERK_TEST_MODE'],
    'Set CLERK_TEST_MODE=1 once a Clerk test instance + test-mode env are configured in CI.',
  );

  test('sign up with Clerk test email and OTP, then sign in again', async ({
    page,
  }) => {
    const testEmail = `verify+clerk_test+${Date.now()}@example.com`;
    const testPassword = 'TestPw!_12345_p33k';

    await page.goto('/sign-up');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole('button', { name: /sign up|create account|continue/i }).click();

    await page.getByLabel(/verification|code|otp/i).fill('424242');
    await page.getByRole('button', { name: /verify|continue|submit/i }).click();

    await expect(page).toHaveURL(/\/build/, { timeout: 30_000 });

    await page.getByRole('button', { name: /sign out|log out/i }).click();

    await page.goto('/sign-in');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click();

    await expect(page).toHaveURL(/\/build/, { timeout: 30_000 });
  });
});
