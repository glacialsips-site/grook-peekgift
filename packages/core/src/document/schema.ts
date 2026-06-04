import { z } from 'zod';
import type { PeekIR, PeekDocument } from './contract';

const Hex = z.string();
const ISODate = z.string();
const URLString = z.string();

export const PageTypeSchema = z.enum(['gift', 'invite']);
export const PeekStatusSchema = z.enum(['draft', 'published', 'claimed', 'archived']);

export const ConceptSchema = z
  .object({
    oneLiner: z.string(),
    boldMove: z.string(),
    voice: z.string(),
    emotionalCore: z.string(),
    antiPattern: z.string().optional(),
  })
  .passthrough();

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
    eyebrowTracking: z.string().optional(),
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

export const RadiusSpecSchema = z.preprocess(
  (v) => (typeof v === 'number' ? { card: v, pill: v } : v),
  z
    .object({
      card: z.number(),
      pill: z.number().default(999),
    })
    .passthrough(),
);

export const MotionSpecSchema = z
  .object({
    intensity: z.number(),
    reduceMotionOK: z.literal(true).default(true),
    easePanel: z.string().default(DEFAULT_EASE_PANEL),
    easeSheet: z.string().default(DEFAULT_EASE_SHEET),
  })
  .passthrough();

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
    space: SpaceSpecSchema.default(DEFAULT_SPACE),
    motion: MotionSpecSchema,
    loud: LoudSpecSchema.optional(),
    cssVars: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

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

export const CardTypeSchema = z.enum(['product', 'activity', 'aspirational', 'digital']);
export const VariantSelectionSchema = z.enum(['pick_one', 'pick_any', 'pick_all']);

export const UnlockRuleSchema = z
  .object({
    kind: z.enum(['beg', 'date_after', 'event']),
    beg_prompt: z.string().optional(),
    unlock_after: ISODate.optional(),
  })
  .passthrough();

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

export const SectionKindSchema = z.enum([
  'hero', 'note', 'giftgrid', 'rail', 'lookbook',
  'gallery',
  'details',
  'stats',
  'lede',
  'steps',
  'countdown',
  'claim',
  'tracklist', 'courses', 'tiers', 'stubs', 'flightplan',
  'custom',
]);

export const SectionSchema = z
  .object({
    id: z.string(),
    kind: SectionKindSchema,
    title: z.string().optional(),
    data: z.record(z.string(), z.unknown()).default({}),
    media: MediaSlotSchema.optional(),
  })
  .passthrough();

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

export const PeekIRSchema = z
  .object({
    schema_version: z.literal(1),
    peek: PeekSchema,
    sections: z.array(SectionSchema),
    variant_groups: z.array(VariantGroupSchema),
    cards: z.array(CardSchema),
  })
  .passthrough();

export const PresentationSchema = z
  .object({
    html: z.string(),
    html_hash: z.string(),
    runtime_version: z.string(),
    authored_at: ISODate,
  })
  .passthrough();

export const PeekDocumentSchema = z
  .object({
    schema_version: z.literal(2),
    spine: PeekIRSchema,
    presentation: PresentationSchema.nullable(),
  })
  .passthrough();

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

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; issues: z.core.$ZodIssue[] };

export function validatePeekIR(x: unknown): ValidationResult<PeekIR> {
  const r = PeekIRSchema.safeParse(x);
  if (r.success) return { ok: true, value: r.data as unknown as PeekIR };
  return {
    ok: false,
    error: z.prettifyError(r.error),
    issues: r.error.issues,
  };
}

export function parsePeekIR(x: unknown): PeekIR {
  return PeekIRSchema.parse(x) as unknown as PeekIR;
}

export function validatePeekDocument(x: unknown): ValidationResult<PeekDocument> {
  if (x && typeof x === 'object' && !('spine' in x) && 'peek' in x) {
    const ir = validatePeekIR(x);
    if (!ir.ok) return ir;
    return { ok: true, value: { schema_version: 2, spine: ir.value, presentation: null } };
  }
  const r = PeekDocumentSchema.safeParse(x);
  if (r.success) return { ok: true, value: r.data as unknown as PeekDocument };
  return { ok: false, error: z.prettifyError(r.error), issues: r.error.issues };
}

export function parsePeekDocument(x: unknown): PeekDocument {
  const r = validatePeekDocument(x);
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

