/**
 * Validated Vibe → CSS custom properties (the moat's emit path).
 * ==============================================================
 *
 * This is the single place a (already-validated) `Vibe` becomes the `--vibe-*`
 * record that gets spread into a wrapper `style` server-side. SSR computes this
 * → zero flash, no client hydration for theming.
 *
 * VAR-NAME COMPATIBILITY (load-bearing): the color vars keep the EXACT names
 * the legacy `lib/vibe/css-vars.ts` already emits (`--vibe-bg`, `--vibe-surface`,
 * `--vibe-ink`, `--vibe-accent`, `--vibe-accent2`, `--vibe-muted`,
 * `--vibe-type-display/body/mono`, `--vibe-radius-card/button`,
 * `--vibe-space-base`, `--vibe-motion-scale`) so the DB `vibe` column and any
 * existing consumer keep working. Colors are emitted as HSL TRIPLES (e.g.
 * `24 95% 53%`) so `hsl(var(--vibe-bg) / 0.5)` composition still works.
 *
 * NEW structural vars the grammar adds (renderer-only):
 *   --vibe-ink-muted, --vibe-on-accent, --vibe-accent-ink (alias)
 *   --vibe-scale-* (display/h2/eyebrow/body/caption — the modular scale)
 *   --vibe-leading-body, --vibe-tracking-display, --vibe-display-case
 *   --vibe-gutter, --vibe-section-y, --vibe-stack, --vibe-measure
 *   --vibe-border-width, --vibe-shadow-card, --vibe-shadow-float
 *   --vibe-grain, --vibe-wash, --vibe-ease
 */

import type { CSSProperties } from 'react';
import type { FontRole, Vibe } from './grammar';
import { oklchToHslTriple } from './oklch';

/** License-cleared font-family stacks per role (renderer owns this map). */
const FONT_STACK: Record<FontRole, string> = {
  serif: '"Fraunces", "Playfair Display", Georgia, serif',
  sans: '"Inter", system-ui, sans-serif',
  display: '"Bowlby One", "Anton", "Abril Fatface", Impact, sans-serif',
  mono: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
  script: '"Caveat", "Dancing Script", cursive',
};

const RADIUS_PX: Record<Vibe['shape']['radius'], { card: string; button: string }> = {
  sharp: { card: '4px', button: '2px' },
  soft: { card: '16px', button: '12px' },
  pillowy: { card: '32px', button: '24px' },
};

const BORDER_WIDTH: Record<Vibe['shape']['border'], string> = {
  none: '0px',
  hairline: '1px',
  bold: '2.5px',
};

const GUTTER_REM: Record<Vibe['spatial']['gutter'], number> = {
  edge: 0.75,
  snug: 1.25,
  roomy: 2,
};

const DENSITY_MULT: Record<Vibe['spatial']['density'], number> = {
  compact: 0.7,
  cozy: 1,
  breathable: 1.5,
};

const MOTION_SCALE: Record<Vibe['motion']['character'], string> = {
  still: '0.6',
  soft: '1',
  lively: '1.25',
};

