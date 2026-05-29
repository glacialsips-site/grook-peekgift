/**
 * MOBILE VIBE GALLERY — render all 40 grammar presets, mobile-first, self-hosted fonts.
 * ====================================================================================
 *
 * Why this exists: the 7-preset SSR demos shipped on bold-ride looked like the
 * legacy site because (a) the sandbox couldn't pull Google Fonts at render
 * time so display/script/serif all fell to system-ui or Georgia, and (b) the
 * iframes rendered at desktop viewport while the product is mobile-first.
 *
 * What it does:
 *   - Renders the canonical Maya housewarming peek through ALL 40 presets.
 *   - Self-hosts every Google Font the grammar's FONT_STACK references (the
 *     `app-fonts.css` next to this script + the `fonts/` woff2 dir).
 *   - Wraps each render in a fixed 375px-wide column so the gallery is honest
 *     mobile output even when viewed on a desktop.
 *   - Layout-variant picker chooses per-preset intent (zine-punk → editorial-
 *     full-bleed hero, brutalist → centered-type, romantic → stacked-card).
 *
 * Output:
 *   prototypes/mobile-vibe-gallery/renders/<vibe-key>.html  (per-preset page)
 *   prototypes/mobile-vibe-gallery/index.html               (the gallery hub)
 *   prototypes/mobile-vibe-gallery/manifest.json            (audit trail)
 */

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// ── CSS-module require stub (no bundler in tsx land) ─────────────────────
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ATELIER = join(ROOT, 'atelier');
const RENDERS_DIR = join(__dirname, 'renders');
const RENDERER_CSS = readFileSync(
  join(ATELIER, 'components', 'renderer', 'renderer.module.css'),
  'utf8',
);
const FONTS_CSS = readFileSync(join(__dirname, 'app-fonts.css'), 'utf8');

