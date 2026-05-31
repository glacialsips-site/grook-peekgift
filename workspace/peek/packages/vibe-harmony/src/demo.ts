import { generatePalette, paletteContrast } from "./color";
import { pickFonts, fontStack } from "./type";
import { typeScale, spaceTokens } from "./scale";
import type { ColorKnobs, TypeKnobs, DensityKnobs } from "@peek/vibe-genome";

/**
 * demo — a real verification, not an assertion. Generates palettes/fonts/scales for four
 * deliberately-divergent vibes and prints them, then FAILS LOUDLY (throws) if any palette
 * breaks the WCAG AA contrast floor. Run: pnpm --filter @peek/vibe-harmony demo
 */

interface Case {
  name: string;
  color: ColorKnobs;
  type: TypeKnobs;
  density: DensityKnobs;
}

const cases: Case[] = [
  {
    name: "Omakase — zen, mono, light, airy",
    color: { base: "light", application: "flat", hueAnchors: [25], harmony: "mono", accentCount: 1, saturation: 0.55, lightnessMood: 0.75, temperature: 0.55, contrast: 0.85 },
    type: { displayClass: "classical-serif", pairing: "harmonious", useScript: false, useMono: false, case: "lower", tracking: 0.7, scaleRatio: 1.5, weightContrast: 0.3, headingScaleMax: 120, bodyWeight: 300, animacy: 0.1 },
    density: { whitespace: "airy" },
  },
  {
    name: "Cyber Rave — neon, clash, dark, dense",
    color: { base: "dark", application: "holographic", hueAnchors: [330, 190], harmony: "clash", accentCount: 4, saturation: 0.95, lightnessMood: 0.3, temperature: 0.4, contrast: 0.9 },
    type: { displayClass: "techno-mono", pairing: "contrast", useScript: false, useMono: true, case: "upper", tracking: 0.8, scaleRatio: 1.6, weightContrast: 0.7, headingScaleMax: 110, bodyWeight: 400, animacy: 0.9 },
    density: { whitespace: "dense" },
  },
  {
    name: "Princess — pastel, analogous, light, medium",
    color: { base: "light", application: "gradient", hueAnchors: [330], harmony: "analogous", accentCount: 3, saturation: 0.7, lightnessMood: 0.85, temperature: 0.7, contrast: 0.6 },
    type: { displayClass: "script-led", pairing: "expressive-neutral", useScript: true, useMono: false, case: "title", tracking: 0.4, scaleRatio: 1.4, weightContrast: 0.5, headingScaleMax: 92, bodyWeight: 500, animacy: 0.6 },
    density: { whitespace: "medium" },
  },
  {
    name: "HEMLOCK — earthy heritage, light, generous",
    color: { base: "light", application: "flat", hueAnchors: [40], harmony: "analogous", accentCount: 2, saturation: 0.45, lightnessMood: 0.7, temperature: 0.75, contrast: 0.85 },
    type: { displayClass: "humanist-serif", pairing: "harmonious", useScript: false, useMono: false, case: "sentence", tracking: 0.3, scaleRatio: 1.35, weightContrast: 0.4, headingScaleMax: 104, bodyWeight: 400, animacy: 0.1 },
    density: { whitespace: "generous" },
  },
];

let failures = 0;

for (const c of cases) {
  const pal = generatePalette(c.color);
  const con = paletteContrast(pal);
  const { choice, faces } = pickFonts(c.type);
  const ts = typeScale(c.type);
  const sp = spaceTokens(c.density, 1180);

  const pass = con.inkOnBg >= 4.5;
  if (!pass) failures++;

  console.log(`\n=== ${c.name} ===`);
  console.log(`  base       ${pal.base}   application=${pal.application}`);
  console.log(`  bg ${pal.bg}  surface ${pal.surface}  ink ${pal.ink}  line ${pal.line}`);
  console.log(`  accents    ${pal.accents.join("  ")}   deep ${pal.accentDeep}  wash ${pal.accentWash}  onAccent ${pal.onAccent}`);
  console.log(`  contrast   ink/bg ${con.inkOnBg.toFixed(2)} ${pass ? "PASS" : "*** FAIL (<4.5) ***"}   muted/bg ${con.mutedOnBg.toFixed(2)}   onAccent ${con.onAccent.toFixed(2)}`);
  console.log(`  fonts      display="${choice.display}" body="${choice.body}" script=${choice.script ?? "-"} mono=${choice.mono ?? "-"}  (${faces.length} faces)`);
  console.log(`  stack      ${fontStack(choice.display, "display", c.type.displayClass)}`);
  console.log(`  display sz ${ts.display}   heading ${ts.heading}   body ${ts.body}`);
  console.log(`  space      section=${sp.section} gap=${sp.gridGap} container=${sp.container}`);
}

console.log(`\n${failures === 0 ? "ALL PALETTES PASS WCAG AA (ink/bg >= 4.5)" : `${failures} PALETTE(S) FAILED CONTRACT`}`);
if (failures > 0) {
  throw new Error(`vibe-harmony demo: ${failures} palette(s) below WCAG AA contrast floor`);
}
