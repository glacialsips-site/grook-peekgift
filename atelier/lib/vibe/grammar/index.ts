/**
 * Grammar module — public surface.
 *
 * The renderer imports the validated `Vibe`, the section types, and the
 * css-var emitter from here. The generation pipeline imports `generateAndRepair`.
 */

export * from './grammar';
export {
  derivePalette,
  validateVibeSpec,
  validatePageComposition,
  generateAndRepair,
  paletteToHex,
  SAFE_DEFAULT,
  type GenerateAndRepairResult,
} from './engine';
export { vibeToCssVars, vibeStyle, type VibeCssVars } from './css-vars';
export {
  contrastRatio,
  hexToOklch,
  oklchToHex,
  oklchToHslTriple,
  relativeLuminance,
} from './oklch';
export { dbVibeToSpec, dbVibeToValidated } from './bridge';
export {
  generationOutputSchema,
  sectionSchema,
  generationVibeSchema,
} from './schema';
