/**
 * Vibe → CSS custom-property bridge.
 *
 * The Vibe object (see `db/schema/peeks.ts`) is the page's central nervous
 * system. This module is the single place that converts the seven dials into
 * the CSS variables consumed by the preview pane, the recipient `/g/[slug]`
 * surface, and any other vibe-aware components.
 *
 * Output keys are emitted in BOTH naming conventions:
 *
 *   - `--peek-*` — the legacy variable names already wired into the existing
 *     surfaces. Keeping these means we don't have to touch every CSS literal
 *     in the codebase at once.
 *   - `--vibe-*` — the canonical names from `_packets/SPINE/skills/vibe-direction.md`.
 *     New components and the eventual Vibe primitives (VibeText, VibeCard, …)
 *     should consume these.
 *
 * Palette values are stored as hex in the DB but the legacy templates
 * (e.g. `0 0% 100%`) are also accepted. We normalize to an HSL TRIPLE
 * (`H S% L%`) so consumers can render with `hsl(var(--peek-bg))` and still
 * compose alpha (`hsl(var(--peek-bg) / 0.5)`).
 */

import type {
  Vibe,
  VibeBodyFont,
  VibeDensity,
  VibeHeadingFont,
  VibeMood,
  VibeMotion,
  VibeShape,
} from '@/db/schema/peeks';

export type VibeCssVars = Record<string, string>;

const HEADING_FONT_VAR: Record<VibeHeadingFont, string> = {
  serif: '"Fraunces", "Playfair Display", Georgia, serif',
  display: '"Bowlby One", "Anton", "Abril Fatface", Impact, sans-serif',
  sans: '"Inter Display", Inter, system-ui, sans-serif',
  mono: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
  script: '"Caveat", "Dancing Script", "Comic Sans MS", cursive',
};

