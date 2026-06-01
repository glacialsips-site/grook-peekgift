// Capture the renderer's sticky action bar (running total) in clamped device mode,
// scrolled to the bottom so the bar is revealed. One viewport shot per sample.
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SHOTS = [
  { name: 'dad_render_bar', sample: 'dad-60th' },
  { name: 'gala_render_bar', sample: 'charity-gala' },
  { name: 'taquito_render_bar', sample: 'el-taquito' },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-color-profile=srgb'],
  });
  for (const s of SHOTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(`http://localhost:3400/diag?sample=${s.sample}&mode=frame`, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    try { await page.evaluateHandle('document.fonts.ready'); } catch {}
    await sleep(2400);
    const buf = await page.screenshot({ path: `/tmp/diag/${s.name}.png` }); // viewport only
    console.log(`${s.name} ${buf.length}b`);
    await page.close();
  }
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
