/**
 * OKLCH ⇄ sRGB color math + WCAG contrast.
 * ========================================
 *
 * The grammar stores color in OKLCH (perceptual). Contrast, however, is a
 * legal/accessibility property measured by WCAG 2.x, which is defined on
 * sRGB relative luminance. So the flow is:
 *
 *   OKLCH (author/derive space) → linear sRGB → relative luminance → ratio.
 *
 * Why OKLCH for derivation: perceptual lightness `l` is monotonic and roughly
 * uniform, so "nudge ink toward black/white until contrast passes" is a clean
 * 1-D search on `l` that always converges (l=0 is black, l=1 is white, and at
 * least one pole always clears 4.5:1 against any mid-tone). That is the
 * "derive-until-contrast-passes" guarantee.
 *
 * Conversions are the standard Björn Ottosson OKLab matrices. sRGB is clamped
 * to [0,1] (gamut clip) — chroma is also clamped by the grammar's CHROMA_MAX
 * upstream so clipping is minor.
 *
 * No dependency: hand-rolled so it runs in RSC, edge, and node identically.
 */

import type { Oklch } from './grammar';

/* ── sRGB transfer functions ─────────────────────────────────────────────── */

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return clamp01(v);
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/* ── OKLab/OKLCH → linear sRGB ───────────────────────────────────────────── */

/** OKLCH → {r,g,b} in 0..255, gamut-clipped. */
export function oklchToRgb(color: Oklch): {
  r: number;
  g: number;
  b: number;
} {
  const { l, c, h } = color;
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const bb = c * Math.sin(hRad);

  // OKLab → LMS' (cube-root space)
  const l_ = l + 0.3963377774 * a + 0.2158037573 * bb;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * bb;
  const s_ = l - 0.0894841775 * a - 1.291485548 * bb;

  const lc = l_ * l_ * l_;
  const mc = m_ * m_ * m_;
  const sc = s_ * s_ * s_;

  // LMS → linear sRGB
  const rLin = 4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  const gLin = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  const bLin = -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc;

  return {
    r: Math.round(linearToSrgb(rLin) * 255),
    g: Math.round(linearToSrgb(gLin) * 255),
    b: Math.round(linearToSrgb(bLin) * 255),
  };
}

/* ── linear sRGB → OKLCH (for hex import) ────────────────────────────────── */

/** {r,g,b} 0..255 → OKLCH. */
export function rgbToOklch(r: number, g: number, b: number): Oklch {
  const rl = srgbToLinear(r / 255);
  const gl = srgbToLinear(g / 255);
  const bl = srgbToLinear(b / 255);

  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const okL = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const okA = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const okB = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.sqrt(okA * okA + okB * okB);
  let h = (Math.atan2(okB, okA) * 180) / Math.PI;
  if (h < 0) h += 360;

  return { l: okL, c, h };
}

/* ── hex parsing ─────────────────────────────────────────────────────────── */

/** Parse "#rgb" / "#rrggbb" → OKLCH, or null if unparseable. */
export function hexToOklch(hex: string): Oklch | null {
  const h = hex.replace('#', '').trim();
  let r: number, g: number, b: number;
  if (h.length === 3) {
    r = parseInt(h[0]! + h[0]!, 16);
    g = parseInt(h[1]! + h[1]!, 16);
    b = parseInt(h[2]! + h[2]!, 16);
  } else if (h.length === 6) {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else {
    return null;
  }
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return rgbToOklch(r, g, b);
}

/* ── output formatting ───────────────────────────────────────────────────── */

/** OKLCH → "#rrggbb". The canonical value we emit into CSS vars. */
export function oklchToHex(color: Oklch): string {
  const { r, g, b } = oklchToRgb(color);
  const to2 = (n: number) => n.toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/**
 * OKLCH → an HSL TRIPLE string ("H S% L%"), the format the legacy
 * `--vibe-*` / `--peek-*` vars expect so `hsl(var(--vibe-bg) / 0.5)` keeps
 * working. We round-trip OKLCH → rgb → hsl.
 */
export function oklchToHslTriple(color: Oklch): string {
  const { r, g, b } = oklchToRgb(color);
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const lHsl = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = lHsl > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rN) hue = (gN - bN) / d + (gN < bN ? 6 : 0);
    else if (max === gN) hue = (bN - rN) / d + 2;
    else hue = (rN - gN) / d + 4;
    hue *= 60;
  }
  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(lHsl * 100)}%`;
}

/* ── WCAG contrast (the legality measure) ────────────────────────────────── */

/** WCAG relative luminance of an OKLCH color. */
export function relativeLuminance(color: Oklch): number {
  const { r, g, b } = oklchToRgb(color);
  const rl = srgbToLinear(r / 255);
  const gl = srgbToLinear(g / 255);
  const bl = srgbToLinear(b / 255);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** WCAG contrast ratio between two OKLCH colors (1..21). */
export function contrastRatio(a: Oklch, b: Oklch): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/* ── the derive-until-passes primitive ───────────────────────────────────── */

/**
 * Nudge `fg`'s perceptual lightness toward whichever pole (black or white)
 * maximizes contrast against `bg`, stopping as soon as `threshold` is cleared.
 *
 * Guarantee: this ALWAYS returns a color clearing `threshold` for any
 * threshold ≤ 21 against any `bg`, because we fall back to the extreme pole
 * (pure black or pure white) which gives the maximum achievable contrast, and
 * for the WCAG thresholds we use (≤4.5) at least one pole always clears it
 * against any single background. Hue/chroma are preserved while nudging; only
 * at the extreme fallback do we drop chroma to hit a true pole.
 */
export function deriveContrastingInk(
  fg: Oklch,
  bg: Oklch,
  threshold: number,
): Oklch {
  if (contrastRatio(fg, bg) >= threshold) return fg;

  const bgLum = relativeLuminance(bg);
  // Pick search direction: dark bg → push fg lighter; light bg → darker.
  const goLighter = bgLum < 0.5;

  // Binary-ish stepped search on l, preserving h/c.
  let lo = goLighter ? fg.l : 0;
  let hi = goLighter ? 1 : fg.l;
  let best: Oklch = fg;
  let bestRatio = contrastRatio(fg, bg);

  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const candidate: Oklch = { l: mid, c: fg.c, h: fg.h };
    const ratio = contrastRatio(candidate, bg);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
    if (ratio >= threshold) {
      // good enough; try to pull lightness back toward the original to keep hue richness
      if (goLighter) hi = mid;
      else lo = mid;
    } else {
      if (goLighter) lo = mid;
      else hi = mid;
    }
  }

  if (bestRatio >= threshold) return best;

  // Fallback: the extreme pole with chroma dropped (guaranteed max contrast).
  const whitePole: Oklch = { l: 1, c: 0, h: fg.h };
  const blackPole: Oklch = { l: 0, c: 0, h: fg.h };
  const whiteR = contrastRatio(whitePole, bg);
  const blackR = contrastRatio(blackPole, bg);
  return whiteR >= blackR ? whitePole : blackPole;
}
