import Anthropic from '@anthropic-ai/sdk';
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ATELIER_DIR = path.resolve(process.cwd(), 'atelier');
const PORT = Number(process.env.STYLES_TEST_PORT || 3789);
const BASE_URL = `http://localhost:${PORT}`;

const SCENARIOS = [
  {
    seed: 'sophie',
    out: '/tmp/styles-1-sophie.png',
    recipient: { name: 'Sophie', relationship: 'daughter', occasion: 'birthday' },
    prompt:
      "For my 6-year-old daughter Sophie's birthday — princess-themed birthday party. She loves pink, sparkles, unicorns, and dressing up. Pick a vibe that screams 'little kid birthday party in the best possible way.' Be opinionated.",
    note: "for the actual princess of the house — happy 6th birthday, my whole world",
    cards: [
      { title: 'Princess crown', description: 'sparkle pink rhinestones, hers alone', valueCents: 1200 },
      { title: 'Unicorn plushie', description: 'rainbow mane, name him together', valueCents: 2500 },
      { title: 'Tea-party set', description: 'porcelain, real, careful hands', valueCents: 3800 },
      { title: 'Glitter art kit', description: 'guaranteed to end up everywhere', valueCents: 1800 },
    ],
  },
  {
    seed: 'mike',
    out: '/tmp/styles-2-mike.png',
    recipient: { name: 'Mike', relationship: 'father', occasion: '70th birthday' },
    prompt:
      "For my dad Mike's 70th birthday. He's a retired commercial pilot who loves vintage cars, single malt whisky, and never reads a book without underlining it. Pick a vibe that respects 70 years and feels editorial — like a magazine feature on a man with taste. Be opinionated.",
    note: "70 trips around the sun, dad — here's to the next decade of long drives, longer pours, and the books you keep trying to make me read",
    cards: [
      { title: 'Aviator chronograph', description: 'brushed steel, leather strap', valueCents: 38000 },
      { title: 'Single-malt cask trio', description: 'Islay / Speyside / Highland', valueCents: 24000 },
      { title: 'Vintage Porsche calendar', description: '1960s 911s, large-format', valueCents: 4500 },
      { title: 'Annotated first-edition', description: 'his favorite — already underlined', valueCents: 18000 },
    ],
  },
];

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not set');
  process.exit(1);
}

const STATIC_SYSTEM_PROMPT = `You are picking a complete visual + tonal vibe for a personalized gift page. You will be told who the recipient is, the occasion, and a couple of sentences from the curator. Respond with EXACTLY ONE JSON object — no prose, no markdown — matching this shape:
{
  "preset": "playful" | "romantic" | "dry" | "unhinged" | "tender",
  "tone": "<one-line voice description>",
  "palette": { "bg": "#hex", "surface": "#hex", "ink": "#hex", "accent": "#hex", "accent2": "#hex" },
  "mood_words": ["...", "...", "..."],
  "motion": "still" | "soft" | "lively",
  "font_pairing": { "display": "<google font name>", "body": "<google font name>" },
  "typography": { "heading": "serif" | "display" | "sans" | "mono" | "script", "body": "sans" | "serif" | "mono" },
  "density": "compact" | "cozy" | "breathable",
  "shape": "sharp" | "soft" | "pillowy",
  "mood": "minimal" | "rich" | "whimsical" | "editorial"
}

Think holistically. Recipient age / gender / relationship + occasion + note tone all drive every field. A 6-year-old's princess birthday should be radically different from a 70-year-old retired pilot's anniversary. Push the dials — don't sand the page into a default. The page itself should signal "this was made for THIS person, on THIS occasion."

heading font legend: serif (Playfair Display — elegant), display (Fraunces — characterful), sans (Inter — neutral), mono (DM Mono — technical), script (Caveat — handwritten playful).
body font legend: sans (Inter) / serif (Cormorant — refined) / mono.
density: compact = tight. cozy = default. breathable = airy.
shape: sharp = 4px radius. soft = 12px. pillowy = 24px.
mood: minimal = restrained, rich = saturated, whimsical = playful irregular, editorial = magazine-like.

Only the JSON. No prose.`;

const client = new Anthropic({ apiKey });

const events = [];
const log = (k, m) => {
  const line = `[${new Date().toISOString()}] ${k}: ${m}`;
  console.log(line);
  events.push(line);
};

function parseJsonFromText(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    log('JSON_PARSE', `failed: ${e.message}`);
    return null;
  }
}

async function pickVibe(scenario) {
  log('STEP', `claude: pick vibe for ${scenario.seed}`);
  const userMsg = `Recipient: ${scenario.recipient.name} (${scenario.recipient.relationship})\nOccasion: ${scenario.recipient.occasion}\nCurator: ${scenario.prompt}`;
  const res = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 800,
    system: STATIC_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  });
  const block = res.content.find((b) => b.type === 'text');
  if (!block) throw new Error(`no text block from Claude for ${scenario.seed}`);
  const parsed = parseJsonFromText(block.text);
  if (!parsed) throw new Error(`Claude did not return parseable JSON for ${scenario.seed}: ${block.text.slice(0, 400)}`);
  log('VIBE', `${scenario.seed} preset=${parsed.preset} typography=${JSON.stringify(parsed.typography)} density=${parsed.density} shape=${parsed.shape} mood=${parsed.mood} accent=${parsed.palette?.accent}`);
  return parsed;
}

