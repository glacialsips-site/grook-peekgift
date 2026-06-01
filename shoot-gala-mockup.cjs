// Re-shoot the Charity Gala mockup at 430px with its scroll-reveal animations
// FORCED visible (a full-page screenshot never fires the IntersectionObserver for
// below-the-fold sections, so they'd stay opacity:0). Also force menu/sheet closed.
// External Unsplash photos are blocked by the sandbox; the mockup's onerror hides
// them, leaving its themed gradient blocks — same situation as the renderer's
// placeholders, so the comparison stays fair on layout/typography/treatment.
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-color-profile=srgb'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3400/_mock/gala.html', { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  try { await page.evaluateHandle('document.fonts.ready'); } catch {}
  // force reveals in, close any open menu/sheet, freeze hero ken-burns
  await page.addStyleTag({ content: `
    .reveal{opacity:1!important;transform:none!important;}
    .hero .anim,.scroll-cue{opacity:1!important;transform:none!important;animation:none!important;}
    body.menu-open,body.sheet-open{overflow:auto!important;}
    .mobile-menu,.sheet,.scrim,.sheet-scrim{transform:translateX(100%)!important;opacity:0!important;visibility:hidden!important;}
    .sheet{transform:translateY(101%)!important;}
    .mobile-bar{display:none!important;}
    .hero-bg img{animation:none!important;}
  `});
  await page.evaluate(() => {
    document.body.classList.remove('menu-open', 'sheet-open');
    document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in'));
  });
  await sleep(1200);
  const dims = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, w: window.innerWidth }));
  const buf = await page.screenshot({ path: '/tmp/diag/gala_mockup.png', fullPage: true });
  console.log(`gala_mockup re-shot ${buf.length}b contentH=${dims.h} innerW=${dims.w}`);
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
