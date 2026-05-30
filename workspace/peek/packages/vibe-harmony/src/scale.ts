import type { SpaceTokens } from "@peek/design-tokens";
import type { TypeKnobs, DensityKnobs } from "@peek/vibe-genome";

/** scale — modular type scale + spacing, derived from knobs. */

export function modularStep(base: number, ratio: number, step: number): number {
  return base * Math.pow(ratio, step);
}

const round = (n: number): number => Math.round(n);

/** Role font-sizes as responsive clamp() strings, from headingScaleMax + scaleRatio. */
export function typeScale(k: TypeKnobs): {
  display: string;
  heading: string;
  subheading: string;
  body: string;
  eyebrow: string;
} {
  const max = k.headingScaleMax;
  const ratio = k.scaleRatio;
  const displayMin = round(max * 0.42);
  const vw = Math.max(7, Math.min(14, 8 + (max - 60) / 24));
  const headingMax = round(max / Math.pow(ratio, 1.5));
  const headingMin = round(headingMax * 0.6);
  const subMax = round(headingMax / ratio);
  return {
    display: `clamp(${displayMin}px, ${round(vw)}vw, ${max}px)`,
    heading: `clamp(${headingMin}px, 5vw, ${headingMax}px)`,
    subheading: `clamp(18px, 3vw, ${subMax}px)`,
    body: "17px",
    eyebrow: "12px",
  };
}

const SECTION_PADDING: Record<DensityKnobs["whitespace"], string> = {
  airy: "104px",
  generous: "92px",
  medium: "78px",
  dense: "56px",
};
const GRID_GAP: Record<DensityKnobs["whitespace"], string> = {
  airy: "30px",
  generous: "26px",
  medium: "22px",
  dense: "16px",
};

export function spaceTokens(density: DensityKnobs, containerWidth: number): SpaceTokens {
  return {
    unit: 4,
    scale: [4, 8, 12, 16, 22, 30, 40, 56, 78, 104],
    section: SECTION_PADDING[density.whitespace],
    gridGap: GRID_GAP[density.whitespace],
    container: `${containerWidth}px`,
  };
}
