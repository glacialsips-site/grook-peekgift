import { z } from "zod";

/**
 * design-tokens — the RESOLVED design token set.
 *
 * This is the bottom of the vibe pipeline: knobs -> (vibe-resolve) -> DesignTokens -> renderer.
 * No renderer ever reads a knob; it reads tokens. No raw color/size literals live above this
 * layer. Values are CSS strings (OKLCH/hex/gradients) so a target compiler can emit CSS vars.
 */

/* ----------------------------- color ----------------------------- */

export const colorBaseSchema = z.enum(["light", "dark"]);
export type ColorBase = z.infer<typeof colorBaseSchema>;

export const colorApplicationSchema = z.enum(["flat", "gradient", "glow", "holographic"]);
export type ColorApplication = z.infer<typeof colorApplicationSchema>;

/** Role-based color set. `bg` may be a gradient CSS string; accents are 1..n resolved hues. */
export const colorTokensSchema = z.object({
  base: colorBaseSchema,
  bg: z.string(),
  surface: z.string(),
  ink: z.string(),
  muted: z.string(),
  faint: z.string(),
  line: z.string(),
  accents: z.array(z.string()).min(1),
  accentDeep: z.string(),
  accentWash: z.string(),
  onAccent: z.string(),
  application: colorApplicationSchema,
});
export type ColorTokens = z.infer<typeof colorTokensSchema>;

/* ----------------------------- type ------------------------------ */

export const textCaseSchema = z.enum(["none", "upper", "lower"]);
export type TextCase = z.infer<typeof textCaseSchema>;

export const typeRoleSchema = z.object({
  family: z.string(),
  size: z.string(), // css: clamp()/rem/px
  weight: z.number(),
  tracking: z.string(), // letter-spacing
  leading: z.number(), // unitless line-height
  case: textCaseSchema,
  italic: z.boolean(),
});
export type TypeRole = z.infer<typeof typeRoleSchema>;

export const fontFaceSchema = z.object({
  family: z.string(),
  source: z.enum(["google", "system", "self"]),
  weights: z.array(z.number()),
  italic: z.boolean(),
});
export type FontFace = z.infer<typeof fontFaceSchema>;

export const typeTokensSchema = z.object({
  display: typeRoleSchema,
  heading: typeRoleSchema,
  body: typeRoleSchema,
  eyebrow: typeRoleSchema,
  script: typeRoleSchema.optional(),
  mono: typeRoleSchema.optional(),
  scaleRatio: z.number(),
  faces: z.array(fontFaceSchema),
});
export type TypeTokens = z.infer<typeof typeTokensSchema>;

/* ----------------------------- space ----------------------------- */

export const spaceTokensSchema = z.object({
  unit: z.number(), // base px
  scale: z.array(z.number()), // modular steps (px)
  section: z.string(), // section vertical padding (css)
  gridGap: z.string(),
  container: z.string(), // max-width (css)
});
export type SpaceTokens = z.infer<typeof spaceTokensSchema>;

/* ---------------------------- radius ----------------------------- */

export const radiusTokensSchema = z.object({
  button: z.string(),
  card: z.string(),
  sheet: z.string(),
  pill: z.string(),
});
export type RadiusTokens = z.infer<typeof radiusTokensSchema>;

/* ----------------------- shadow / border ------------------------- */

export const shadowStyleSchema = z.enum(["soft-tint", "hard-offset", "neon-glow", "none"]);
export type ShadowStyle = z.infer<typeof shadowStyleSchema>;

export const borderStyleSchema = z.enum(["solid", "dotted", "dashed"]);
export type BorderStyle = z.infer<typeof borderStyleSchema>;

export const shadowTokensSchema = z.object({
  style: shadowStyleSchema,
  card: z.string(),
  button: z.string(),
  border: z.object({
    weight: z.string(),
    style: borderStyleSchema,
    color: z.string(),
  }),
});
export type ShadowTokens = z.infer<typeof shadowTokensSchema>;

/* ----------------------------- motion ---------------------------- */

export const motionIntensitySchema = z.enum(["minimal", "hover", "ambient", "scroll", "live"]);
export type MotionIntensity = z.infer<typeof motionIntensitySchema>;

export const easingTokensSchema = z.object({
  standard: z.string(),
  sheet: z.string(),
  reveal: z.string(),
  spring: z.string().optional(),
});
export type EasingTokens = z.infer<typeof easingTokensSchema>;

export const motionTokensSchema = z.object({
  intensity: motionIntensitySchema,
  easing: easingTokensSchema,
  durations: z.object({
    fast: z.string(),
    base: z.string(),
    slow: z.string(),
    marquee: z.string(),
  }),
  reducedMotion: z.boolean(),
});
export type MotionTokens = z.infer<typeof motionTokensSchema>;

/* ---------------------------- texture ---------------------------- */

export const textureKindSchema = z.enum(["none", "grain", "scanlines", "starfield", "pattern"]);
export type TextureKind = z.infer<typeof textureKindSchema>;

export const textureTokensSchema = z.object({
  kind: textureKindSchema,
  glassBlur: z.number(), // px
  glassSaturate: z.number(), // %
});
export type TextureTokens = z.infer<typeof textureTokensSchema>;

/* --------------------------- the set ----------------------------- */

export const designTokensSchema = z.object({
  color: colorTokensSchema,
  type: typeTokensSchema,
  space: spaceTokensSchema,
  radius: radiusTokensSchema,
  shadow: shadowTokensSchema,
  motion: motionTokensSchema,
  texture: textureTokensSchema,
});
export type DesignTokens = z.infer<typeof designTokensSchema>;
