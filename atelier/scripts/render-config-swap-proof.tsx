/**
 * VERTICAL-AGNOSTIC PROOF — ONE engine, TWO verticals, ZERO engine changes.
 * =========================================================================
 *
 * Thesis under test: the peek.gift design grammar + renderer is the
 * PerfectPurchase platform engine — swap the config/page-state, get a radically
 * different branded commerce page from the SAME engine, with NO changes to the
 * grammar (`lib/vibe/grammar/`) or the renderer (`components/renderer/`).
 *
 * This script renders the REAL `SlugRenderer` + REAL `fromGeneration` pipeline
 * (the exact production path `/g/[slug]` uses) against two hand-authored
 * page-state objects representing two unrelated verticals:
 *
 *   A. GIFT PEEK         — a birthday gift experience (warm/playful preset).
 *   B. WATER FILTRATION  — GlacialSips, a premium/moody non-gift commerce page
 *                          (dark, serious, data-driven), four filtration systems.
 *
 * Everything is driven through config/page-state ONLY. The grammar and renderer
 * are imported and used AS-IS — if a renderer assumption forces gift-flavored
 * output, that is recorded as a FINDING (see the report), never hacked around.
 *
 * Run: tsx scripts/render-config-swap-proof.tsx
 * Out: scripts/proof-out/config-swap-{gift,water}.html + config-swap-index.html
 */

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// ── CSS-module require stub (same trick as render-vibe-proof.tsx) ──────────
// Under tsx there is no CSS loader; map `styles.foo` → "foo" so the inlined raw
// CSS (plain `.foo` selectors) lines up. Must run BEFORE the renderer loads, so
// the renderer is pulled via dynamic import() in main().
const require = createRequire(import.meta.url);
type CssProxy = Record<string, string>;
const cssIdentity = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === '__esModule') return true;
      if (prop === 'default') return cssIdentity;
      return typeof prop === 'string' ? prop : '';
    },
  },
) as CssProxy;
require.extensions['.css'] = (mod: NodeModule) => {
  mod.exports = cssIdentity;
};

import type { GenerationOutput } from '../lib/vibe/grammar/grammar';
import type { PageContent, RenderCard } from '../components/renderer/page-state';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'proof-out');
const CSS = readFileSync(
  join(__dirname, '..', 'components', 'renderer', 'renderer.module.css'),
  'utf8',
);

const RESET = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
img { max-width: 100%; display: block; }
a { color: inherit; }
`;

function htmlDoc(title: string, vibeKey: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PerfectPurchase engine proof — ${title}</title>
<style>${RESET}\n${CSS}</style>
</head>
<body data-proof-vertical="${vibeKey}">
${body}
</body>
</html>`;
}

/* ════════════════════════════════════════════════════════════════════════
 * Helpers — build PageContent (the renderer's data layer) directly.
 * `RenderCard` is the recipient-safe flat shape the renderer consumes; we build
 * it by hand (no DB rows) so each vertical is fully its own config.
 * ════════════════════════════════════════════════════════════════════════ */

function makeCard(
  c: Pick<RenderCard, 'id' | 'title'> & Partial<RenderCard>,
): RenderCard {
  return {
    description: null,
    imageUrl: null,
    priceLabel: null,
    tag: null,
    type: 'product',
    ...c,
  };
}

/** Assemble a PageContent from a flat list of cards + one named group. */
function pageContent(input: {
  title: string;
  subtitle: string | null;
  noteMd: string | null;
  signature: string | null;
  groupId: string;
  groupTitle: string;
  cards: RenderCard[];
}): PageContent {
  const cards: Record<string, RenderCard> = {};
  for (const c of input.cards) cards[c.id] = c;
  const order = input.cards.map((c) => c.id);
  return {
    title: input.title,
    subtitle: input.subtitle,
    heroImageUrl: null,
    noteMd: input.noteMd,
    signature: input.signature,
    cards,
    groups: [{ id: input.groupId, title: input.groupTitle, cardOrder: order }],
    cardOrder: order,
  };
}

/* ════════════════════════════════════════════════════════════════════════
 * VERTICAL A — GIFT PEEK (warm / playful). Birthday gift experience.
 * Hero + personal note (story) + a product-set of 4 gift cards + CTA.
 * ════════════════════════════════════════════════════════════════════════ */

