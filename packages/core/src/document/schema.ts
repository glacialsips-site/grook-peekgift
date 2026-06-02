// ============================================================================
// peek.gift — THE ZOD MIRROR of ir/contract.ts  (validate every model output here)
// ----------------------------------------------------------------------------
// Runtime validation layer for the IR. The chat authors a PeekIR; the host validates it
// with validatePeekIR() before it ever persists or renders. The types in ./contract.ts
// are the design-time source of truth; THIS file is their runtime enforcement and the two
// MUST stay in lockstep.
//
// Design rules baked in here:
//  • Forward-compat: object schemas use .passthrough() so unknown extra keys (e.g. a new
//    Section.data key a future renderer reads) are preserved, never a hard reject. Required
//    keys are still required; the goal is "don't scrap on a harmless extra", not "anything".
//  • New fields are optional/defaulted so an OLDER valid IR (e.g. samples/dad-60th.ir.json,
//    authored before DQ-4's value_display) validates UNCHANGED. validatePeekIR returns the
//    parsed value with defaults filled — callers should persist the parsed result.
//
// NOTE (core copy): this is the framework- AND DOM-agnostic lift of lib/ir/schema.ts. The
// `custom`-block HTML sanitizer (DOMPurify) that the app keeps in lib/ir/schema.ts is
// deliberately NOT here — sanitization is a web/security-adapter concern. Validate here,
// sanitize custom html in the adapter, THEN render.
// ============================================================================

import { z } from 'zod';
import type { PeekIR } from './contract';

// ─────────────────────────────────────────────────────────────────────────────
// 0. Primitives
// ─────────────────────────────────────────────────────────────────────────────
const Hex = z.string(); // permissive: the model may author hsl()/oklch()/named too. Don't reject color.
const ISODate = z.string();
const URLString = z.string();

export const PageTypeSchema = z.enum(['gift', 'invite']);
export const PeekStatusSchema = z.enum(['draft', 'published', 'claimed', 'archived']);

// ─────────────────────────────────────────────────────────────────────────────
// 1. Concept
// ─────────────────────────────────────────────────────────────────────────────
export const ConceptSchema = z
  .object({
    oneLiner: z.string(),
    boldMove: z.string(),
    voice: z.string(),
    emotionalCore: z.string(),
    antiPattern: z.string().optional(),
  })
  .passthrough();

// ─────────────────────────────────────────────────────────────────────────────
// 2. ThemeSpec (DQ-1 / DQ-2)
// ─────────────────────────────────────────────────────────────────────────────
export const FontSpecSchema = z
  .object({
    family: z.string(),
    source: z.enum(['google', 'fontsource', 'self']).optional(),
    weights: z.array(z.number()).optional(),
    axis: z.string().optional(),
  })
  .passthrough();

export const TypeSystemSchema = z
  .object({
    display: FontSpecSchema,
    body: FontSpecSchema,
    accent: FontSpecSchema.optional(),
    scaleRatio: z.number(),
    displayTracking: z.string().optional(),
    eyebrowTracking: z.string().optional(), // DQ-2
    displayCase: z.enum(['none', 'upper']).optional(),
  })
  .passthrough();

export const PaletteSchema = z
  .object({
    mode: z.enum(['light', 'dark']),
    bg: Hex,
    surface: Hex,
    ink: Hex,
    muted: Hex,
    line: Hex,
    accent: Hex,
    accent2: Hex.optional(),
    glow: z.boolean().optional(),
    texture: z.boolean().optional(),
  })
  .passthrough();

// Decorative registries — kept as enums so the model gets validated, BUT the renderer is
// expected to fall back gracefully (treat unknown as 'none'/'plain'). To extend, add here
// and in the renderer registry; do not loosen to z.string() (that would kill the guard).
export const SceneKindSchema = z.enum([
  'none', 'grain', 'rayfan', 'sunburst', 'starfield', 'gridfloor',
  'mirrorball', 'confetti', 'bubbles', 'halftone', 'blueprint', 'topo', 'mesh', 'scanlines',
]);
export const MotifKindSchema = z.enum([
  'sparkle', 'star', 'crown', 'suit', 'leaf', 'zigzag', 'rule',
  'dots', 'sunburst', 'hanko', 'chrome', 'stamp',
]);
export const FrameKindSchema = z.enum([
  'plain', 'arch', 'locket', 'vinyl', 'porthole', 'polaroid', 'idcard', 'stamp', 'ticket',
]);

