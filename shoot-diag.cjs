// Full-page mobile screenshots for the aesthetic-gap diagnosis.
// 430px CSS width, deviceScaleFactor 2, full page top-to-bottom.
const puppeteer = require('puppeteer');

const BASE = 'http://localhost:3400';
const OUT = '/tmp/diag';

const SHOTS = [
  // renderer (diag route) — un-clamps internal scroll for full-page capture
  { name: 'dad_render',     url: `${BASE}/diag?sample=dad-60th`,    kind: 'render' },
  { name: 'gala_render',    url: `${BASE}/diag?sample=charity-gala`, kind: 'render' },
  { name: 'taquito_render', url: `${BASE}/diag?sample=el-taquito`,   kind: 'render' },
  // bespoke mockups (static html served from public/_mock)
  { name: 'dad_mockup',     url: `${BASE}/_mock/dad.html`,     kind: 'mockup' },
  { name: 'gala_mockup',    url: `${BASE}/_mock/gala.html`,    kind: 'mockup' },
  { name: 'taquito_mockup', url: `${BASE}/_mock/taquito.html`, kind: 'mockup' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-color-profile=srgb'],
  });
  for (const shot of SHOTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
    try {
      await page.goto(shot.url, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch (e) {
      console.log(`[${shot.name}] goto warn: ${e.message}`);
    }
    // let webfonts load + (for render) the un-clamp timers (max 1500ms) + scene settle
    try { await page.evaluateHandle('document.fonts.ready'); } catch {}
    await sleep(shot.kind === 'render' ? 2600 : 1400);

    // measure full content height
    const dims = await page.evaluate(() => ({
      bodyH: document.body.scrollHeight,
      docH: document.documentElement.scrollHeight,
      innerW: window.innerWidth,
    }));
    const buf = await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: true });
    console.log(`[${shot.name}] saved ${buf.length}b  contentH=${Math.max(dims.bodyH, dims.docH)}  innerW=${dims.innerW}  errs=${errors.length}`);
    if (errors.length) console.log('   ' + errors.slice(0, 6).join('\n   '));
    await page.close();
  }
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