const GIFT_CONTENT: PageContent = pageContent({
  title: 'Priya turns 30',
  subtitle: 'Happy birthday',
  noteMd:
    "Thirty looks unfairly good on you.\n\nWe each threw in for something you'd actually love — pick whatever makes you grin, it's already handled.",
  signature: '— Sam, Dev & the brunch crew',
  groupId: 'gifts',
  groupTitle: 'Pick your favorite',
  cards: [
    makeCard({
      id: 'gift_1',
      title: 'Hand-thrown Ceramic Mug',
      description: 'Speckled stoneware, holds a proper amount of coffee.',
      priceLabel: '$48',
      tag: 'most loved',
    }),
    makeCard({
      id: 'gift_2',
      title: 'Silk Eye Mask',
      description: 'Mulberry silk, for the sleep you keep promising yourself.',
      priceLabel: '$32',
    }),
    makeCard({
      id: 'gift_3',
      title: 'Negroni Cocktail Kit',
      description: 'Everything but the orange peel. Stirred, never shaken.',
      priceLabel: '$65',
      type: 'product',
    }),
    makeCard({
      id: 'gift_4',
      title: 'Pottery Class for Two',
      description: 'A Saturday of getting clay everywhere. Bring a friend.',
      priceLabel: '$120',
      tag: 'an experience',
      type: 'activity',
    }),
  ],
});