// DQ-2 defaults — the enriched shell needs space/radius/motion-easing tokens that pre-DQ-2
// IRs (e.g. samples/dad-60th.ir.json, which has `radius: 6` and no `space`) don't carry.
// We accept the legacy shape and NORMALIZE it to canonical here, so old IRs validate
// UNCHANGED and downstream always sees the rich form. These are conservative floors, not
// taste — the model is expected to author richer values.
const DEFAULT_SPACE = { sectionY: 64, gutter: 22, stack: 12 };
const DEFAULT_EASE_PANEL = 'cubic-bezier(.22,1,.36,1)';
const DEFAULT_EASE_SHEET = 'cubic-bezier(.16,1,.3,1)';

export const SpaceSpecSchema = z
  .object({
    sectionY: z.number(),
    gutter: z.number(),
    stack: z.number().optional(),
  })
  .passthrough();

// radius: accept the canonical { card, pill } OR a legacy single number → { card:n, pill:n }.
export const RadiusSpecSchema = z.preprocess(
  (v) => (typeof v === 'number' ? { card: v, pill: v } : v),
  z
    .object({
      card: z.number(),
      pill: z.number().default(999), // legacy/object-without-pill → pill defaults to a true pill
    })
    .passthrough(),
);

export const MotionSpecSchema = z
  .object({
    intensity: z.number(),
    reduceMotionOK: z.literal(true).default(true),
    easePanel: z.string().default(DEFAULT_EASE_PANEL), // DQ-2: default so shell always has a curve
    easeSheet: z.string().default(DEFAULT_EASE_SHEET),
  })
  .passthrough();

// ADDITIVE: "loud" decorative tokens — all optional, so omitting `loud` reproduces the prior
// quiet render. (hard offset shadows / thick borders / strong grain the mockups rely on.)
export const LoudSpecSchema = z
  .object({
    displayShadow: z.string().optional(),
    cardShadow: z
      .object({
        x: z.number(),
        y: z.number(),
        blur: z.number().optional(),
        spread: z.number().optional(),
        color: z.string().optional(),
      })
      .passthrough()
      .optional(),
    borderWeight: z.number().optional(),
    textureStrength: z.number().optional(),
  })
  .passthrough();