const BODY_FONT_VAR: Record<VibeBodyFont, string> = {
  sans: 'Inter, system-ui, sans-serif',
  serif: '"Lora", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

/**
 * Per-density spacing scale. The 1x baseline is "cozy"; "compact" tightens
 * vertical rhythm for hyperactive peeks (gag-heavy birthdays, teen-grad)
 * and "breathable" opens it up for sentimental occasions (weddings, 80th).
 */
const DENSITY_SPACE: Record<VibeDensity, Record<string, string>> = {
  compact: {
    '--peek-space-1': '0.125rem',
    '--peek-space-2': '0.375rem',
    '--peek-space-3': '0.5rem',
    '--peek-space-4': '0.75rem',
    '--peek-space-5': '1rem',
    '--peek-space-6': '1.25rem',
    '--peek-space-8': '1.5rem',
    '--vibe-space-base': '0.75rem',
    '--vibe-space-gap': '0.6',
  },
  cozy: {
    '--peek-space-1': '0.25rem',
    '--peek-space-2': '0.5rem',
    '--peek-space-3': '0.75rem',
    '--peek-space-4': '1rem',
    '--peek-space-5': '1.25rem',
    '--peek-space-6': '1.5rem',
    '--peek-space-8': '2rem',
    '--vibe-space-base': '1rem',
    '--vibe-space-gap': '1',
  },
  breathable: {
    '--peek-space-1': '0.375rem',
    '--peek-space-2': '0.75rem',
    '--peek-space-3': '1rem',
    '--peek-space-4': '1.5rem',
    '--peek-space-5': '2rem',
    '--peek-space-6': '2.5rem',
    '--peek-space-8': '3.5rem',
    '--vibe-space-base': '1.5rem',
    '--vibe-space-gap': '1.5',
  },
};

const SHAPE_RADIUS: Record<VibeShape, Record<string, string>> = {
  sharp: {
    '--peek-radius': '4px',
    '--peek-radius-sm': '2px',
    '--peek-radius-lg': '6px',
    '--vibe-radius-card': '4px',
    '--vibe-radius-button': '2px',
  },
  soft: {
    '--peek-radius': '12px',
    '--peek-radius-sm': '8px',
    '--peek-radius-lg': '16px',
    '--vibe-radius-card': '16px',
    '--vibe-radius-button': '12px',
  },
  pillowy: {
    '--peek-radius': '24px',
    '--peek-radius-sm': '16px',
    '--peek-radius-lg': '32px',
    '--vibe-radius-card': '32px',
    '--vibe-radius-button': '24px',
  },
};

/**
 * Motion-scale multiplier applied to framer-motion durations. Lower = stiller,
 * higher = bouncier. Used by the cinematic reveal sequence and component-level
 * micro-animations on the recipient surface.
 */
const MOTION_SCALE: Record<VibeMotion, string> = {
  still: '0.6',
  soft: '1',
  lively: '1.25',
};

/**
 * Mood → texture treatment. Consumed by mood-aware backdrops (grain overlay,
 * confetti SVG, gradient wash). Stored as a flag so components can conditionally
 * mount the right embellishments.
 */
const MOOD_TEXTURE: Record<VibeMood, Record<string, string>> = {
  minimal: { '--vibe-mood-grain': '0', '--vibe-mood-overlay': '0' },
  rich: { '--vibe-mood-grain': '0.04', '--vibe-mood-overlay': '0.08' },
  whimsical: { '--vibe-mood-grain': '0', '--vibe-mood-overlay': '0.12' },
  editorial: { '--vibe-mood-grain': '0.02', '--vibe-mood-overlay': '0' },
};

type TypeRole = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small';

type TypeScaleAxis = {
  min: number;
  max: number;
  vw: number;
};

type TypeScalePreset = Record<TypeRole, TypeScaleAxis>;

const TYPE_SCALE_DENSITY: Record<VibeDensity, TypeScalePreset> = {
  compact: {
    display: { min: 1.875, max: 3, vw: 5 },
    h1: { min: 1.5, max: 2.375, vw: 4.2 },
    h2: { min: 1.25, max: 1.75, vw: 3 },
    h3: { min: 1.0625, max: 1.375, vw: 2.4 },
    body: { min: 0.9375, max: 1, vw: 1 },
    small: { min: 0.75, max: 0.8125, vw: 0.9 },
  },
  cozy: {
    display: { min: 2.25, max: 3.75, vw: 6 },
    h1: { min: 1.875, max: 3, vw: 5 },
    h2: { min: 1.5, max: 2.25, vw: 4 },
    h3: { min: 1.25, max: 1.75, vw: 3 },
    body: { min: 1, max: 1.125, vw: 1.2 },
    small: { min: 0.8125, max: 0.875, vw: 1 },
  },
  breathable: {
    display: { min: 2.75, max: 5.25, vw: 8 },
    h1: { min: 2.25, max: 4, vw: 6.5 },
    h2: { min: 1.75, max: 2.75, vw: 5 },
    h3: { min: 1.375, max: 2, vw: 3.6 },
    body: { min: 1.0625, max: 1.25, vw: 1.4 },
    small: { min: 0.875, max: 0.9375, vw: 1 },
  },
};

const TYPE_MOOD_FACTOR: Record<VibeMood, number> = {
  minimal: 0.94,
  rich: 1.03,
  whimsical: 1.12,
  editorial: 1.08,
};

const TYPE_WEIGHT: Record<VibeMood, Record<TypeRole, string>> = {
  minimal: { display: '500', h1: '500', h2: '500', h3: '500', body: '400', small: '500' },
  rich: { display: '600', h1: '600', h2: '600', h3: '600', body: '400', small: '500' },
  whimsical: { display: '800', h1: '800', h2: '700', h3: '700', body: '500', small: '600' },
  editorial: { display: '700', h1: '700', h2: '600', h3: '600', body: '400', small: '600' },
};

const TYPE_TRACKING: Record<VibeMood, Record<TypeRole, string>> = {
  minimal: { display: '-0.02em', h1: '-0.02em', h2: '-0.015em', h3: '-0.01em', body: '0em', small: '0.02em' },
  rich: { display: '-0.015em', h1: '-0.015em', h2: '-0.01em', h3: '-0.005em', body: '0em', small: '0.05em' },
  whimsical: { display: '-0.005em', h1: '-0.005em', h2: '0em', h3: '0.005em', body: '0.005em', small: '0.08em' },
  editorial: { display: '-0.03em', h1: '-0.025em', h2: '-0.02em', h3: '-0.015em', body: '-0.005em', small: '0.16em' },
};

const TYPE_LEADING: Record<VibeDensity, Record<TypeRole, string>> = {
  compact: { display: '1', h1: '1.05', h2: '1.1', h3: '1.15', body: '1.45', small: '1.4' },
  cozy: { display: '1.05', h1: '1.1', h2: '1.2', h3: '1.25', body: '1.55', small: '1.45' },
  breathable: { display: '1.1', h1: '1.2', h2: '1.3', h3: '1.35', body: '1.7', small: '1.55' },
};

function fluid(axis: TypeScaleAxis, factor: number): string {
  const min = (axis.min * factor).toFixed(3);
  const max = (axis.max * factor).toFixed(3);
  const vw = (axis.vw * factor).toFixed(2);
  return `clamp(${min}rem, ${min}rem + ${vw}vw, ${max}rem)`;
}

function emitTypeScale(
  density: VibeDensity | undefined,
  mood: VibeMood | undefined,
): VibeCssVars {
  const d = density ?? 'cozy';
  const m = mood ?? 'rich';
  const preset = TYPE_SCALE_DENSITY[d];
  const factor = TYPE_MOOD_FACTOR[m];
  const weights = TYPE_WEIGHT[m];
  const tracking = TYPE_TRACKING[m];
  const leading = TYPE_LEADING[d];
  const out: VibeCssVars = {};
  const roles: TypeRole[] = ['display', 'h1', 'h2', 'h3', 'body', 'small'];
  for (const role of roles) {
    out[`--vibe-type-scale-${role}`] = fluid(preset[role], factor);
    out[`--vibe-type-weight-${role}`] = weights[role];
    out[`--vibe-type-tracking-${role}`] = tracking[role];
    out[`--vibe-type-leading-${role}`] = leading[role];
  }
  return out;
}

function hexToHslTriple(hex: string): string | null {
  const h = hex.replace('#', '').trim();
  if (h.length !== 3 && h.length !== 6) return null;
  let r: number, g: number, b: number;
  if (h.length === 3) {
    r = parseInt(h[0]! + h[0]!, 16);
    g = parseInt(h[1]! + h[1]!, 16);
    b = parseInt(h[2]! + h[2]!, 16);
  } else {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rN) hue = (gN - bN) / d + (gN < bN ? 6 : 0);
    else if (max === gN) hue = (bN - rN) / d + 2;
    else hue = (rN - gN) / d + 4;
    hue *= 60;
  }
  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Normalize a palette value to an HSL TRIPLE string (e.g. `24 95% 53%`).
 *
 * Accepts:
 *   - `"#FF6BAF"` / `"#fa6"`  → converted to HSL triple
 *   - `"24 95% 53%"`           → passed through (legacy template format)
 *
 * Returns `undefined` for invalid input so the caller can fall back to the
 * default palette declared in `globals.css`.
 */
export function paletteValueAsHslTriple(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith('#')) {
    const triple = hexToHslTriple(trimmed);
    return triple ?? undefined;
  }
  return trimmed;
}

