import { formatHex, clampChroma, wcagContrast } from "culori";
import type { ColorTokens } from "@peek/design-tokens";
import type { ColorKnobs } from "@peek/vibe-genome";

/**
 * color — generative palette synthesis in OKLCH (perceptually uniform).
 *
 * Knobs in, a coherent, contrast-safe ColorTokens set out. Harmony schemes are *algorithms*
 * over hue, not fixed palettes; lightness/chroma are derived from base + mood + saturation +
 * contrast; WCAG AA is enforced as a floor (the ceiling stays expressive). Every color is
 * gamut-mapped into sRGB by reducing chroma (clampChroma) so nothing renders as a clipped mess.
 */

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const wrap = (h: number): number => ((h % 360) + 360) % 360;

/** Build an OKLCH color, gamut-map into sRGB, return hex. */
function hex(l: number, c: number, h: number): string {
  const mapped = clampChroma({ mode: "oklch", l: clamp01(l), c: Math.max(0, c), h: wrap(h) }, "oklch");
  return formatHex(mapped) ?? (l > 0.5 ? "#ffffff" : "#000000");
}

function contrast(a: string, b: string): number {
  return wcagContrast(a, b);
}

/** Derive accent hues from the anchor(s) and a harmony scheme. */
function accentHues(anchors: number[], harmony: ColorKnobs["harmony"]): number[] {
  const anchor = anchors[0] ?? 0;
  const offsets: Record<ColorKnobs["harmony"], number[]> = {
    mono: [0],
    analogous: [0, 30, -30],
    complementary: [0, 180],
    "split-complementary": [0, 150, 210],
    triadic: [0, 120, 240],
    tetradic: [0, 90, 180, 270],
    clash: [0, 160, 40],
  };
  const derived = offsets[harmony].map((d) => wrap(anchor + d));
  const merged = [...anchors.map(wrap), ...derived];
  return [...new Set(merged)];
}

export function generatePalette(k: ColorKnobs): ColorTokens {
  const dark = k.base === "dark";
  const tempHue = wrap(245 + k.temperature * 165); // cool->warm via the red side, never through green
  const neutralC = 0.003 + k.saturation * 0.012; // subtle tinted neutrals

  const bgL = dark ? lerp(0.1, 0.17, k.lightnessMood) : lerp(0.93, 0.985, k.lightnessMood);
  const surfaceL = dark ? bgL + 0.05 : Math.min(0.995, bgL + 0.022);
  const mutedL = dark ? 0.66 : 0.46;
  const faintL = dark ? 0.52 : 0.62;
  const lineL = dark ? bgL + 0.12 : bgL - 0.07;

  const bg = hex(bgL, neutralC, tempHue);
  const surface = hex(surfaceL, neutralC * 0.8, tempHue);
  const muted = hex(mutedL, neutralC, tempHue);
  const faint = hex(faintL, neutralC * 0.7, tempHue);
  const line = hex(lineL, neutralC * 0.7, tempHue);

  // ink: start from contrast knob, then enforce WCAG AA against bg.
  let inkL = dark ? lerp(0.88, 0.96, k.contrast) : lerp(0.3, 0.15, k.contrast);
  let ink = hex(inkL, neutralC * 1.2, tempHue);
  for (let guard = 0; guard < 24 && contrast(ink, bg) < 4.5; guard++) {
    inkL = dark ? Math.min(0.99, inkL + 0.02) : Math.max(0.04, inkL - 0.02);
    ink = hex(inkL, neutralC * 1.2, tempHue);
  }

  // accents
  const hues = accentHues(k.hueAnchors, k.harmony).slice(0, k.accentCount);
  const accChroma = 0.09 + k.saturation * 0.13;
  const accL = dark ? 0.68 : lerp(0.52, 0.64, k.lightnessMood);
  const accents = hues.map((h) => hex(accL, accChroma, h));
  if (accents.length === 0) accents.push(hex(accL, accChroma, tempHue));
  const primaryHue = hues[0] ?? tempHue;
  const accentDeep = hex(accL - 0.16, accChroma, primaryHue);
  const accentWash = hex(dark ? 0.26 : 0.93, accChroma * 0.35, primaryHue);
  const firstAccent = accents[0] ?? hex(accL, accChroma, primaryHue);
  const onAccent = contrast("#ffffff", firstAccent) >= contrast(ink, firstAccent) ? "#ffffff" : ink;

  return {
    base: dark ? "dark" : "light",
    bg,
    surface,
    ink,
    muted,
    faint,
    line,
    accents,
    accentDeep,
    accentWash,
    onAccent,
    application: k.application,
  };
}

/** Diagnostics for the demo / eval: key contrast ratios. */
export function paletteContrast(t: ColorTokens): { inkOnBg: number; mutedOnBg: number; onAccent: number } {
  return {
    inkOnBg: contrast(t.ink, t.bg),
    mutedOnBg: contrast(t.muted, t.bg),
    onAccent: contrast(t.onAccent, t.accents[0] ?? t.accentDeep),
  };
}