export const ThemeSpecSchema = z
  .object({
    type: TypeSystemSchema,
    palette: PaletteSchema,
    scene: SceneKindSchema,
    motifs: z.array(MotifKindSchema),
    frame: FrameKindSchema,
    radius: RadiusSpecSchema,
    // DQ-2: `space` is required by the contract but synthesized for pre-DQ-2 IRs that lack
    // it, so legacy IRs validate unchanged while downstream always gets the rich shape.
    space: SpaceSpecSchema.default(DEFAULT_SPACE),
    motion: MotionSpecSchema,
    loud: LoudSpecSchema.optional(), // ADDITIVE: optional loud-token set
    cssVars: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

// ─────────────────────────────────────────────────────────────────────────────
// 3. Media
// ─────────────────────────────────────────────────────────────────────────────
export const ImageSourceSchema = z.enum(['user_upload', 'stock', 'ai_generated', 'external', 'pending']);
export const AspectSchema = z.enum(['16:9', '4:3', '1:1', '9:16', '3:4']);

export const MediaDirectiveSchema = z
  .object({
    op: z.enum(['generate', 'search', 'edit', 'upscale', 'removeBg', 'relight']),
    prompt: z.string().optional(),
    from: URLString.optional(),
    aspect: AspectSchema.optional(),
  })
  .passthrough();

export const MediaSlotSchema = z
  .object({
    url: URLString.nullable(),
    source: ImageSourceSchema,
    alt: z.string().optional(),
    directive: MediaDirectiveSchema.optional(),
    frame: FrameKindSchema.optional(),
    status: z.enum(['pending', 'ready', 'flagged']).optional(),
  })
  .passthrough();

// ─────────────────────────────────────────────────────────────────────────────
// 4. Cards (DQ-4 / DQ-5)
// ─────────────────────────────────────────────────────────────────────────────
export const CardTypeSchema = z.enum(['product', 'activity', 'aspirational', 'digital']); // DQ-5
export const VariantSelectionSchema = z.enum(['pick_one', 'pick_any', 'pick_all']);

export const UnlockRuleSchema = z
  .object({
    kind: z.enum(['beg', 'date_after', 'event']),
    beg_prompt: z.string().optional(),
    unlock_after: ISODate.optional(),
  })
  .passthrough();

// unlock_rule is either a real rule OR an empty object {} (the "no rule" sentinel kept
// from the existing build). Accept both; normalize nothing.
export const UnlockRuleFieldSchema = z.union([UnlockRuleSchema, z.object({}).strict()]);

export const CardSchema = z
  .object({
    id: z.string(),
    variant_group_id: z.string().nullable(),
    position: z.number(),
    type: CardTypeSchema,
    title: z.string(),
    description: z.string().nullable(),
    media: MediaSlotSchema.nullable(),
    source_url: URLString.nullable(),
    source_retailer: z.string().nullable(),
    value_cents: z.number().nullable(),
    // DQ-4: new + optional so pre-DQ-4 IRs validate. Default null; coerce missing→null.
    value_display: z.string().nullable().optional().default(null),
    reveal_value: z.boolean(),
    is_taunt: z.boolean(),
    taunt_text: z.string().nullable(),
    is_locked: z.boolean(),
    unlock_rule: UnlockRuleFieldSchema,
    proposed_date: ISODate.nullable(),
    location_hint: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export const VariantGroupSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    selection: VariantSelectionSchema,
  })
  .passthrough();

// ─────────────────────────────────────────────────────────────────────────────
// 5. Sections (DQ-3)
// ─────────────────────────────────────────────────────────────────────────────
export const SectionKindSchema = z.enum([
  'hero', 'note', 'giftgrid', 'rail', 'lookbook',
  'gallery',                 // DQ-3 ADDED
  'details',                 // DQ-3 ADDED
  'stats',                   // ADDITIVE: serif-numeral count-up band
  'lede',                    // ADDITIVE: pull-quote
  'steps',
  'countdown',               // DQ-3 PROMOTED (live)
  'claim',                   // DQ-3 PROMOTED (live)
  'tracklist', 'courses', 'tiers', 'stubs', 'flightplan',
  'custom',
]);

// data stays free-form (per-kind shapes are documented in contract.ts and enforced softly
// at the renderer). passthrough keeps unknown keys. This is intentional: the IR's
// expressivity lives in `custom` html and varied `data`, which we must not over-constrain.
export const SectionSchema = z
  .object({
    id: z.string(),
    kind: SectionKindSchema,
    title: z.string().optional(),
    data: z.record(z.string(), z.unknown()).default({}),
    media: MediaSlotSchema.optional(),
  })
  .passthrough();

// ─────────────────────────────────────────────────────────────────────────────
// 6. Peek
// ─────────────────────────────────────────────────────────────────────────────
export const PeekSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    curator_id: z.string(),
    page_type: PageTypeSchema,
    recipient_name: z.string().nullable(),
    relationship: z.string().nullable(),
    occasion: z.string().nullable(),
    concept: ConceptSchema,
    theme: ThemeSpecSchema,
    hero: MediaSlotSchema.nullable(),
    note_md: z.string().nullable(),
    cta_label: z.string().nullable(),
    status: PeekStatusSchema,
    stripe_payment_intent_id: z.string().nullable(),
    stripe_checkout_session_id: z.string().nullable(),
    published_at: ISODate.nullable(),
    expires_at: ISODate.nullable(),
    share_url: URLString.nullable(),
    created_at: ISODate,
    updated_at: ISODate,
  })
  .passthrough();

// ─────────────────────────────────────────────────────────────────────────────
// 7. The full IR
// ─────────────────────────────────────────────────────────────────────────────
export const PeekIRSchema = z
  .object({
    schema_version: z.literal(1),
    peek: PeekSchema,
    sections: z.array(SectionSchema),
    variant_groups: z.array(VariantGroupSchema),
    cards: z.array(CardSchema),
  })
  .passthrough();

// ─────────────────────────────────────────────────────────────────────────────
// 8. Pick (recipient side)
// ─────────────────────────────────────────────────────────────────────────────
export const PickSchema = z
  .object({
    id: z.string(),
    peek_id: z.string(),
    card_id: z.string(),
    picked_at: ISODate,
    recipient_signature: z.string().nullable(),
    recipient_note: z.string().nullable(),
    beg_message: z.string().nullable(),
  })
  .passthrough();

// ─────────────────────────────────────────────────────────────────────────────
// 9. Validation entrypoints
// ─────────────────────────────────────────────────────────────────────────────
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; issues: z.core.$ZodIssue[] };

/**
 * Validate an unknown value against the full PeekIR contract.
 * Returns the parsed IR WITH defaults filled (e.g. value_display→null) — persist the
 * returned `value`, not the raw input, so the stored row is canonical.
 */
export function validatePeekIR(x: unknown): ValidationResult<PeekIR> {
  const r = PeekIRSchema.safeParse(x);
  if (r.success) return { ok: true, value: r.data as unknown as PeekIR };
  return {
    ok: false,
    error: z.prettifyError(r.error),
    issues: r.error.issues,
  };
}

/** Throwing variant for code paths that treat invalid IR as a bug, not a user error. */
export function parsePeekIR(x: unknown): PeekIR {
  return PeekIRSchema.parse(x) as unknown as PeekIR;
}

// ─────────────────────────────────────────────────────────────────────────────
