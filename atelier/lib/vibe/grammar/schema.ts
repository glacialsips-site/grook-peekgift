/**
 * Zod schemas for the generation contract.
 * =========================================
 *
 * These mirror the grammar's enums exactly. They are the FIRST gate: the raw
 * model output is parsed here before any value reaches `derivePalette` /
 * `validateVibeSpec`. Zod handles *shape* (is this a legal enum member, is this
 * a number); the engine's invariant checks handle *legality* (does contrast
 * pass, is the font pair allowed). Both run before the renderer.
 *
 * On parse failure the engine falls back to SAFE_DEFAULT for the offending
 * dimension, so a malformed model emission never crashes the pipeline.
 */

import { z } from 'zod';
import { MAX_SCALE_RATIO, MIN_SCALE_RATIO } from './grammar';

export const harmonyStrategySchema = z.enum([
  'monochrome',
  'analogous',
  'complementary',
  'split-complementary',
  'triad',
]);

export const paletteSeedSchema = z.object({
  strategy: harmonyStrategySchema,
  baseHue: z.number().min(0).max(360),
  key: z.enum(['light', 'dark', 'dim']),
  saturation: z.enum(['muted', 'medium', 'vivid']),
});

export const fontRoleSchema = z.enum([
  'serif',
  'sans',
  'display',
  'mono',
  'script',
]);

export const typographySpecSchema = z.object({
  displayRole: fontRoleSchema,
  bodyRole: fontRoleSchema,
  // Accept any finite number here; the engine clamps to the legal band rather
  // than rejecting, because a clamp is an auto-repair, not a failure.
  scaleContrast: z.number().finite(),
  displayCase: z.enum(['none', 'upper', 'small-caps', 'title']),
  displayTracking: z.enum(['tight', 'normal', 'wide']),
  bodyLeading: z.enum(['tight', 'normal', 'loose']),
});

export const spatialSpecSchema = z.object({
  density: z.enum(['compact', 'cozy', 'breathable']),
  baseUnitRem: z.number().finite(),
  gutter: z.enum(['edge', 'snug', 'roomy']),
  measureCh: z.number().finite(),
});

export const shapeSpecSchema = z.object({
  radius: z.enum(['sharp', 'soft', 'pillowy']),
  imageMask: z.enum(['none', 'rounded', 'arch', 'blob', 'circle']),
  border: z.enum(['none', 'hairline', 'bold']),
});

export const depthSpecSchema = z.object({
  elevation: z.enum(['flat', 'lifted', 'dramatic']),
});

export const textureSpecSchema = z.object({
  grain: z.number().finite(),
  wash: z.number().finite(),
  motif: z.enum(['none', 'confetti', 'sparkle', 'botanical', 'geometric']),
});

export const motionSpecSchema = z.object({
  character: z.enum(['still', 'soft', 'lively']),
  easing: z.enum(['linear', 'crisp', 'eased', 'bouncy']),
});

export const imagerySpecSchema = z.object({
  treatment: z.enum([
    'natural',
    'duotone',
    'full-bleed',
    'framed',
    'dim-overlay',
    'illustrated',
  ]),
  textOverImage: z.boolean(),
});

export const voiceSpecSchema = z.object({
  warmth: z.enum(['restrained', 'measured', 'warm', 'effusive']),
  humor: z.enum(['none', 'gentle', 'dry', 'sharp']),
  pace: z.enum(['considered', 'natural', 'quick']),
  formality: z.enum(['casual', 'neutral', 'formal']),
  emoji: z.enum(['none', 'rare', 'occasional', 'playful']),
  vocabulary: z.enum(['slangy', 'neutral', 'elevated']),
  length: z.enum(['punchy', 'natural', 'fuller']),
});

export const generationVibeSchema = z.object({
  paletteSeed: paletteSeedSchema,
  typography: typographySpecSchema,
  spatial: spatialSpecSchema,
  shape: shapeSpecSchema,
  depth: depthSpecSchema,
  texture: textureSpecSchema,
  motion: motionSpecSchema,
  imagery: imagerySpecSchema,
  moodWords: z.array(z.string()),
  voice: voiceSpecSchema,
});

/* ── Section schemas ─────────────────────────────────────────────────────── */

export const heroSlotsSchema = z.object({
  titleRef: z.string(),
  subtitleRef: z.string().optional(),
  imageRef: z.string().optional(),
});
export const storySlotsSchema = z.object({
  bodyRef: z.string(),
  imageRef: z.string().optional(),
});
export const productSetSlotsSchema = z.object({
  cardRefs: z.array(z.string()),
  headingRef: z.string().optional(),
});
export const ctaSlotsSchema = z.object({
  labelRef: z.string(),
  secondaryLabelRef: z.string().optional(),
});
export const footerSlotsSchema = z.object({
  signatureRef: z.string().optional(),
});

export const sectionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hero'),
    variant: z.enum([
      'full-bleed-image',
      'centered-type',
      'split',
      'stacked-card',
      'minimal-mark',
    ]),
    slots: heroSlotsSchema,
    emphasis: z.literal('focal').optional(),
  }),
  z.object({
    type: z.literal('story'),
    variant: z.enum(['prose', 'pull-quote', 'timeline', 'two-up', 'banner']),
    slots: storySlotsSchema,
    emphasis: z.literal('focal').optional(),
  }),
  z.object({
    type: z.literal('productSet'),
    variant: z.enum([
      'editorial-full-bleed',
      'tight-grid',
      'horizontal-scroll',
      'collage-masonry',
      'list',
      'single-hero-product',
    ]),
    slots: productSetSlotsSchema,
    emphasis: z.literal('focal').optional(),
  }),
  z.object({
    type: z.literal('divider'),
    variant: z.enum(['rule', 'whitespace', 'motif', 'label']),
  }),
  z.object({
    type: z.literal('cta'),
    variant: z.enum(['button-row', 'banner-bar', 'inline-link', 'sticky-bar']),
    slots: ctaSlotsSchema,
  }),
  z.object({
    type: z.literal('footer'),
    variant: z.enum(['minimal', 'signature', 'branded']),
    slots: footerSlotsSchema,
  }),
]);

export const generationOutputSchema = z.object({
  vibe: generationVibeSchema,
  sections: z.array(sectionSchema),
  rationale: z.string().optional(),
});

export const SCALE_BAND = {
  min: MIN_SCALE_RATIO,
  max: MAX_SCALE_RATIO,
} as const;