// ── Mobile-shell document ────────────────────────────────────────────────
const RESET = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #0a0a0a; }
img { max-width: 100%; display: block; }
a { color: inherit; }
.phone {
  width: 375px;
  max-width: 100vw;
  margin: 0 auto;
  background: white;
  box-shadow: 0 2px 24px rgba(0,0,0,0.3);
  overflow: hidden;
  min-height: 100dvh;
}
@media (max-width: 420px) {
  .phone { width: 100vw; box-shadow: none; }
}
.crumbs {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10,10,10,0.92);
  color: #ddd;
  font: 12px/1.4 -apple-system, system-ui, sans-serif;
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid #222;
  backdrop-filter: blur(6px);
}
.crumbs a { color: #6cf; text-decoration: none; }
.crumbs .meta { color: #888; font-size: 11px; }
`;

/**
 * Mobile-overrides — patches the renderer CSS to fit honestly inside 375px.
 *
 * The renderer's display scale uses `clamp(... 4vw, 6rem)` which resolves
 * larger than 375px column for high-scaleContrast presets (concrete-poet,
 * neon-club, concert-poster). Without overflow-wrap, the headline runs off the
 * edge. These overrides:
 *   - cap heading sizes against a vw-based ceiling
 *   - turn on overflow-wrap/hyphens so long words (Housewarming) break
 *   - narrow the horizontal-scroll snap so cards don't bleed at 375px
 *   - tint the placeholder media (currently a flat surface) so the eye
 *     reads "image goes here" rather than "empty card"
 *
 * These are DEMO-time overlays; they do NOT modify the merged atelier code.
 * The real fix belongs in atelier/components/renderer/renderer.module.css —
 * called out in the report so dev can land it.
 */
const MOBILE_OVERRIDES = `
.heroTitle, .sectionHeading, .cardTitle {
  overflow-wrap: anywhere;
  word-break: break-word;
  hyphens: auto;
}
.heroTitle {
  font-size: min(var(--vibe-scale-display), 14vw);
  line-height: 1.04;
}
.sectionHeading {
  font-size: min(var(--vibe-scale-h2), 10vw);
}
.cardTitle {
  font-size: min(var(--vibe-scale-card-title), 7vw);
}
.cardSet[data-variant='editorial-full-bleed'] .cardTitle {
  font-size: min(var(--vibe-scale-h2), 9vw);
}
/* tight-grid puts cards into ~150px columns — card-title must be even smaller
   or "Aurora" wraps to one letter per line for serif display fonts */
.cardSet[data-variant='tight-grid'] .cardTitle {
  font-size: min(var(--vibe-scale-card-title), 4.8vw);
  line-height: 1.1;
}
.cardSet[data-variant='horizontal-scroll'] .cardList {
  grid-auto-columns: 75%;
}
.cardSet[data-variant='horizontal-scroll'] .cardTitle {
  font-size: min(var(--vibe-scale-card-title), 5.6vw);
}
/* list keeps a thumbnail + tight content column — title cap */
.cardSet[data-variant='list'] .cardTitle {
  font-size: min(var(--vibe-scale-card-title), 5.6vw);
}
.story[data-variant='banner'] .storyBody,
.story[data-variant='pull-quote'] .storyBody {
  font-size: min(var(--vibe-scale-h2), 7.5vw);
  line-height: 1.18;
  overflow-wrap: anywhere;
}
.hero, .section, .cta, .footer { padding-block: calc(var(--vibe-section-y) * 0.7); }
/* tint placeholder media so empty cards read as images, not voids */
.cardMedia[data-placeholder='true'] {
  background-image:
    linear-gradient(135deg, hsl(var(--vibe-accent) / 0.4), hsl(var(--vibe-surface))),
    repeating-linear-gradient(45deg, transparent 0 6px, hsl(var(--vibe-ink) / 0.04) 6px 8px);
}
.heroMedia {
  background-image:
    linear-gradient(135deg, hsl(var(--vibe-accent) / 0.3), hsl(var(--vibe-surface))),
    repeating-linear-gradient(45deg, transparent 0 8px, hsl(var(--vibe-ink) / 0.04) 8px 10px);
}
`;

function htmlDoc(title: string, vibeKey: string, vibeLabel: string, meta: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=375, initial-scale=1, maximum-scale=1" />
<title>peek.gift · ${title}</title>
<style>${FONTS_CSS}</style>
<style>${RESET}</style>
<style>${RENDERER_CSS}</style>
<style>${MOBILE_OVERRIDES}</style>
</head>
<body data-vibe="${vibeKey}">
<nav class="crumbs">
  <span><a href="../index.html">← gallery</a> · <strong>${vibeLabel}</strong></span>
  <span class="meta">${meta}</span>
</nav>
<div class="phone">
${body}
</div>
</body>
</html>`;
}

// ── Variant pickers — intent-driven, not random ──────────────────────────
import type { VibeKey, VibePreset } from '../../atelier/lib/vibe/grammar';
import type {
  Section,
  HeroVariant,
  ProductSetVariant,
  StoryVariant,
  CtaVariant,
  DividerVariant,
  FooterVariant,
} from '../../atelier/lib/vibe/grammar';

/**
 * Pick hero variant from the preset's vibe signals. Mobile-friendly rules:
 *   - `centered-type` for type-forward / poster vibes (display+upper).
 *   - `minimal-mark` for editorial-quiet / luxury (lots of space, no media).
 *   - `stacked-card` for soft / pillowy / playful (card + caption).
 *   - `split` deliberately avoided on mobile (single-col anyway, looks weak).
 *   - `full-bleed-image` only when there's a hero image (we don't have one).
 */
function pickHero(p: VibePreset): HeroVariant {
  const { typography, shape, depth, spatial, family, key } = expand(p);
  if (family === 'brutalist-contemporary') return 'centered-type';
  if (family === 'editorial-quiet') {
    if (key === 'museum-label' || key === 'wireframe' || key === 'chalk-line') return 'minimal-mark';
    return 'minimal-mark';
  }
  if (family === 'bold-loud') return 'centered-type';
  if (family === 'cosmic-cinematic') return 'centered-type';
  if (family === 'playful-bright') return 'stacked-card';
  if (family === 'romantic-sentimental') return 'stacked-card';
  if (family === 'cozy-domestic') return 'stacked-card';
  // fallthrough by type signal
  if (typography.displayRole === 'display' && typography.displayCase === 'upper') return 'centered-type';
  if (shape.radius === 'pillowy' || depth.elevation === 'dramatic') return 'stacked-card';
  if (spatial.density === 'breathable' && typography.displayRole === 'serif') return 'minimal-mark';
  return 'stacked-card';
}

/**
 * Pick a productSet variant for The Drop (3 cards). Rules per family:
 *   - bold-loud → horizontal-scroll (party rail) or editorial-full-bleed (poster).
 *   - editorial-quiet → list or editorial-full-bleed.
 *   - brutalist-contemporary → tight-grid (modular).
 *   - playful-bright → collage-masonry (only if ≥4 cards; we have 3, so → tight-grid).
 *   - romantic / cozy → editorial-full-bleed (each gift gets a moment).
 *   - cosmic-cinematic → single-hero-product OR editorial-full-bleed.
 *
 * Constraint: 3 cards. Legal for 3 are: tight-grid, horizontal-scroll,
 * editorial-full-bleed.  (collage-masonry needs ≥4; single-hero-product is 1.)
 */
function pickDropVariant(p: VibePreset): ProductSetVariant {
  const f = p.family;
  const k = p.key;
  // Per-key overrides (the most expressive picks).
  const overrides: Partial<Record<VibeKey, ProductSetVariant>> = {
    'zine-punk': 'editorial-full-bleed',
    'concert-poster': 'editorial-full-bleed',
    'velvet-rope': 'editorial-full-bleed',
    'chalk-line': 'list',
    'museum-label': 'list',
    'silver-print': 'editorial-full-bleed',
    'paper-letter': 'list',
    'wireframe': 'tight-grid',
    'soft-brutalist': 'tight-grid',
    'concrete-poet': 'editorial-full-bleed',
    'cinema-noir': 'editorial-full-bleed',
    'aurora-bloom': 'horizontal-scroll',
    'cottage-warm': 'tight-grid',
    'kitchen-table': 'list',
    'cabin-stack': 'editorial-full-bleed',
    'quilt-square': 'tight-grid',
    'garden-letter': 'editorial-full-bleed',
    'dusk-poem': 'editorial-full-bleed',
    'velvet-night': 'editorial-full-bleed',
    'lace-window': 'tight-grid',
    'field-flowers': 'tight-grid',
    'paper-airplane': 'list',
    'confetti-pop': 'horizontal-scroll',
    'birthday-balloon': 'tight-grid',
    'taffy-pull': 'tight-grid',
    'ice-cream-truck': 'horizontal-scroll',
    'crayon-box': 'tight-grid',
    'gummy-bear': 'tight-grid',
    'mermaid-pearl': 'tight-grid',
    'flag-stand': 'horizontal-scroll',
    'neon-club': 'horizontal-scroll',
    'vegas-blur': 'horizontal-scroll',
    'miami-vice': 'horizontal-scroll',
    'racing-stripe': 'tight-grid',
    'sticker-pack': 'horizontal-scroll',
    'arcade-cabinet': 'tight-grid',
    'slow-craft': 'editorial-full-bleed',
    'studio-mono': 'editorial-full-bleed',
    'stargazer': 'editorial-full-bleed',
    'linen-warm': 'tight-grid',
  };
  if (overrides[k]) return overrides[k]!;
  // Family defaults.
  if (f === 'bold-loud') return 'horizontal-scroll';
  if (f === 'editorial-quiet') return 'editorial-full-bleed';
  if (f === 'brutalist-contemporary') return 'tight-grid';
  if (f === 'playful-bright') return 'horizontal-scroll';
  if (f === 'romantic-sentimental') return 'editorial-full-bleed';
  if (f === 'cozy-domestic') return 'tight-grid';
  return 'tight-grid';
}

/** Pick The Kit variant (2 cards). Legal for 2: editorial-full-bleed, list. */
function pickKitVariant(p: VibePreset): ProductSetVariant {
  const drop = pickDropVariant(p);
  // Contrast: if Drop is a big editorial, Kit can be list (and vice versa).
  if (drop === 'editorial-full-bleed') return 'list';
  return 'editorial-full-bleed';
}

function pickStory(p: VibePreset): StoryVariant {
  const v = p.output.vibe;
  if (v.voice.length === 'punchy') return 'banner';
  if (v.typography.displayRole === 'serif' && v.spatial.density === 'breathable') return 'pull-quote';
  return 'prose';
}

function pickCta(p: VibePreset): CtaVariant {
  if (p.family === 'editorial-quiet') return 'inline-link';
  if (p.family === 'bold-loud') return 'banner-bar';
  return 'button-row';
}

function pickDivider(p: VibePreset): DividerVariant {
  if (p.family === 'editorial-quiet' || p.family === 'brutalist-contemporary') return 'label';
  if (p.output.vibe.texture.motif !== 'none') return 'motif';
  return 'label';
}

function pickFooter(p: VibePreset): FooterVariant {
  if (p.family === 'bold-loud') return 'branded';
  return 'signature';
}

function expand(p: VibePreset) {
  const v = p.output.vibe;
  return {
    typography: v.typography,
    shape: v.shape,
    depth: v.depth,
    spatial: v.spatial,
    family: p.family,
    key: p.key,
  };
}

// ── Build the per-vibe section list (uses the same 6-section Maya layout) ─
function buildSections(p: VibePreset): Section[] {
  return [
    {
      type: 'hero',
      variant: pickHero(p),
      slots: { titleRef: 'title', subtitleRef: 'subtitle' },
      emphasis: 'focal',
    },
    {
      type: 'story',
      variant: pickStory(p),
      slots: { bodyRef: 'noteMd' },
    },
    {
      type: 'productSet',
      variant: pickDropVariant(p),
      slots: {
        cardRefs: ['card_drop_1', 'card_drop_2', 'card_drop_3'],
        headingRef: 'group:grp_drop',
      },
    },
    { type: 'divider', variant: pickDivider(p) },
    {
      type: 'productSet',
      variant: pickKitVariant(p),
      slots: {
        cardRefs: ['card_kit_1', 'card_kit_2'],
        headingRef: 'group:grp_kit',
      },
    },
    { type: 'cta', variant: pickCta(p), slots: { labelRef: 'cta:primary' } },
    {
      type: 'footer',
      variant: pickFooter(p),
      slots: { signatureRef: 'signature' },
    },
  ];
}

interface ManifestEntry {
  key: string;
  label: string;
  family: string;
  dna: string;
  hero: string;
  drop: string;
  kit: string;
  story: string;
  cta: string;
  divider: string;
  footer: string;
  fontsResolved: { display: string; body: string };
  contrastInkOnBg: number;
  contrastOnAccentOnAccent: number;
  contrastAccentOnBg: number;
  passes: boolean;
  repairsApplied: number;
}

async function main() {
  mkdirSync(RENDERS_DIR, { recursive: true });

  const { SlugRenderer } = await import('../../atelier/components/renderer/slug-renderer');
  const { buildPeekContent, fromGeneration } = await import(
    '../../atelier/components/renderer/page-state'
  );
  const { examplePeek, exampleCards, exampleVariantGroups } = await import(
    '../../atelier/lib/vibe/grammar/fixtures'
  );
  const { VIBE_PRESETS, contrastRatio, INVARIANTS } = await import(
    '../../atelier/lib/vibe/grammar'
  );

  const content = buildPeekContent({
    peek: examplePeek,
    cards: exampleCards,
    variantGroups: exampleVariantGroups,
  });

  const manifest: ManifestEntry[] = [];
  const allKeys = Object.keys(VIBE_PRESETS) as VibeKey[];

  for (const key of allKeys) {
    const preset = VIBE_PRESETS[key];
    const sections = buildSections(preset);
    const output = { vibe: preset.output.vibe, sections };
    const page = fromGeneration(output, content);

    const body = renderToStaticMarkup(
      React.createElement(SlugRenderer, { page, 'data-mount': 'mobile-gallery' }),
    );
    const p = page.vibe.palette.roles;
    const contrast = {
      inkOnBg: round2(contrastRatio(p.ink, p.bg)),
      onAccentOnAccent: round2(contrastRatio(p.onAccent, p.accent)),
      accentOnBg: round2(contrastRatio(p.accent, p.bg)),
    };
    const passes =
      contrast.inkOnBg >= INVARIANTS.CONTRAST_INK &&
      contrast.onAccentOnAccent >= INVARIANTS.CONTRAST_ON_ACCENT &&
      contrast.accentOnBg >= INVARIANTS.CONTRAST_ACCENT_VS_BG;

    const meta = `${preset.family} · ${contrast.inkOnBg}:1 ink · ${page.repairsApplied} repairs · ${passes ? 'a11y ✓' : 'a11y ✗'}`;
    writeFileSync(
      join(RENDERS_DIR, `${key}.html`),
      htmlDoc(preset.label, key, preset.label, meta, body),
      'utf8',
    );

    manifest.push({
      key,
      label: preset.label,
      family: preset.family,
      dna: preset.dna,
      hero: sections[0]!.type === 'hero' ? (sections[0] as { variant: string }).variant : '',
      drop: (sections[2] as { variant: string }).variant,
      kit: (sections[4] as { variant: string }).variant,
      story: (sections[1] as { variant: string }).variant,
      cta: (sections[5] as { variant: string }).variant,
      divider: (sections[3] as { variant: string }).variant,
      footer: (sections[6] as { variant: string }).variant,
      fontsResolved: {
        display: page.vibe.typography.displayRole,
        body: page.vibe.typography.bodyRole,
      },
      contrastInkOnBg: contrast.inkOnBg,
      contrastOnAccentOnAccent: contrast.onAccentOnAccent,
      contrastAccentOnBg: contrast.accentOnBg,
      passes,
      repairsApplied: page.repairsApplied,
    });

    process.stdout.write(
      `[render] ${key.padEnd(18)} hero=${manifest.at(-1)!.hero.padEnd(14)} drop=${manifest.at(-1)!.drop.padEnd(20)} kit=${manifest.at(-1)!.kit.padEnd(20)} ${passes ? 'PASS' : 'FAIL'}\n`,
    );
  }

  // Gallery index — vertical scroll of preview cards, mobile-first.
  const gallery = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>peek.gift · mobile vibe gallery · 40 presets</title>
<style>
${FONTS_CSS}
${RESET}
body { background: #0a0a0a; color: #eee; font: 14px/1.5 -apple-system, system-ui, sans-serif; }
header { padding: 16px; border-bottom: 1px solid #222; position: sticky; top: 0; background: rgba(10,10,10,0.95); backdrop-filter: blur(6px); z-index: 20; }
header h1 { margin: 0 0 4px 0; font-size: 18px; font-weight: 700; }
header p { margin: 0; color: #888; font-size: 12px; }
.filter { padding: 0 16px 12px; display: flex; gap: 6px; flex-wrap: wrap; }
.filter button { background: #222; color: #ddd; border: 1px solid #333; border-radius: 999px; padding: 4px 10px; font-size: 12px; cursor: pointer; }
.filter button.on { background: #6cf; color: #000; border-color: #6cf; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  padding: 12px;
}
.tile {
  background: #151515;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.tile a {
  display: block;
  text-decoration: none;
  color: inherit;
}
.tile .preview {
  height: 320px;
  background: #f3f3f3;
  overflow: hidden;
  position: relative;
}
.tile .preview iframe {
  border: 0;
  width: 375px;
  height: 800px;
  transform: scale(0.65);
  transform-origin: top left;
  background: white;
  pointer-events: none;
}
.tile .label {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tile .label strong { font-size: 13px; }
.tile .label small { color: #888; font-size: 11px; }
.tile .meta { font-size: 10px; color: #6cf; padding: 0 10px 8px; }
.fail { color: #f66 !important; }
</style>
</head>
<body>
<header>
  <h1>peek.gift · mobile vibe gallery</h1>
  <p>${manifest.length} grammar presets · one peek (Maya's housewarming · hero + The Drop ×3 + The Kit ×2) · self-hosted fonts · rendered at 375px viewport, scaled to fit tile</p>
</header>
<div class="filter" id="filter"></div>
<div class="grid">
${manifest
  .map(
    (m) => `<div class="tile" data-family="${m.family}">
  <a href="./renders/${m.key}.html">
    <div class="preview"><iframe src="./renders/${m.key}.html" loading="lazy" scrolling="no"></iframe></div>
    <div class="label">
      <strong>${m.label}</strong>
      <small>${m.family} · ${m.dna}</small>
    </div>
    <div class="meta">hero:${m.hero} · drop:${m.drop} · kit:${m.kit} · ${m.contrastInkOnBg}:1 ${m.passes ? '' : '<span class="fail">a11y FAIL</span>'}</div>
  </a>
</div>`,
  )
  .join('\n')}
</div>
<script>
const families = [...new Set([...document.querySelectorAll('.tile')].map(t => t.dataset.family))].sort();
const filterEl = document.getElementById('filter');
filterEl.innerHTML = '<button class="on" data-fam="*">all (${manifest.length})</button>' +
  families.map(f => '<button data-fam="'+f+'">'+f+'</button>').join('');
filterEl.addEventListener('click', (e) => {
  if (e.target.tagName !== 'BUTTON') return;
  const fam = e.target.dataset.fam;
  filterEl.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.target));
  document.querySelectorAll('.tile').forEach(t => {
    t.style.display = (fam === '*' || t.dataset.family === fam) ? '' : 'none';
  });
});
</script>
</body></html>`;
  writeFileSync(join(__dirname, 'index.html'), gallery, 'utf8');
  writeFileSync(
    join(__dirname, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  );

  const fails = manifest.filter((m) => !m.passes);
  console.log(`\n[gallery] wrote ${manifest.length} renders → ${RENDERS_DIR}`);
  console.log(`[gallery] index → ${join(__dirname, 'index.html')}`);
  console.log(`[gallery] a11y: ${fails.length === 0 ? 'all pass' : `${fails.length} fail (${fails.map((f) => f.key).join(', ')})`}`);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

main().catch((err) => {
  console.error('[gallery] failed:', err);
  process.exit(1);
});
