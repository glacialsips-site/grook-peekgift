#!/usr/bin/env node
/**
 * Playwright mobile-viewport screenshots for the vibe gallery.
 *
 * Loads each renders/*.html at 375×812 (iPhone 13 mini-ish) and writes a PNG
 * to `screenshots/<key>.png`. Uses the system Playwright Chromium installed in
 * /opt/pw-browsers/.
 *
 * This is the ONE visual proof Frank needs that fonts now load.
 */
import { chromium } from '/home/user/grook-peekgift/atelier/node_modules/playwright-core/index.mjs';
import { readdirSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RENDERS = join(HERE, 'renders');
const SHOTS = join(HERE, 'screenshots');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  if (!existsSync(CHROME)) {
    console.error(`chrome not at ${CHROME}`);
    process.exit(1);
  }
  const files = readdirSync(RENDERS).filter((f) => f.endsWith('.html')).sort();
  if (!files.length) {
    console.error('no renders to snap');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  const report = [];
  for (const file of files) {
    const key = file.replace(/\.html$/, '');
    const url = `file://${join(RENDERS, file)}`;
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    // give fonts a tick to swap from FOIT/system → real face
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(120);
    const dst = join(SHOTS, `${key}.png`);
    await page.screenshot({ path: dst, fullPage: true });
    await page.close();
    report.push({ key, png: `screenshots/${key}.png` });
    process.stdout.write(`  snap ${key}\n`);
  }
  await browser.close();

  // Emit gallery-screenshots.html — pure-PNG view, no iframes, fast.
  const galleryHtml = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>peek.gift · mobile screenshots · ${report.length} vibes</title>
<style>
*, *::before, *::after { box-sizing: border-box; }
body { margin:0; padding:0; background:#0a0a0a; color:#eee; font:14px/1.4 -apple-system, system-ui, sans-serif; }
header { padding: 14px 16px; border-bottom: 1px solid #222; position: sticky; top: 0; z-index: 10; background: rgba(10,10,10,0.94); backdrop-filter: blur(6px); }
header h1 { margin:0; font-size: 16px; }
header p { margin: 2px 0 0; color: #888; font-size: 12px; }
.grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; padding: 12px; }
figure { margin:0; background:#151515; border:1px solid #2a2a2a; border-radius:8px; overflow:hidden; }
figure a { display:block; color:inherit; text-decoration:none; }
figure img { display:block; width:100%; height:auto; background:white; }
figcaption { padding:8px 10px; font-size:12px; }
figcaption strong { display:block; font-size:13px; margin-bottom:2px; }
figcaption small { color:#888; font-size:11px; }
</style></head>
<body>
<header><h1>peek.gift · mobile screenshots (375×full)</h1>
<p>${report.length} grammar presets · self-hosted fonts · click any tile to open the live HTML render</p></header>
<div class="grid">
${report
  .map(
    (r) => `<figure>
  <a href="./renders/${r.key}.html"><img src="./${r.png}" loading="lazy" alt="${r.key}"/></a>
  <figcaption><strong>${r.key}</strong><small>click to open render</small></figcaption>
</figure>`,
  )
  .join('\n')}
</div></body></html>`;
  writeFileSync(join(HERE, 'screenshots-index.html'), galleryHtml, 'utf8');
  console.log(`\nshot ${report.length} pages → ${SHOTS}`);
  console.log(`index → ${join(HERE, 'screenshots-index.html')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