const EASING: Record<Vibe['motion']['easing'], string> = {
  linear: 'linear',
  crisp: 'cubic-bezier(0.2, 0, 0, 1)',
  eased: 'cubic-bezier(0.22, 1, 0.36, 1)',
  bouncy: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

const LEADING: Record<Vibe['typography']['bodyLeading'], string> = {
  tight: '1.35',
  normal: '1.55',
  loose: '1.75',
};

const TRACKING: Record<Vibe['typography']['displayTracking'], string> = {
  tight: '-0.02em',
  normal: '0em',
  wide: '0.08em',
};

const DISPLAY_CASE: Record<Vibe['typography']['displayCase'], string> = {
  none: 'none',
  upper: 'uppercase',
  'small-caps': 'lowercase',
  title: 'capitalize',
};

export type VibeCssVars = Record<string, string>;

/**
 * Emit the `--vibe-*` record for a VALIDATED vibe. Pure. The output is spread
 * into a wrapper element's `style` (SSR).
 */
export function vibeToCssVars(vibe: Vibe): VibeCssVars {
  const p = vibe.palette.roles;
  const out: VibeCssVars = {};

  // ── Color roles (HSL triples; legacy-compatible names) ─────────────────
  out['--vibe-bg'] = oklchToHslTriple(p.bg);
  out['--vibe-surface'] = oklchToHslTriple(p.surface);
  out['--vibe-muted'] = oklchToHslTriple(p.surface); // legacy alias
  out['--vibe-ink'] = oklchToHslTriple(p.ink);
  out['--vibe-ink-muted'] = oklchToHslTriple(p.inkMuted);
  out['--vibe-accent'] = oklchToHslTriple(p.accent);
  out['--vibe-on-accent'] = oklchToHslTriple(p.onAccent);
  // legacy component-styles.ts reads `--vibe-bg` as accent-ink; provide the
  // semantically-correct on-accent under the legacy name path too.
  out['--vibe-accent-ink'] = oklchToHslTriple(p.onAccent);
  if (p.accent2) out['--vibe-accent2'] = oklchToHslTriple(p.accent2);

  // ── Typography (legacy + new) ──────────────────────────────────────────
  out['--vibe-type-display'] = FONT_STACK[vibe.typography.displayRole];
  out['--vibe-type-body'] = FONT_STACK[vibe.typography.bodyRole];
  out['--vibe-type-mono'] = FONT_STACK.mono;
  out['--vibe-leading-body'] = LEADING[vibe.typography.bodyLeading];
  out['--vibe-tracking-display'] = TRACKING[vibe.typography.displayTracking];
  out['--vibe-display-case'] = DISPLAY_CASE[vibe.typography.displayCase];

  // ── Modular type scale (geometric off scaleContrast) ───────────────────
  // body = 1rem floor (≥16px). Steps up by the ratio; capped so display stays
  // legible. eyebrow/caption step DOWN but never below 0.75rem.
  const r = vibe.typography.scaleContrast;
  const bodyRem = 1; // 16px floor invariant
  const captionRem = Math.max(0.8125, bodyRem / r);
  const eyebrowRem = Math.max(0.75, bodyRem / (r * 1.1));
  const cardTitleRem = bodyRem * Math.pow(r, 2);
  const h2Rem = bodyRem * Math.pow(r, 3);
  const displayRem = Math.min(bodyRem * Math.pow(r, 4), 6); // hard cap ~96px base
  out['--vibe-scale-body'] = `${bodyRem}rem`;
  out['--vibe-scale-caption'] = `${round(captionRem)}rem`;
  out['--vibe-scale-eyebrow'] = `${round(eyebrowRem)}rem`;
  out['--vibe-scale-card-title'] = `${round(cardTitleRem)}rem`;
  out['--vibe-scale-h2'] = `${round(h2Rem)}rem`;
  out['--vibe-scale-display'] = `clamp(${round(h2Rem)}rem, ${round(displayRem * 0.5)}rem + 4vw, ${round(displayRem)}rem)`;

  // ── Shape ──────────────────────────────────────────────────────────────
  out['--vibe-radius-card'] = RADIUS_PX[vibe.shape.radius].card;
  out['--vibe-radius-button'] = RADIUS_PX[vibe.shape.radius].button;
  out['--vibe-border-width'] = BORDER_WIDTH[vibe.shape.border];

  // ── Spatial ────────────────────────────────────────────────────────────
  const mult = DENSITY_MULT[vibe.spatial.density];
  const base = vibe.spatial.baseUnitRem;
  out['--vibe-space-base'] = `${round(base)}rem`;
  out['--vibe-stack'] = `${round(base * mult)}rem`;
  out['--vibe-gutter'] = `${round(GUTTER_REM[vibe.spatial.gutter])}rem`;
  out['--vibe-section-y'] = `${round(base * mult * 2.5)}rem`;
  out['--vibe-measure'] = `${Math.round(vibe.spatial.measureCh)}ch`;

  // ── Depth (shadows; glow on dark keys handled by renderer fallback) ────
  const isDark = vibe.palette.key !== 'light';
  out['--vibe-shadow-card'] = shadowFor(vibe.depth.elevation, isDark, false);
  out['--vibe-shadow-float'] = shadowFor(vibe.depth.elevation, isDark, true);

  // ── Texture ────────────────────────────────────────────────────────────
  out['--vibe-grain'] = String(vibe.texture.grain);
  out['--vibe-wash'] = String(vibe.texture.wash);

  // ── Motion ─────────────────────────────────────────────────────────────
  out['--vibe-motion-scale'] = MOTION_SCALE[vibe.motion.character];
  out['--vibe-ease'] = EASING[vibe.motion.easing];

  return out;
}

function shadowFor(
  elevation: Vibe['depth']['elevation'],
  isDark: boolean,
  floating: boolean,
): string {
  if (elevation === 'flat') return 'none';
  // On dark keys a black drop-shadow is invisible; express as a subtle ring.
  if (isDark) {
    return floating
      ? '0 0 0 1px hsl(var(--vibe-ink) / 0.18), 0 8px 28px hsl(0 0% 0% / 0.5)'
      : '0 0 0 1px hsl(var(--vibe-ink) / 0.12)';
  }
  const y = elevation === 'dramatic' ? (floating ? 28 : 14) : floating ? 18 : 8;
  const blur = elevation === 'dramatic' ? (floating ? 60 : 36) : floating ? 40 : 22;
  const alpha = elevation === 'dramatic' ? 0.18 : 0.12;
  return `0 ${y}px ${blur}px -${Math.round(blur / 3)}px hsl(var(--vibe-ink) / ${alpha})`;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Convenience: the vibe vars typed as React CSSProperties for direct spread
 * into a `style` prop. (CSS custom properties aren't in CSSProperties' type,
 * so we cast — the runtime value is a plain string record either way.)
 */
export function vibeStyle(vibe: Vibe): CSSProperties {
  return vibeToCssVars(vibe) as CSSProperties;
}
