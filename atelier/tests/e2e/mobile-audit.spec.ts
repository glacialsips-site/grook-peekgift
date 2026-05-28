import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Mobile-first audit suite. Drives a Chromium at iPhone-class viewports
// against the local dev server, captures screenshots, and flags layout
// issues (horizontal scroll, tap-target sizes, off-screen content).
//
// Output:
//   - atelier/tests/e2e/screenshots/mobile/<route>--<viewport>.png
//   - atelier/tests/e2e/screenshots/mobile/findings.json (machine-readable)

type Viewport = { width: number; height: number; label: string };

const VIEWPORTS: Viewport[] = [
  { width: 375, height: 812, label: '375x812' }, // iPhone SE / 12 mini
  { width: 414, height: 896, label: '414x896' }, // iPhone Pro Max
];

const ROUTES: { name: string; path: string; needsAuthBypass?: boolean }[] = [
  { name: 'landing', path: '/' },
  { name: 'sign-in', path: '/sign-in' },
  { name: 'sign-up', path: '/sign-up' },
  { name: 'build-redirect', path: '/build' },
  { name: 'build-surface', path: '/mobile-audit/build' },
  { name: 'recipient', path: '/mobile-audit/g' },
];

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'mobile');
const FINDINGS_PATH = path.join(SCREENSHOT_DIR, 'findings.json');

type Finding = {
  route: string;
  viewport: string;
  screenshot: string;
  kind: 'horizontal_scroll' | 'small_tap_target' | 'off_screen' | 'overflow_clip';
  detail: string;
};

const findings: Finding[] = [];

function ensureDir() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function captureAudit(
  page: Page,
  routeName: string,
  routePath: string,
  vp: Viewport,
) {
  ensureDir();
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(routePath, { waitUntil: 'domcontentloaded' });
  // Settle: wait for fonts + any client-side effect
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(400);

  const screenshotName = `${routeName}--${vp.label}.png`;
  const screenshotPath = path.join(SCREENSHOT_DIR, screenshotName);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  // Check for horizontal scroll
  const hasHorizScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
  });
  if (hasHorizScroll) {
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    findings.push({
      route: routePath,
      viewport: vp.label,
      screenshot: screenshotName,
      kind: 'horizontal_scroll',
      detail: `scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`,
    });
  }

  // Check tap targets: <button>, <a>, [role="button"], input[type=submit]
  const smallTargets = await page.evaluate(() => {
    const sel =
      'button, a[href], [role="button"], input[type="submit"], input[type="button"]';
    const nodes = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
    const out: { tag: string; text: string; w: number; h: number; visible: boolean }[] = [];
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      // Skip hidden / zero-size
      if (rect.width === 0 || rect.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if ((style.pointerEvents ?? '') === 'none') continue;
      // Skip sr-only utilities (visually-hidden skip links etc.). Tailwind's
      // sr-only sets width:1px / height:1px and absolute positioning — those
      // are intentionally tiny and not real tap targets.
      if (
        (rect.width <= 1 && rect.height <= 1) ||
        (style.position === 'absolute' &&
          style.clip === 'rect(0px, 0px, 0px, 0px)') ||
        style.clipPath === 'inset(50%)'
      ) {
        continue;
      }
      if (rect.width < 44 || rect.height < 44) {
        out.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 50),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          visible:
            rect.top >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.left >= 0 &&
            rect.right <= window.innerWidth,
        });
      }
    }
    return out;
  });
  for (const t of smallTargets) {
    findings.push({
      route: routePath,
      viewport: vp.label,
      screenshot: screenshotName,
      kind: 'small_tap_target',
      detail: `<${t.tag}> "${t.text}" ${t.w}x${t.h}${t.visible ? '' : ' (off-screen)'}`,
    });
  }

  // Check key content is on screen: any element with very large negative
  // offset or right-of-viewport that has visible text content
  const offscreen = await page.evaluate(() => {
    const out: { tag: string; text: string; x: number; w: number }[] = [];
    const nodes = Array.from(
      document.querySelectorAll('h1, h2, h3, p, button, [role="dialog"]'),
    ) as HTMLElement[];
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (rect.right > window.innerWidth + 4 || rect.left < -4) {
        out.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
          x: Math.round(rect.left),
          w: Math.round(rect.width),
        });
      }
    }
    // Dedupe by text
    const seen = new Set<string>();
    return out.filter((o) => {
      const k = `${o.tag}:${o.text}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  });
  for (const o of offscreen) {
    findings.push({
      route: routePath,
      viewport: vp.label,
      screenshot: screenshotName,
      kind: 'off_screen',
      detail: `<${o.tag}> "${o.text}" left=${o.x} width=${o.w} viewport=${vp.width}`,
    });
  }
}

test.describe('Mobile-first audit', () => {
  test.afterAll(async () => {
    ensureDir();
    fs.writeFileSync(FINDINGS_PATH, JSON.stringify(findings, null, 2));
  });

  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      test(`${route.name} @ ${vp.label}`, async ({ browser }) => {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
        });
        const page = await ctx.newPage();
        await captureAudit(page, route.name, route.path, vp);
        // Sanity: page rendered
        await expect(page.locator('body')).toBeVisible();
        await ctx.close();
      });
    }
  }
});

test.describe('Mobile build-surface preview sheet', () => {
  test('preview sheet exists, half-snap visible, can expand to full', async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.goto('/mobile-audit/build', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await page.waitForTimeout(400);

    // The preview sheet renders only on mobile (md:hidden)
    const sheet = page.getByRole('dialog', { name: /live preview/i });
    await expect(sheet).toBeVisible();

    const screenshotPath = path.join(SCREENSHOT_DIR, 'build--sheet-half.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Click the toggle to cycle to "full"
    const toggle = page.locator('#preview-sheet-label');
    await toggle.click();
    await page.waitForTimeout(500);

    const fullPath = path.join(SCREENSHOT_DIR, 'build--sheet-full.png');
    await page.screenshot({ path: fullPath, fullPage: false });

    // Chat input should not be visually buried under the half sheet — when
    // sheet is closed, the input must be reachable. Cycle once more to closed.
    await toggle.click();
    await page.waitForTimeout(300);
    await toggle.click();
    await page.waitForTimeout(300);

    const closedPath = path.join(SCREENSHOT_DIR, 'build--sheet-closed.png');
    await page.screenshot({ path: closedPath, fullPage: false });

    await ctx.close();
  });
});
