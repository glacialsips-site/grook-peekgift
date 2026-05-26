import { chromium } from 'playwright';
import fs from 'node:fs';

const CLERK_SK = fs.readFileSync('/tmp/.clerk-sk', 'utf8').trim();
const USER_ID = "user_3EGWAR5h95pnTS94Tt7FBG1OA7q";

const events = [];
const log = (kind, msg) => {
  const line = `[${new Date().toISOString()}] ${kind}: ${msg}`;
  console.log(line);
  events.push(line);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sendBtnSelectors = [
  'button[type="submit"][aria-label*="end" i]',
  'button[aria-label*="end" i]:not([type="reset"])',
  'form button[type="submit"]',
  'button:has-text("Send")',
];

async function waitStable(page, ms = 60000, ticks = 3, interval = 2500) {
  const start = Date.now();
  let last = '';
  let st = 0;
  while (Date.now() - start < ms) {
    await sleep(interval);
    const b = await page.locator('body').textContent().catch(() => '');
    if (b === last) {
      st++;
      if (st >= ticks) break;
    } else { st = 0; last = b; }
  }
  return { elapsedMs: Date.now() - start, stable: st, lastBody: last };
}

async function freshSignInToken() {
  // Backend API
  const res = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CLERK_SK}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: USER_ID, expires_in_seconds: 600 }),
  });
  if (!res.ok) throw new Error(`sign_in_token: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return j.token;
}

async function signInViaTicket(page) {
  // Use the page's existing context — but easier: do the ticket exchange in-page via Clerk JS instance
  // OR: Open the Clerk Frontend API directly from the page context (so cookies stick to clerk.peek.gift)

  const ticket = await freshSignInToken();
  log('AUTH', `got sign-in token (${ticket.length} chars)`);

  // First navigate to /sign-in so ClerkJS loads
  await page.goto('https://vnext.peek.gift/sign-in', { waitUntil: 'load', timeout: 30000 });
  await sleep(1500);

  // Wait for Clerk to be ready
  await page.waitForFunction(() => typeof window.Clerk !== 'undefined' && window.Clerk.loaded === true, { timeout: 20000 });
  log('AUTH', 'Clerk JS loaded');

  // Now call signIn.create with ticket strategy via the page
  const result = await page.evaluate(async (t) => {
    try {
      const Clerk = window.Clerk;
      const client = Clerk.client;
      const signIn = client.signIn;
      const r = await signIn.create({ strategy: 'ticket', ticket: t });
      // setActive to commit the session
      if (r.createdSessionId) {
        await Clerk.setActive({ session: r.createdSessionId });
      }
      return { status: r.status, sessionId: r.createdSessionId, userId: r.userId };
    } catch (e) {
      return { error: String(e), name: e?.name, errors: e?.errors };
    }
  }, ticket);
  log('AUTH_RESULT', JSON.stringify(result));
  return result;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  page.on('console', (m) => log('CONSOLE', `[${m.type()}] ${m.text().slice(0, 600)}`));
  page.on('pageerror', (e) => log('PAGEERROR', e.message + '\n' + (e.stack || '').slice(0, 800)));
  page.on('requestfailed', (req) => log('REQFAILED', `${req.method()} ${req.url()} :: ${req.failure()?.errorText || ''}`));
  page.on('response', (resp) => {
    if (resp.status() >= 400) {
      log('HTTP', `${resp.status()} ${resp.request().method()} ${resp.url().slice(0, 200)}`);
    }
  });

  log('STEP', 'Phase 1+2.1 — sign in via Clerk ticket');
  try {
    const r = await signInViaTicket(page);
    if (r.error) {
      log('FATAL', `auth failed: ${r.error}`);
      await page.screenshot({ path: '/tmp/driver-1-auth-fail.png', fullPage: true });
      fs.writeFileSync('/tmp/driver-events.log', events.join('\n'));
      await browser.close();
      return;
    }
  } catch (e) {
    log('FATAL', `signInViaTicket threw: ${e.message}`);
    fs.writeFileSync('/tmp/driver-events.log', events.join('\n'));
    await browser.close();
    return;
  }
  await sleep(2000);
  await page.screenshot({ path: '/tmp/driver-1-after-signin.png', fullPage: true });
  log('INFO', `URL after signin: ${page.url()}`);

  // dump cookies
  const cookies = await ctx.cookies();
  log('COOKIES', JSON.stringify(cookies.map(c => ({ name: c.name, domain: c.domain, value: (c.value || '').slice(0, 50) }))));

  // also check Clerk's session token from the page side
  const clerkState = await page.evaluate(async () => {
    try {
      const C = window.Clerk;
      return {
        sessionId: C?.session?.id,
        userId: C?.user?.id,
        sessionToken: (await C?.session?.getToken?.())?.slice(0, 60),
      };
    } catch (e) { return { err: String(e) }; }
  });
  log('CLERK_STATE', JSON.stringify(clerkState));

  // Navigate to /build
  log('STEP', 'Navigating to /build');
  await page.goto('https://vnext.peek.gift/build', { waitUntil: 'load', timeout: 30000 });
  try { await page.waitForLoadState('networkidle', { timeout: 25000 }); } catch (_) {}
  await sleep(4000);
  log('INFO', `URL after /build push: ${page.url()}`);
  await page.screenshot({ path: '/tmp/driver-2-build-loaded.png', fullPage: true });

  // Phase 2.2 — chat
  log('STEP', 'Phase 2.2 — looking for chat pane');
  const textareas = await page.locator('textarea').count();
  log('INFO', `textareas: ${textareas}`);
  const bodyText = await page.locator('body').textContent().catch(() => '');
  fs.writeFileSync('/tmp/driver-body-build.txt', (bodyText || '').slice(0, 16000));
  log('INFO', `body excerpt (1200): ${(bodyText || '').slice(0, 1200)}`);

  // first assistant msg detection
  let firstAssistant = null;
  const probes = [
    '[data-role="assistant"]', '[data-message-role="assistant"]', '[data-author="assistant"]', '[data-author="peek"]',
    'div[class*="assistant" i]', 'article[class*="message" i]', 'div[class*="message" i][class*="peek" i]',
    'div[class*="bubble" i]', 'div[class*="chat" i] > div',
  ];
  for (const sel of probes) {
    const c = await page.locator(sel).count();
    if (c > 0) {
      const t = await page.locator(sel).first().textContent();
      log('FIRST_MSG_PROBE', `sel=${sel} count=${c} text=${(t||'').slice(0,400)}`);
      if (t && t.trim().length > 20 && !firstAssistant) firstAssistant = { sel, text: t.trim() };
    }
  }
  if (firstAssistant) log('FIRST_ASSISTANT_TEXT', firstAssistant.text);

  // also try selector enumeration: find divs that don't contain the textarea and have reasonable text
  if (!firstAssistant) {
    const candidates = await page.locator('main *').evaluateAll((els) => {
      return els
        .filter((e) => e.children.length === 0 && (e.textContent || '').trim().length > 30 && (e.textContent || '').length < 1500)
        .map((e) => ({ text: e.textContent.trim().slice(0, 400), tag: e.tagName, cls: e.className || '' }));
    });
    log('SCAN_TEXT_NODES', `candidates=${candidates.length}; first 5: ${JSON.stringify(candidates.slice(0,5))}`);
  }

  if (textareas === 0) {
    log('STOP', 'No textarea — cannot drive chat');
    fs.writeFileSync('/tmp/driver-events.log', events.join('\n'));
    await browser.close();
    return;
  }

  // ===== Turn 1 =====
  log('STEP', 'Phase 2.3 — turn 1');
  const ta = page.locator('textarea').first();
  await ta.click();
  const msg1 = "It's for my sister Maya, her 30th birthday on Dec 15. She likes plants, vintage tees, and stupid jokes.";
  await ta.fill(msg1);
  await page.screenshot({ path: '/tmp/driver-3-msg1-typed.png', fullPage: true });

  let submitted1 = false;
  for (const sel of sendBtnSelectors) {
    const btn = page.locator(sel);
    if (await btn.count() > 0) {
      try { await btn.first().click({ timeout: 3000 }); submitted1 = true; log('INFO', `msg1 submitted via "${sel}"`); break; } catch (_) {}
    }
  }
  if (!submitted1) { log('INFO', 'msg1: Enter fallback'); await ta.press('Enter'); }

  await sleep(2500);
  await page.screenshot({ path: '/tmp/driver-4-msg1-streaming.png', fullPage: true });
  const w1 = await waitStable(page, 80000, 3, 2500);
  log('INFO', `msg1 wait done elapsed=${Math.round(w1.elapsedMs/1000)}s stable=${w1.stable}`);
  await page.screenshot({ path: '/tmp/driver-5-msg1-complete.png', fullPage: true });
  fs.writeFileSync('/tmp/driver-body-msg1.txt', (w1.lastBody || '').slice(0, 18000));
  log('INFO', `URL after turn 1: ${page.url()}`);

  // preview probes
  const previewProbes = [
    { name: 'preview', sel: '[class*="preview" i]' },
    { name: 'hero', sel: '[class*="hero" i]:not(button)' },
    { name: 'card', sel: '[class*="card" i]' },
    { name: 'recipient', sel: '[class*="recipient" i]' },
    { name: 'maya', sel: ':has-text("Maya")' },
    { name: 'note', sel: '[class*="note" i]' },
  ];
  for (const p of previewProbes) {
    const c = await page.locator(p.sel).count();
    log('PREVIEW1', `${p.name} count=${c}`);
  }

  // ===== Turn 2 =====
  log('STEP', 'Phase 2.5 — turn 2 (cards)');
  try {
    await ta.click();
    const msg2 = 'Can you put together some card ideas? Maybe a vintage band tee, a houseplant, an activity we could do together, and one ridiculous gag like a Ferrari?';
    await ta.fill(msg2);
    await page.screenshot({ path: '/tmp/driver-6-msg2-typed.png', fullPage: true });
    let s2 = false;
    for (const sel of sendBtnSelectors) {
      const btn = page.locator(sel);
      if (await btn.count() > 0) {
        try { await btn.first().click({ timeout: 3000 }); s2 = true; break; } catch (_) {}
      }
    }
    if (!s2) await ta.press('Enter');
    await sleep(3000);
    await page.screenshot({ path: '/tmp/driver-7-msg2-streaming.png', fullPage: true });
    const w2 = await waitStable(page, 180000, 4, 3000);
    log('INFO', `msg2 wait done elapsed=${Math.round(w2.elapsedMs/1000)}s stable=${w2.stable}`);
    await page.screenshot({ path: '/tmp/driver-8-msg2-complete.png', fullPage: true });
    fs.writeFileSync('/tmp/driver-body-msg2.txt', (w2.lastBody || '').slice(0, 25000));

    for (const p of previewProbes) {
      const c = await page.locator(p.sel).count();
      log('PREVIEW2', `${p.name} count=${c}`);
    }
    const imgCount = await page.locator('img').count();
    log('PREVIEW2', `img tags: ${imgCount}`);
  } catch (e) {
    log('ERROR', `msg2 stage: ${e.message}`);
  }

  // ===== Turn 3 =====
  log('STEP', 'Phase 2.7 — turn 3 (publish)');
  try {
    await ta.click();
    const msg3 = 'Looks good. How do I publish this?';
    await ta.fill(msg3);
    let s3 = false;
    for (const sel of sendBtnSelectors) {
      const btn = page.locator(sel);
      if (await btn.count() > 0) {
        try { await btn.first().click({ timeout: 3000 }); s3 = true; break; } catch (_) {}
      }
    }
    if (!s3) await ta.press('Enter');
    await sleep(3000);
    const w3 = await waitStable(page, 100000, 3, 3000);
    log('INFO', `msg3 elapsed=${Math.round(w3.elapsedMs/1000)}s`);
    await page.screenshot({ path: '/tmp/driver-9-msg3-complete.png', fullPage: true });
    fs.writeFileSync('/tmp/driver-body-msg3.txt', (w3.lastBody || '').slice(0, 15000));
  } catch (e) {
    log('ERROR', `msg3 stage: ${e.message}`);
  }

  // ===== Publish page =====
  log('STEP', 'Phase 2.8 — publish nav');
  const url = page.url();
  const m = url.match(/\/build\/([A-Za-z0-9]+)/);
  if (m) {
    const peekId = m[1];
    try {
      await page.goto(`https://vnext.peek.gift/build/${peekId}/publish`, { waitUntil: 'load', timeout: 30000 });
      try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch (_) {}
      await sleep(3000);
      await page.screenshot({ path: '/tmp/driver-10-publish.png', fullPage: true });
      const pubBody = await page.locator('body').textContent().catch(() => '');
      fs.writeFileSync('/tmp/driver-body-publish.txt', (pubBody || '').slice(0, 10000));
      log('INFO', `publish URL: ${page.url()}`);
      log('INFO', `publish body excerpt: ${(pubBody||'').slice(0, 600)}`);
    } catch (e) {
      log('ERROR', `publish nav: ${e.message}`);
    }
  } else {
    log('WARN', `no peekId in URL ${url}`);
  }

  fs.writeFileSync('/tmp/driver-events.log', events.join('\n'));
  log('DONE', 'Driver complete');
  await browser.close();
})();
