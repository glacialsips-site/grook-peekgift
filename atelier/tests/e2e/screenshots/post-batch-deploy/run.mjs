#!/usr/bin/env node
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BASE = process.env.BASE_URL ?? 'https://vnext.peek.gift';
const OUT = resolve(process.env.OUT_DIR ?? '.');
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: '375x812', width: 375, height: 812, isMobile: true },
  { name: '1280x800', width: 1280, height: 800, isMobile: false },
];

const STEPS = [
  { id: 'landing', path: '/', wait: 2500 },
  { id: 'build-anon', path: '/build', wait: 3000 },
  { id: 'signin', path: '/sign-in', wait: 2500 },
  { id: 'signup', path: '/sign-up', wait: 2500 },
  { id: 'peek-editorial-c248cd434497', path: '/g/c248cd434497', wait: 3000 },
  { id: 'peek-playful-bf54d5549a2f', path: '/g/bf54d5549a2f', wait: 3000 },
  { id: 'peek-princess-52c72d59c026', path: '/g/52c72d59c026', wait: 3000 },
  { id: 'peek-toy-bdd1eaf056a2', path: '/g/bdd1eaf056a2', wait: 3000 },
];

const report = [];

async function main() {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1223/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
  });
  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.isMobile ? 2 : 1,
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
        ignoreHTTPSErrors: true,
        userAgent: vp.isMobile
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
          : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      });
      const page = await context.newPage();
      page.on('pageerror', (err) => report.push({ kind: 'pageerror', vp: vp.name, msg: String(err) }));
      page.on('console', (msg) => {
        if (msg.type() === 'error') report.push({ kind: 'console.error', vp: vp.name, msg: msg.text() });
      });

      for (const step of STEPS) {
        const url = `${BASE}${step.path}`;
        const file = join(OUT, `${step.id}--${vp.name}.png`);
        let status = null;
        let title = null;
        let bodyChars = 0;
        let bodyPreview = null;
        try {
          const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
          status = resp?.status() ?? null;
          await page.waitForTimeout(step.wait);
          title = await page.title().catch(() => null);
          bodyChars = await page
            .evaluate(() => document.body?.innerText?.length ?? 0)
            .catch(() => 0);
          bodyPreview = await page
            .evaluate(() => (document.body?.innerText ?? '').slice(0, 240))
            .catch(() => null);
          await page.screenshot({ path: file, fullPage: true });
        } catch (e) {
          try {
            await page.screenshot({ path: file, fullPage: false });
          } catch {}
          report.push({ kind: 'navigation-error', step: step.id, vp: vp.name, msg: String(e) });
        }
        report.push({ kind: 'step', step: step.id, vp: vp.name, url, status, title, bodyChars, bodyPreview, file });
        console.log(`[${vp.name}] ${step.id} -> ${status} (title="${title}", body=${bodyChars} chars) -> ${file}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Wrote ${report.length} report entries to report.json`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  writeFileSync(join(OUT, 'fatal.json'), JSON.stringify({ err: String(err), stack: err?.stack }, null, 2));
  process.exit(1);
});
