import type { Palette } from "../document/contract";

type RGB = { r: number; g: number; b: number };

function parseHex(hex: string): RGB | null {
  const h = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    return { r: parseInt(h[0]! + h[0]!, 16), g: parseInt(h[1]! + h[1]!, 16), b: parseInt(h[2]! + h[2]!, 16) };
  }
  if (/^[0-9a-fA-F]{6}$/.test(h)) {
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  return null;
}

function toHex({ r, g, b }: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function channelLum(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminance(rgb: RGB): number {
  return 0.2126 * channelLum(rgb.r) + 0.7152 * channelLum(rgb.g) + 0.0722 * channelLum(rgb.b);
}
function ratio(a: RGB, b: RGB): number {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

export function contrastRatio(fg: string, bg: string): number | null {
  const f = parseHex(fg);
  const b = parseHex(bg);
  return f && b ? ratio(f, b) : null;
}

function repairFg(fg: RGB, bg: RGB, target: number): RGB {
  if (ratio(fg, bg) >= target) return fg;
  const toward: RGB = luminance(bg) > 0.5 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  let lo = 0;
  let hi = 1;
  let best = toward;
  for (let i = 0; i < 24; i++) {
    const t = (lo + hi) / 2;
    const cand: RGB = {
      r: Math.round(fg.r + (toward.r - fg.r) * t),
      g: Math.round(fg.g + (toward.g - fg.g) * t),
      b: Math.round(fg.b + (toward.b - fg.b) * t),
    };
    if (ratio(cand, bg) >= target) {
      best = cand;
      hi = t;
    } else {
      lo = t;
    }
  }
  return best;
}

function fix(fg: string, bg: string, target: number): string {
  const f = parseHex(fg);
  const b = parseHex(bg);
  if (!f || !b) return fg;
  return ratio(f, b) >= target ? fg : toHex(repairFg(f, b, target));
}

export function ensureReadable(palette: Palette): Palette {
  const AA = 4.5;
  const AA_LARGE = 3;
  return {
    ...palette,
    ink: fix(palette.ink, palette.bg, AA),
    muted: fix(palette.muted, palette.bg, AA_LARGE),
  };
}
