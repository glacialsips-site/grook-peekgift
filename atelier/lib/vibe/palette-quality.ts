import type { ExtractedPalette } from './extract-palette';

export type QualityResult =
  | { ok: true }
  | { ok: false; reason: PaletteRejectReason };

export type PaletteRejectReason =
  | 'invalid_hex'
  | 'low_contrast_spread'
  | 'all_desaturated'
  | 'accent_bg_below_3_1'
  | 'ink_bg_below_4_5_1';

const MIN_L_SPREAD = 40;
const MIN_PEAK_SATURATION = 0.2;
const MIN_ACCENT_BG_CONTRAST = 3;
const MIN_INK_BG_CONTRAST = 4.5;

export function assessPaletteQuality(palette: ExtractedPalette): QualityResult {
  const colors = [
    palette.bg,
    palette.surface,
    palette.ink,
    palette.accent,
    palette.accent2,
  ];
  const rgbs = colors.map(parseHex);
  if (rgbs.some((c) => c === null)) {
    return { ok: false, reason: 'invalid_hex' };
  }
  const safeRgbs = rgbs as Rgb[];

  const ls = safeRgbs.map(rgbToLabL);
  const lSpread = Math.max(...ls) - Math.min(...ls);
  if (lSpread < MIN_L_SPREAD) {
    return { ok: false, reason: 'low_contrast_spread' };
  }

  const sats = safeRgbs.map(rgbToHsvS);
  const maxSat = Math.max(...sats);
  if (maxSat < MIN_PEAK_SATURATION) {
    return { ok: false, reason: 'all_desaturated' };
  }

  const bgRgb = safeRgbs[0]!;
  const inkRgb = safeRgbs[2]!;
  const accentRgb = safeRgbs[3]!;

  const accentBgContrast = contrastRatio(accentRgb, bgRgb);
  if (accentBgContrast < MIN_ACCENT_BG_CONTRAST) {
    return { ok: false, reason: 'accent_bg_below_3_1' };
  }

  const inkBgContrast = contrastRatio(inkRgb, bgRgb);
  if (inkBgContrast < MIN_INK_BG_CONTRAST) {
    return { ok: false, reason: 'ink_bg_below_4_5_1' };
  }

  return { ok: true };
}

export function blendPalettes(
  preset: ExtractedPalette | undefined,
  extracted: ExtractedPalette,
): ExtractedPalette {
  if (!preset) return extracted;
  const blendedAccent =
    blendHex(preset.accent, extracted.accent, 0.5) ?? extracted.accent;
  const blendedAccent2 =
    blendHex(preset.accent2, extracted.accent2, 0.5) ?? extracted.accent2;
  return {
    bg: preset.bg,
    surface: preset.surface,
    ink: preset.ink,
    accent: blendedAccent,
    accent2: blendedAccent2,
  };
}

type Rgb = { r: number; g: number; b: number };

function parseHex(hex: string): Rgb | null {
  const h = hex.replace('#', '').trim();
  if (h.length !== 3 && h.length !== 6 && h.length !== 8) return null;
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
  return { r, g, b };
}

function rgbToLabL({ r, g, b }: Rgb): number {
  const yLinear = relativeLuminance({ r, g, b });
  return yLinear > 0.008856 ? 116 * Math.cbrt(yLinear) - 16 : 903.3 * yLinear;
}

function rgbToHsvS({ r, g, b }: Rgb): number {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  if (max === 0) return 0;
  return (max - min) / max;
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function blendHex(
  a: string | undefined,
  b: string | undefined,
  t: number,
): string | undefined {
  if (!a || !b) return a ?? b;
  const ra = parseHex(a);
  const rb = parseHex(b);
  if (!ra || !rb) return a;
  const r = Math.round(ra.r * (1 - t) + rb.r * t);
  const g = Math.round(ra.g * (1 - t) + rb.g * t);
  const bl = Math.round(ra.b * (1 - t) + rb.b * t);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
