import { z } from "zod";
import { designTokensSchema } from "@peek/design-tokens";

/**
 * vibe-genome — the complete design specification of one peek, independent of render target.
 * The theme half of the Site IR. Inputs -> Brief -> meta-dials -> (cascade+harmony) -> knobs ->
 * (vibe-resolve) -> design tokens -> render.
 *
 * Ranges below are grounded in the 10-site conformance catalog (docs/design-dna-catalog.md).
 * Knob domains are an intentionally OPEN set: adding a domain = extend this schema + register a
 * resolver + a chat vocabulary, with no change to consumers that read tokens.
 */

/* =================== Tier 0 — director meta-dials =================== */
/** A normalized director dial. Cascades into many atomic knobs via vibe-transfer. */
const dial = () => z.number().min(0).max(1);

export const eraSchema = z.enum([
  "timeless",
  "seventies",
  "y2k",
  "memphis",
  "art-deco",
  "retro-future",
  "mid-century",
  "victorian",
  "contemporary",
]);
export type Era = z.infer<typeof eraSchema>;

export const metaDialsSchema = z.object({
  energy: dial(),
  refinement: dial(),
  formality: dial(),
  warmth: dial(),
  playfulness: dial(),
  opulence: dial(),
  boldness: dial(),
  naturalism: dial(),
  density: dial(),
  era: eraSchema,
  eraStrength: dial(),
});
export type MetaDials = z.infer<typeof metaDialsSchema>;

/* =================== Tier 2 — atomic knobs by domain =================== */

export const layoutArchetypeSchema = z.enum([
  "centered-invite",
  "editorial-commerce",
  "split-hero",
  "cinematic-fullbleed",
  "collage-scrapbook",
  "trail-journey",
  "gallery-showcase",
  "timeline-spine",
  "zine-chaos",
  "dashboard-hud",
]);
export type LayoutArchetype = z.infer<typeof layoutArchetypeSchema>;

export const layoutKnobsSchema = z.object({
  archetype: layoutArchetypeSchema,
  heroLayout: z.enum(["centered", "split-lr", "fullbleed"]),
  contentRhythm: z.enum(["single-column-cards", "multi-section-grid", "mixed"]),
  containerWidth: z.number().min(960).max(1280),
  focal: z.enum(["single-hero", "distributed", "crescendo"]),
  layering: dial(),
});
export type LayoutKnobs = z.infer<typeof layoutKnobsSchema>;

export const displayClassSchema = z.enum([
  "didone",
  "classical-serif",
  "humanist-serif",
  "grotesque",
  "condensed",
  "chunky-block",
  "script-led",
  "techno-mono",
]);
export type DisplayClass = z.infer<typeof displayClassSchema>;

export const typeKnobsSchema = z.object({
  displayClass: displayClassSchema,
  pairing: z.enum(["harmonious", "contrast", "superfamily", "expressive-neutral"]),
  useScript: z.boolean(),
  useMono: z.boolean(),
  case: z.enum(["sentence", "title", "upper", "lower", "expressive"]),
  tracking: dial(),
  scaleRatio: z.number().min(1.15).max(1.8),
  weightContrast: dial(),
  headingScaleMax: z.number().min(38).max(200),
  bodyWeight: z.number().min(300).max(700),
  animacy: dial(),
});
export type TypeKnobs = z.infer<typeof typeKnobsSchema>;

export const harmonySchema = z.enum([
  "mono",
  "analogous",
  "complementary",
  "split-complementary",
  "triadic",
  "tetradic",
  "clash",
]);
export type Harmony = z.infer<typeof harmonySchema>;

export const colorKnobsSchema = z.object({
  base: z.enum(["light", "dark", "alternating"]),
  application: z.enum(["flat", "gradient", "glow", "holographic"]),
  hueAnchors: z.array(z.number().min(0).max(360)).min(1).max(3),
  harmony: harmonySchema,
  accentCount: z.number().int().min(1).max(6),
  saturation: dial(),
  lightnessMood: dial(), // 0 dark/moody .. 1 light/airy
  temperature: dial(), // 0 cool .. 1 warm
  contrast: dial(),
});
export type ColorKnobs = z.infer<typeof colorKnobsSchema>;

export const motifDensitySchema = z.enum(["none", "low", "medium", "high", "maximal"]);
export type MotifDensity = z.infer<typeof motifDensitySchema>;

