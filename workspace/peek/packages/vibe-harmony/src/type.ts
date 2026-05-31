import type { FontFace, TypeRole } from "@peek/design-tokens";
import type { TypeKnobs } from "@peek/vibe-genome";

/**
 * type — map a displayClass to a real, curated font pairing (families pulled from the
 * conformance catalog), plus the weight roles. The pairing graph encodes which families
 * harmonize/contrast; the resolver turns this into the final TypeTokens with computed sizes.
 */

export interface FontChoice {
  display: string;
  body: string;
  script: string | null;
  mono: string | null;
}

const PAIRINGS: Record<TypeKnobs["displayClass"], FontChoice> = {
  didone: { display: "Bodoni Moda", body: "Jost", script: null, mono: null },
  "classical-serif": { display: "Fraunces", body: "Mulish", script: "Tangerine", mono: null },
  "humanist-serif": { display: "Source Serif 4", body: "Inter", script: null, mono: null },
  grotesque: { display: "Space Grotesk", body: "Inter", script: null, mono: "Space Mono" },
  condensed: { display: "Oswald", body: "Barlow", script: null, mono: "Space Mono" },
  "chunky-block": { display: "Bungee", body: "Fredoka", script: null, mono: null },
  "script-led": { display: "Cormorant Garamond", body: "Quicksand", script: "Pinyon Script", mono: null },
  "techno-mono": { display: "Chakra Petch", body: "Inter", script: null, mono: "Share Tech Mono" },
};

const DISPLAY_WEIGHTS = [400, 500, 600, 700];
const BODY_WEIGHTS = [300, 400, 500, 600, 700];

export function pickFonts(k: TypeKnobs): { choice: FontChoice; faces: FontFace[] } {
  const base = PAIRINGS[k.displayClass];
  const useScript = k.useScript && base.script !== null;
  const useMono = k.useMono && base.mono !== null;

  const choice: FontChoice = {
    display: base.display,
    body: base.body,
    script: useScript ? base.script : null,
    mono: useMono ? base.mono : null,
  };

  const faces: FontFace[] = [
    { family: base.display, source: "google", weights: DISPLAY_WEIGHTS, italic: true },
    { family: base.body, source: "google", weights: BODY_WEIGHTS, italic: false },
  ];
  if (useScript && base.script) {
    faces.push({ family: base.script, source: "google", weights: [400, 700], italic: false });
  }
  if (useMono && base.mono) {
    faces.push({ family: base.mono, source: "google", weights: [400, 700], italic: false });
  }
  return { choice, faces };
}

const SANS_FALLBACK = `-apple-system, "SF Pro Text", system-ui, sans-serif`;
const SERIF_FALLBACK = `"Iowan Old Style", Georgia, serif`;
const MONO_FALLBACK = `"SF Mono", ui-monospace, monospace`;

const SERIF_CLASSES = new Set<TypeKnobs["displayClass"]>([
  "didone",
  "classical-serif",
  "humanist-serif",
  "script-led",
]);

/** Build the css font-family stack for a family, with sensible fallback by class. */
export function fontStack(family: string, kind: "display" | "body" | "mono", displayClass: TypeKnobs["displayClass"]): string {
  if (kind === "mono") return `"${family}", ${MONO_FALLBACK}`;
  const serif = SERIF_CLASSES.has(displayClass);
  return `"${family}", ${serif && kind === "display" ? SERIF_FALLBACK : SANS_FALLBACK}`;
}

export type { TypeRole };