async function writeSeed(scenario, vibe) {
  const payload = {
    peek: {
      recipientName: scenario.recipient.name,
      relationship: scenario.recipient.relationship,
      occasion: scenario.recipient.occasion,
      heroImageUrl: null,
      noteMd: scenario.note,
      vibe,
    },
    cards: scenario.cards,
  };
  const p = `/tmp/styles-seed-${scenario.seed}.json`;
  fs.writeFileSync(p, JSON.stringify(payload, null, 2));
  log('SEED', `wrote ${p}`);
}

function startDevServer() {
  log('STEP', `starting next dev on :${PORT}`);
  const env = {
    ...process.env,
    APP_URL: 'https://vnext.peek.gift',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_Y2xlcmsucGVlay5naWZ0JA',
    NEXT_PUBLIC_SUPABASE_URL: 'https://ewqpujqerdnrkjqlpobo.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_dxaQo6pxBg-onk4hyeqw_g_zixFDFJB',
    CLERK_SECRET_KEY: fs.existsSync('/tmp/.clerk-sk')
      ? fs.readFileSync('/tmp/.clerk-sk', 'utf8').trim()
      : 'placeholder',
    SUPABASE_SERVICE_ROLE_KEY: 'placeholder',
    STRIPE_SECRET_KEY: 'placeholder',
    STRIPE_WEBHOOK_SECRET: 'placeholder',
    ANTHROPIC_API_KEY: apiKey,
    GUEST_CLAIM_TOKEN_SECRET: 'placeholder12345678901234567890123456789012345678',
    PORT: String(PORT),
  };
  const proc = spawn('npm', ['run', 'dev', '--', '--port', String(PORT)], {
    cwd: ATELIER_DIR,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => {
    const s = d.toString();
    if (s.includes('Ready') || s.includes('Local:') || s.includes('error') || s.includes('Error')) {
      log('DEV', s.trim().split('\n').slice(-3).join(' | '));
    }
  });
  proc.stderr.on('data', (d) => {
    const s = d.toString();
    if (s.includes('error') || s.includes('Error')) log('DEV_ERR', s.trim().slice(0, 400));
  });
  return proc;
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr = '';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.status < 500) return true;
      lastErr = `status ${res.status}`;
    } catch (e) {
      lastErr = e.message;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`server did not become ready: ${lastErr}`);
}

async function screenshotScenario(browser, scenario) {
  log('STEP', `screenshot ${scenario.seed}`);
  const ctx = await browser.newContext({
    viewport: { width: 900, height: 1400 },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => log('PAGEERROR', `${scenario.seed}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') log('CONSOLE_ERR', `${scenario.seed}: ${m.text().slice(0, 300)}`);
  });
  const url = `${BASE_URL}/styles-test/${scenario.seed}`;
  log('NAV', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('load', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await page.screenshot({ path: scenario.out, fullPage: true });
  log('SCREENSHOT', `${scenario.seed} -> ${scenario.out}`);
  await ctx.close();
}

(async () => {
  try {
    const vibes = [];
    for (const sc of SCENARIOS) {
      const v = await pickVibe(sc);
      vibes.push({ scenario: sc, vibe: v });
      await writeSeed(sc, v);
    }

    const dev = startDevServer();
    try {
      await waitForServer(`${BASE_URL}/styles-test/${SCENARIOS[0].seed}`, 90_000);
      log('READY', 'dev server is up');
      const browser = await chromium.launch({ headless: true });
      try {
        for (const sc of SCENARIOS) {
          await screenshotScenario(browser, sc);
        }
      } finally {
        await browser.close();
      }
    } finally {
      dev.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 800));
    }

    log('DONE', 'all screenshots produced');
    fs.writeFileSync('/tmp/styles-driver.log', events.join('\n'));

    const summary = vibes.map(({ scenario, vibe }) => ({
      scenario: scenario.seed,
      preset: vibe.preset,
      typography: vibe.typography,
      density: vibe.density,
      shape: vibe.shape,
      mood: vibe.mood,
      font_pairing: vibe.font_pairing,
      palette_accent: vibe.palette?.accent,
      palette_bg: vibe.palette?.bg,
      mood_words: vibe.mood_words,
    }));
    fs.writeFileSync('/tmp/styles-driver-summary.json', JSON.stringify(summary, null, 2));
    console.log('\n=== SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));
  } catch (e) {
    log('FATAL', e.message + '\n' + (e.stack || '').slice(0, 800));
    fs.writeFileSync('/tmp/styles-driver.log', events.join('\n'));
    process.exit(1);
  }
})();
