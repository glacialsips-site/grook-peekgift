/**
 * SSR PROOF — render ONE peek across 3 radically different vibes.
 * ==============================================================
 *
 * Renders the example peek (hero + "The Drop" 3 cards + "The Kit" 2 cards)
 * through the REAL renderer + REAL grammar pipeline, once per vibe
 * (princess / bachelor / luxe), to standalone openable HTML. Proves range is
 * inspectable in the actual app components — not a mock.
 *
 * Run: node --import ./scripts/css-module-stub.mjs --import tsx \
 *        scripts/render-vibe-proof.tsx
 * (the npm script `proof:render` wraps this.)
 *
 * Output: scripts/proof-out/{princess,bachelor,luxe}.html + index.html + report.json
 */

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// ── CSS-module require stub (the proof runs under tsx, no bundler) ────────
// tsx compiles the renderer's `.tsx`/`.ts` to CommonJS and `require()`s the
// `renderer.module.css` import. There's no CSS loader, so we register a
// require.extension that returns an identity Proxy (`styles.heroTitle` →
// "heroTitle"). The raw CSS (plain `.heroTitle` selectors) is inlined into the
// proof HTML, so identity class names line up. This MUST run before the
// renderer is loaded → the renderer is pulled via dynamic import() in main().
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

import type { ProofVibeKey } from '../lib/vibe/grammar/fixtures';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'proof-out');
const CSS = readFileSync(join(__dirname, '..', 'components', 'renderer', 'renderer.module.css'), 'utf8');

// Minimal page reset so the standalone HTML looks like the app (no Tailwind here).
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
<title>peek.gift proof — ${title}</title>
<style>${RESET}\n${CSS}</style>
</head>
<body data-proof-vibe="${vibeKey}">
${body}
</body>
</html>`;
}

interface VibeReport {
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

  // Runtime imports AFTER the require.extensions('.css') stub is installed.
  const { SlugRenderer } = await import('../components/renderer/slug-renderer');
  const { buildPeekContent, fromGeneration } = await import(
    '../components/renderer/page-state'
  );
  const { PROOF_VIBES, examplePeek, exampleCards, exampleVariantGroups } =
    await import('../lib/vibe/grammar/fixtures');
  const { contrastRatio, paletteToHex, INVARIANTS } = await import(
    '../lib/vibe/grammar'
  );

  const content = buildPeekContent({
    peek: examplePeek,
    cards: exampleCards,
    variantGroups: exampleVariantGroups,
  });

  const reports: VibeReport[] = [];
  const keys = Object.keys(PROOF_VIBES) as ProofVibeKey[];

  for (const key of keys) {
    const { label, output } = PROOF_VIBES[key];
    const page = fromGeneration(output, content);
    const html = renderToStaticMarkup(
      React.createElement(SlugRenderer, { page, 'data-mount': 'proof' }),
    );
    writeFileSync(join(OUT, `${key}.html`), htmlDoc(label, key, html), 'utf8');

    // Contrast audit on the validated palette (the never-broken proof).
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
      key,
      label,
      repairsApplied: page.repairsApplied,
      usedSafeDefaultVibe: page.usedSafeDefaultVibe,
      paletteHex: paletteToHex(p),
      contrast,
      passes,
    });

    // eslint-disable-next-line no-console
    console.log(
      `[proof] ${key.padEnd(9)} repairs=${page.repairsApplied} safe=${page.usedSafeDefaultVibe} contrast(ink/bg=${contrast.inkOnBg}, onAccent=${contrast.onAccentOnAccent}, accent/bg=${contrast.accentOnBg}) ${passes ? 'PASS' : 'FAIL'}`,
    );
  }

  // Gallery index: side-by-side iframes.
  const gallery = `<!doctype html><html><head><meta charset="utf-8"/>
<title>peek.gift — 3-vibe SSR proof</title>
<style>${RESET}
body { font-family: system-ui, sans-serif; background:#111; color:#eee; padding:16px; }
h1 { font-size:18px; } .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
figure { margin:0; } figcaption { font-size:13px; padding:6px 2px; }
iframe { width:100%; height:1400px; border:1px solid #333; background:#fff; border-radius:6px; }
.meta { font-size:11px; color:#9ad; }</style></head>
<body><h1>ONE peek (hero + The Drop ×3 + The Kit ×2) · 3 radically different vibes · SSR</h1>
<div class="grid">
${reports
  .map(
    (r) =>
      `<figure><figcaption>${r.label}<div class="meta">${r.contrast.inkOnBg}:1 ink/bg · ${r.contrast.onAccentOnAccent}:1 onAccent · repairs ${r.repairsApplied} · ${r.passes ? 'a11y PASS' : 'a11y FAIL'}</div></figcaption>
<iframe src="./${r.key}.html" title="${r.label}"></iframe></figure>`,
  )
  .join('\n')}
</div></body></html>`;
  writeFileSync(join(OUT, 'index.html'), gallery, 'utf8');
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(reports, null, 2), 'utf8');

  const allPass = reports.every((r) => r.passes);
  // eslint-disable-next-line no-console
  console.log(`\n[proof] wrote ${reports.length} pages + gallery to ${OUT}`);
  // eslint-disable-next-line no-console
  console.log(`[proof] a11y gate: ${allPass ? 'ALL PASS' : 'FAILURES PRESENT'}`);
  if (!allPass) process.exit(1);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

main().catch((err) => {
  console.error('[proof] failed:', err);
  process.exit(1);
});