export const motifKnobsSchema = z.object({
  vocabulary: z.array(z.string()), // open set: "celestial","botanical","chrome","heraldic",...
  density: motifDensitySchema,
  generation: z.enum(["curated", "generative", "hybrid"]),
});
export type MotifKnobs = z.infer<typeof motifKnobsSchema>;

export const textureKnobsSchema = z.object({
  kind: z.enum(["none", "grain", "scanlines", "starfield", "pattern"]),
  surfaceShadow: z.enum(["soft-tint", "hard-offset", "neon-glow", "none"]),
  glassBlur: z.number().min(0).max(28),
});
export type TextureKnobs = z.infer<typeof textureKnobsSchema>;

export const shapeKnobsSchema = z.object({
  edgeTreatment: z.enum(["square", "round", "chamfer", "arched"]),
  radiusButton: z.number().min(0).max(999),
  radiusCard: z.number().min(0).max(40),
  radiusSheet: z.number().min(0).max(34),
  borderWeight: z.number().min(0).max(4),
  borderStyle: z.enum(["solid", "dotted", "dashed"]),
});
export type ShapeKnobs = z.infer<typeof shapeKnobsSchema>;

export const motionKnobsSchema = z.object({
  intensity: z.enum(["minimal", "hover", "ambient", "scroll", "live"]),
  easingProfile: z.enum(["standard", "premium", "springy"]),
  loopSpeed: dial(),
});
export type MotionKnobs = z.infer<typeof motionKnobsSchema>;

export const densityKnobsSchema = z.object({
  whitespace: z.enum(["airy", "generous", "medium", "dense"]),
});
export type DensityKnobs = z.infer<typeof densityKnobsSchema>;

export const imageryKnobsSchema = z.object({
  strategy: z.enum(["photo", "gradient", "glyph-filled", "glyph-outline"]),
  photoFrame: z.enum([
    "none",
    "arched",
    "polaroid",
    "circular",
    "porthole",
    "id-card",
    "vertical-label",
  ]),
  photoFilter: z.enum(["none", "grayscale", "contrast", "ken-burns"]),
});
export type ImageryKnobs = z.infer<typeof imageryKnobsSchema>;

export const voiceKnobsSchema = z.object({
  tone: z.enum([
    "formal",
    "reverent",
    "warm",
    "whimsical",
    "playful",
    "hype",
    "brash",
    "minimal",
    "craft",
  ]),
  verbosity: dial(),
  wit: dial(),
});
export type VoiceKnobs = z.infer<typeof voiceKnobsSchema>;

export const capabilityKnobsSchema = z.object({
  primary: z.enum(["commerce", "rsvp", "reserve", "auction", "ticketing"]),
  giftModel: z.enum(["buy", "claim", "none"]),
});
export type CapabilityKnobs = z.infer<typeof capabilityKnobsSchema>;

export const knobsSchema = z.object({
  layout: layoutKnobsSchema,
  type: typeKnobsSchema,
  color: colorKnobsSchema,
  motif: motifKnobsSchema,
  texture: textureKnobsSchema,
  shape: shapeKnobsSchema,
  motion: motionKnobsSchema,
  density: densityKnobsSchema,
  imagery: imageryKnobsSchema,
  voice: voiceKnobsSchema,
  capability: capabilityKnobsSchema,
});
export type Knobs = z.infer<typeof knobsSchema>;

/* =================== The Brief (interpreted intent) =================== */

export const briefSchema = z.object({
  thesis: z.string(),
  occasion: z.string(),
  recipient: z.string().optional(),
  mustInclude: z.array(z.string()).default([]),
  antiPatterns: z.array(z.string()).default([]),
  references: z.array(z.string()).default([]),
});
export type Brief = z.infer<typeof briefSchema>;

/* =================== The Genome =================== */

export const GENOME_SCHEMA_VERSION = 1 as const;

export const genomeSchema = z.object({
  version: z.literal(GENOME_SCHEMA_VERSION),
  /** Deterministic RNG seed — every genome is reproducible, diffable, A/B-able. */
  seed: z.number().int(),
  brief: briefSchema.optional(),
  meta: metaDialsSchema,
  knobs: knobsSchema,
  /** Resolved by vibe-resolve; absent until resolution. */
  tokens: designTokensSchema.optional(),
  rationale: z.string().optional(),
  lineage: z
    .object({
      parent: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
});
export type Genome = z.infer<typeof genomeSchema>;
