import path from 'node:path';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const SCREENSHOT_DIR =
  process.env['CURATOR_AUDIT_SHOT_DIR'] ??
  path.resolve(__dirname, 'screenshots/curator-flow-2026-05-28');

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAAB+VS/3AAAAAXNSR0IArs4c6QAAA8RJREFUeNrt0sENwjAQAEHzv2pPiE5gAjj7y1jqWnK1Hjvr5wWl9ZGAAAQgAAEIQABCBOA4AAARxsmlfMP/k3l8XKAAA///7ow4ChQQAAEIQAACEIAQAAEIYHWVA9D9p+vd+8fOZJ5gAAAAASUVORK5CYII=';

const STOCK_IMAGE_PATH = path.join(SCREENSHOT_DIR, 'mom-stock.png');

test.beforeAll(() => {
  if (!existsSync(SCREENSHOT_DIR)) {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  writeFileSync(STOCK_IMAGE_PATH, Buffer.from(TINY_PNG_BASE64, 'base64'));
});

type ViewportLabel = 'mobile' | 'desktop';
const VIEWPORTS: Record<ViewportLabel, { width: number; height: number }> = {
  mobile: { width: 375, height: 812 },
  desktop: { width: 1280, height: 800 },
};

async function snap(page: Page, viewport: ViewportLabel, name: string) {
  const out = path.join(SCREENSHOT_DIR, `${viewport}-${name}.png`);
  try {
    await page.screenshot({ path: out, fullPage: true });
  } catch {}
  return out;
}

async function waitForBuildOrSignup(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
}

async function isOnBuild(page: Page): Promise<boolean> {
  const url = new URL(page.url());
  return url.pathname === '/build' || url.pathname.startsWith('/build/');
}

async function sendChatTurn(page: Page, message: string) {
  const input = page.locator('#chat-input');
  await input.waitFor({ state: 'visible', timeout: 20_000 });
  await input.fill(message);
  const sendBtn = page.getByRole('button', { name: /send message/i });
  await sendBtn.click();
}

async function waitForPeekResponse(page: Page, after: number, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const count = await page.locator('[aria-label="Peek replied"]').count();
    if (count > after) return count;
    await page.waitForTimeout(500);
  }
  return await page.locator('[aria-label="Peek replied"]').count();
}

for (const viewport of ['mobile', 'desktop'] as const) {
  test.describe(`curator flow audit (${viewport})`, () => {
    test.use({
      viewport: VIEWPORTS[viewport],
      ignoreHTTPSErrors: true,
    });
    test.describe.configure({ retries: 0 });
    test.setTimeout(240_000);

    test('drive curator-flow against live and capture screenshots', async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(err.message));

      await page.goto('https://vnext.peek.gift/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await snap(page, viewport, '01-landing');

      const makeOne = page
        .getByRole('link', { name: /make one/i })
        .first();
      await makeOne.click();
      await waitForBuildOrSignup(page);

      if (!(await isOnBuild(page))) {
        await snap(page, viewport, '02-signup-wall');
        await page.goto('https://vnext.peek.gift/build', {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForTimeout(2500);
      }

      await snap(page, viewport, '03-build-loaded');

      if (!(await isOnBuild(page))) {
        await snap(page, viewport, '03b-build-redirected-back-to-auth');
        writeFileSync(
          path.join(SCREENSHOT_DIR, `${viewport}-flow-status.txt`),
          `mobile_anon_flow_blocked=true final_url=${page.url()}\n`
        );
        return;
      }

      try {
        await sendChatTurn(
          page,
          "It's for my mom Cathy. Mother's Day. She loves cozy, sentimental things, warm tones. I want this to feel personal — not like a gift card."
        );
        await waitForPeekResponse(page, 0);
        await page.waitForTimeout(2500);
        await snap(page, viewport, '04-after-first-message');

        await sendChatTurn(
          page,
          "She's 68, lives in Connecticut. She loves gardening, sentimental jewelry, and tea. Older mom vibe — warm, sentimental, a little tearjerker."
        );
        await waitForPeekResponse(page, 1);
        await page.waitForTimeout(2500);
        await snap(page, viewport, '05-after-second-message');

        const fileInput = page.locator('input[type="file"]').first();
        if ((await fileInput.count()) > 0) {
          await fileInput.setInputFiles(STOCK_IMAGE_PATH);
          await page.waitForTimeout(3500);
          await snap(page, viewport, '06-after-image-upload');
        } else {
          await snap(page, viewport, '06-image-upload-missing');
        }

        await sendChatTurn(
          page,
          'Make the hero feel cozy and warm — golden hour, soft sentimental energy.'
        );
        await page.waitForTimeout(8000);
        await snap(page, viewport, '07-after-hero-warmth-request');

        await sendChatTurn(
          page,
          'Add a card for a vintage gold heart locket she could wear — make it feel like a real piece, not Amazon.'
        );
        await page.waitForTimeout(10_000);
        await snap(page, viewport, '08-after-card-request');

        await sendChatTurn(
          page,
          'Now add a sentimental gag card: "Mom we both know you stole my favorite sweater in 1998."'
        );
        await page.waitForTimeout(8000);
        await snap(page, viewport, '09-after-gag-card');

        await sendChatTurn(
          page,
          'One more — an activity card: "Take you to your favorite garden center in May."'
        );
        await page.waitForTimeout(8000);
        await snap(page, viewport, '10-after-activity-card');

        await page.waitForTimeout(5000);
        await snap(page, viewport, '11-final-build-state');

        const bodyText = await page.locator('body').innerText();
        const hitWall =
          /sign\s?(in|up)|create an account|save your work|publish a peek to unlock/i.test(
            bodyText
          );
        if (hitWall) {
          await snap(page, viewport, '12-auth-or-meter-wall');
        }

        const previewPane = page.locator(
          '[data-testid="preview-pane"], [aria-label*="Preview"], main'
        );
        if ((await previewPane.count()) > 0) {
          try {
            await previewPane.first().screenshot({
              path: path.join(
                SCREENSHOT_DIR,
                `${viewport}-13-preview-isolated.png`
              ),
            });
          } catch {}
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        writeFileSync(
          path.join(SCREENSHOT_DIR, `${viewport}-flow-error.txt`),
          message
        );
        await snap(page, viewport, '99-error');
      }

      writeFileSync(
        path.join(SCREENSHOT_DIR, `${viewport}-console-errors.txt`),
        consoleErrors.join('\n')
      );

      expect(true).toBe(true);
    });

    test('recipient view of a known peek', async ({ page }) => {
      const slug = '31ee6438df38';
      const resp = await page.goto(`https://vnext.peek.gift/g/${slug}`, {
        waitUntil: 'domcontentloaded',
      });
      const status = resp?.status() ?? 0;
      await page.waitForTimeout(1500);
      await snap(page, viewport, `r01-pre-reveal-status-${status}`);
      await page.waitForTimeout(2500);
      await snap(page, viewport, 'r02-mid-reveal');
      await page.waitForTimeout(4000);
      await snap(page, viewport, 'r03-post-reveal');

      writeFileSync(
        path.join(SCREENSHOT_DIR, `${viewport}-recipient-status.txt`),
        `slug=${slug} status=${status}\n`
      );

      expect(true).toBe(true);
    });
  });
}