/** Warm/playful gift vibe — analogous warm hues, script display, soft & lively. */
const GIFT_VIBE: GenerationOutput = {
  vibe: {
    paletteSeed: { strategy: 'analogous', baseHue: 25, key: 'light', saturation: 'vivid' },
    typography: {
      displayRole: 'script',
      bodyRole: 'sans',
      scaleContrast: 1.6,
      displayCase: 'none',
      displayTracking: 'normal',
      bodyLeading: 'normal',
    },
    spatial: { density: 'breathable', baseUnitRem: 1.1, gutter: 'roomy', measureCh: 60 },
    shape: { radius: 'pillowy', imageMask: 'rounded', border: 'none' },
    depth: { elevation: 'dramatic' },
    texture: { grain: 0, wash: 0.12, motif: 'confetti' },
    motion: { character: 'lively', easing: 'bouncy' },
    imagery: { treatment: 'illustrated', textOverImage: false },
    moodWords: ['warm', 'celebratory', 'playful', 'generous'],
    voice: {
      warmth: 'effusive',
      humor: 'gentle',
      pace: 'quick',
      formality: 'casual',
      emoji: 'playful',
      vocabulary: 'slangy',
      length: 'punchy',
    },
  },
  sections: [
    {
      type: 'hero',
      variant: 'stacked-card',
      slots: { titleRef: 'title', subtitleRef: 'subtitle' },
      emphasis: 'focal',
    },
    { type: 'story', variant: 'prose', slots: { bodyRef: 'noteMd' } },
    {
      type: 'productSet',
      variant: 'tight-grid',
      slots: { cardRefs: ['gift_1', 'gift_2', 'gift_3', 'gift_4'], headingRef: 'group:gifts' },
    },
    { type: 'cta', variant: 'button-row', slots: { labelRef: 'cta:primary' } },
    { type: 'footer', variant: 'signature', slots: { signatureRef: 'signature' } },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
 * VERTICAL B — WATER FILTRATION (GlacialSips). NON-gift premium commerce.
 * Hero + a "story" used as a spec/positioning block + a product-set of four
 * filtration systems (Drift / Bedrock / Neve / Serac) + CTA. Dark, serious,
 * data-driven. A totally different brand from the SAME engine.
 * ════════════════════════════════════════════════════════════════════════ */

const WATER_CONTENT: PageContent = pageContent({
  title: 'GlacialSips',
  subtitle: 'Whole-home water, engineered',
  // The "note" slot is repurposed as a positioning / spec paragraph. No gift
  // language — this is where the gift-coupling of the note slot gets tested.
  noteMd:
    'Independently lab-tested to NSF/ANSI 53 + 58. Removes lead, PFAS, chlorine, and microplastics down to 0.5 microns.\n\nFour systems, sized by household demand and source-water hardness. Each ships with a 10-year housing warranty and a flow-rate guarantee.',
  // Footer "signature" slot repurposed as a brand sign-off line.
  signature: 'GlacialSips — filtration systems since 2014',
  groupId: 'systems',
  groupTitle: 'Choose your system',
  cards: [
    makeCard({
      id: 'sys_drift',
      title: 'Drift',
      description: 'Under-sink, single-tap. 0.5 micron carbon block. Up to 1.5 GPM. For apartments and small households.',
      priceLabel: '$280',
      tag: '1–2 people',
    }),
    makeCard({
      id: 'sys_bedrock',
      title: 'Bedrock',
      description: 'Dual-stage under-sink + remineralization. Handles hard source water. Up to 2.2 GPM.',
      priceLabel: '$480',
      tag: '2–4 people',
    }),
    makeCard({
      id: 'sys_neve',
      title: 'Neve',
      description: 'Whole-home point-of-entry. Sediment + catalytic carbon. 7 GPM, every fixture in the house.',
      priceLabel: '$680',
      tag: 'whole home',
    }),
    makeCard({
      id: 'sys_serac',
      title: 'Serac',
      description: 'Reverse-osmosis whole-home with UV sterilization. 10 GPM. Well-water and high-TDS sources.',
      priceLabel: '$1,480',
      tag: 'flagship',
    }),
  ],
});

/** Premium/moody brand vibe — dark monochrome blue-steel, sans/mono, still,
 *  flat, data-driven. Deliberately NOT gifty: no motif, no warmth, no script. */
const WATER_VIBE: GenerationOutput = {
  vibe: {
    paletteSeed: { strategy: 'monochrome', baseHue: 225, key: 'dark', saturation: 'muted' },
    typography: {
      displayRole: 'sans',
      bodyRole: 'mono',
      scaleContrast: 1.7,
      displayCase: 'upper',
      displayTracking: 'wide',
      bodyLeading: 'normal',
    },
    spatial: { density: 'compact', baseUnitRem: 0.9, gutter: 'snug', measureCh: 64 },
    shape: { radius: 'sharp', imageMask: 'none', border: 'hairline' },
    depth: { elevation: 'flat' },
    texture: { grain: 0.02, wash: 0.05, motif: 'none' },
    motion: { character: 'still', easing: 'crisp' },
    imagery: { treatment: 'dim-overlay', textOverImage: true },
    moodWords: ['engineered', 'precise', 'clean', 'serious'],
    voice: {
      warmth: 'restrained',
      humor: 'none',
      pace: 'considered',
      formality: 'formal',
      emoji: 'none',
      vocabulary: 'elevated',
      length: 'natural',
    },
  },
  sections: [
    {
      type: 'hero',
      variant: 'centered-type',
      slots: { titleRef: 'title', subtitleRef: 'subtitle' },
      emphasis: 'focal',
    },
    { type: 'story', variant: 'banner', slots: { bodyRef: 'noteMd' } },
    {
      type: 'productSet',
      variant: 'tight-grid',
      slots: {
        cardRefs: ['sys_drift', 'sys_bedrock', 'sys_neve', 'sys_serac'],
        headingRef: 'group:systems',
      },
    },
    { type: 'cta', variant: 'banner-bar', slots: { labelRef: 'cta:primary' } },
    { type: 'footer', variant: 'branded', slots: { signatureRef: 'signature' } },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
 * Render
 * ════════════════════════════════════════════════════════════════════════ */

interface VerticalReport {
  key: string;
  label: string;
  repairsApplied: number;
  usedSafeDefaultVibe: boolean;
  paletteHex: Record<string, string>;
  contrast: {
    inkOnBg: number;
    inkOnSurface: number;
    inkMutedOnBg: number;
    onAccentOnAccent: number;
    accentOnBg: number;
  };
  passes: boolean;
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  // Imports AFTER the require.extensions('.css') stub is installed.
  const { SlugRenderer } = await import('../components/renderer/slug-renderer');
  const { fromGeneration } = await import('../components/renderer/page-state');
  const { contrastRatio, paletteToHex, INVARIANTS } = await import(
    '../lib/vibe/grammar'
  );

  const verticals: { key: string; label: string; content: PageContent; vibe: GenerationOutput }[] = [
    { key: 'config-swap-gift', label: 'Gift Peek — Priya turns 30', content: GIFT_CONTENT, vibe: GIFT_VIBE },
    { key: 'config-swap-water', label: 'GlacialSips — Water Filtration', content: WATER_CONTENT, vibe: WATER_VIBE },
  ];

  const reports: VerticalReport[] = [];

  for (const v of verticals) {
    // SAME production path as /g/[slug]: validate+repair vibe + composition,
    // then render through the SAME SlugRenderer.
    const page = fromGeneration(v.vibe, v.content);
    const html = renderToStaticMarkup(
      React.createElement(SlugRenderer, { page, 'data-mount': 'proof' }),
    );
    writeFileSync(join(OUT, `${v.key}.html`), htmlDoc(v.label, v.key, html), 'utf8');

    const p = page.vibe.palette.roles;
    const contrast = {
      inkOnBg: round(contrastRatio(p.ink, p.bg)),
      inkOnSurface: round(contrastRatio(p.ink, p.surface)),
      inkMutedOnBg: round(contrastRatio(p.inkMuted, p.bg)),
      onAccentOnAccent: round(contrastRatio(p.onAccent, p.accent)),
      accentOnBg: round(contrastRatio(p.accent, p.bg)),
    };
    const passes =
      contrast.inkOnBg >= INVARIANTS.CONTRAST_INK &&
      contrast.inkOnSurface >= INVARIANTS.CONTRAST_INK &&
      contrast.inkMutedOnBg >= INVARIANTS.CONTRAST_INK_MUTED &&
      contrast.onAccentOnAccent >= INVARIANTS.CONTRAST_ON_ACCENT &&
      contrast.accentOnBg >= INVARIANTS.CONTRAST_ACCENT_VS_BG;

    reports.push({
      key: v.key,
      label: v.label,
      repairsApplied: page.repairsApplied,
      usedSafeDefaultVibe: page.usedSafeDefaultVibe,
      paletteHex: paletteToHex(p),
      contrast,
      passes,
    });

    // eslint-disable-next-line no-console
    console.log(
      `[config-swap] ${v.key.padEnd(20)} repairs=${page.repairsApplied} safe=${page.usedSafeDefaultVibe} contrast(ink/bg=${contrast.inkOnBg}, onAccent=${contrast.onAccentOnAccent}, accent/bg=${contrast.accentOnBg}) ${passes ? 'PASS' : 'FAIL'}`,
    );
  }

  // Side-by-side gallery: two verticals, one engine.
  const gallery = `<!doctype html><html><head><meta charset="utf-8"/>
<title>PerfectPurchase — ONE engine, TWO verticals</title>
<style>${RESET}
body { font-family: system-ui, sans-serif; background:#0c0c0e; color:#eee; padding:16px; }
h1 { font-size:18px; } p.sub { color:#9aa; font-size:13px; margin-top:-6px; }
.grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
figure { margin:0; } figcaption { font-size:13px; padding:6px 2px; }
iframe { width:100%; height:1500px; border:1px solid #333; background:#fff; border-radius:6px; }
.meta { font-size:11px; color:#9ad; }</style></head>
<body><h1>ONE engine (grammar + renderer, ZERO changes) · TWO unrelated verticals · SSR</h1>
<p class="sub">Left: a gift experience. Right: a water-filtration storefront. Same renderer, same grammar — only the config/page-state differs.</p>
<div class="grid">
${reports
  .map(
    (r) =>
      `<figure><figcaption>${r.label}<div class="meta">${r.contrast.inkOnBg}:1 ink/bg · ${r.contrast.onAccentOnAccent}:1 onAccent · repairs ${r.repairsApplied} · ${r.passes ? 'a11y PASS' : 'a11y FAIL'}</div></figcaption>
<iframe src="./${r.key}.html" title="${r.label}"></iframe></figure>`,
  )
  .join('\n')}
</div></body></html>`;
  writeFileSync(join(OUT, 'config-swap-index.html'), gallery, 'utf8');

  const allPass = reports.every((r) => r.passes);
  // eslint-disable-next-line no-console
  console.log(`\n[config-swap] wrote ${reports.length} vertical pages + gallery to ${OUT}`);
  // eslint-disable-next-line no-console
  console.log(`[config-swap] a11y gate: ${allPass ? 'ALL PASS' : 'FAILURES PRESENT'}`);
  if (!allPass) process.exit(1);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

main().catch((err) => {
  console.error('[config-swap] failed:', err);
  process.exit(1);
});