/**
 * Convert a Vibe object into a flat record of CSS custom-property values.
 *
 * Apply via `<div style={vibeCss(peek.vibe)}>` on whatever element should
 * scope the vibe. Children consume the vars with either:
 *
 *   - `style={{ backgroundColor: 'hsl(var(--peek-bg))' }}` (preferred for
 *     dynamic styling)
 *   - `className="bg-[hsl(var(--peek-bg))]"` (Tailwind arbitrary value,
 *     fine for legacy callsites)
 *
 * All sub-fields are optional. Missing dials simply don't emit their vars,
 * letting `globals.css` defaults apply.
 */
export function vibeCss(vibe: Vibe | null | undefined): VibeCssVars {
  const out: VibeCssVars = {};
  if (!vibe) return out;

  // ── Palette ────────────────────────────────────────────────────────────
  const bg = paletteValueAsHslTriple(vibe.palette?.bg);
  const surface = paletteValueAsHslTriple(vibe.palette?.surface);
  const ink = paletteValueAsHslTriple(vibe.palette?.ink);
  const accent = paletteValueAsHslTriple(vibe.palette?.accent);
  const accent2 = paletteValueAsHslTriple(vibe.palette?.accent2);
  if (bg) {
    out['--peek-bg'] = bg;
    out['--vibe-bg'] = bg;
  }
  if (surface) {
    out['--peek-surface'] = surface;
    out['--vibe-surface'] = surface;
    out['--vibe-muted'] = surface; // alias per spec
  }
  if (ink) {
    out['--peek-ink'] = ink;
    out['--vibe-ink'] = ink;
  }
  if (accent) {
    out['--peek-accent'] = accent;
    out['--vibe-accent'] = accent;
  }
  if (accent2) {
    out['--peek-accent2'] = accent2;
    out['--vibe-accent2'] = accent2;
  }

  // ── Typography ─────────────────────────────────────────────────────────
  // `font_pairing` (concrete font-family strings) wins over `typography`
  // (semantic categories) when both are present, because it's the explicit
  // curator/template choice.
  const heading = vibe.typography?.heading;
  const body = vibe.typography?.body;
  if (heading) {
    out['--peek-font-heading'] = HEADING_FONT_VAR[heading];
    out['--vibe-type-display'] = HEADING_FONT_VAR[heading];
  }
  if (body) {
    out['--peek-font-body'] = BODY_FONT_VAR[body];
    out['--vibe-type-body'] = BODY_FONT_VAR[body];
  }
  // Mono is always available for joke/gag card overrides regardless of body dial.
  out['--vibe-type-mono'] = BODY_FONT_VAR.mono;

  if (vibe.font_pairing?.display) {
    const v = `"${vibe.font_pairing.display}", ${out['--peek-font-heading'] ?? HEADING_FONT_VAR.serif}`;
    out['--peek-font-heading'] = v;
    out['--vibe-type-display'] = v;
  }
  if (vibe.font_pairing?.body) {
    const v = `"${vibe.font_pairing.body}", ${out['--peek-font-body'] ?? BODY_FONT_VAR.sans}`;
    out['--peek-font-body'] = v;
    out['--vibe-type-body'] = v;
  }

  // ── Density ────────────────────────────────────────────────────────────
  if (vibe.density) {
    Object.assign(out, DENSITY_SPACE[vibe.density]);
  }

  // ── Shape ──────────────────────────────────────────────────────────────
  if (vibe.shape) {
    Object.assign(out, SHAPE_RADIUS[vibe.shape]);
  }

  // ── Motion ─────────────────────────────────────────────────────────────
  if (vibe.motion) {
    out['--vibe-motion-scale'] = MOTION_SCALE[vibe.motion];
    out['--peek-motion-scale'] = MOTION_SCALE[vibe.motion];
  }

  // ── Mood ───────────────────────────────────────────────────────────────
  if (vibe.mood) {
    Object.assign(out, MOOD_TEXTURE[vibe.mood]);
  }

  // ── Type scale (fluid, density × mood) ─────────────────────────────────
  Object.assign(out, emitTypeScale(vibe.density, vibe.mood));

  return out;
}

/**
 * Convenience helper: read the motion-scale multiplier as a number so it can
 * be passed directly to framer-motion `transition` props. Mirrors the value
 * emitted as `--vibe-motion-scale`.
 */
export function motionScale(motion: VibeMotion | undefined): number {
  if (!motion) return 1;
  return Number(MOTION_SCALE[motion]);
}
