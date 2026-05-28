// @ts-nocheck
//
// SLUG_MODEL.ts — canonical zod schema for a peek.gift "slug" (the assembled
// page model the recipient sees + the curator builds via Peek). This file is
// the spine-side derivation of `atelier/db/schema/*.ts` (Drizzle) — every
// field here must map back to a Drizzle column or a documented jsonb shape.
// Don't add fields that don't live in the schema; add a migration first.
//
// Companion to: TOOL_MANIFEST.md (tool list), CURATOR_PROMPT.md (the system
// prompt), CAPABILITY_INVENTORY.md (vendor surface), and the skill bundles in
// `_packets/SPINE/skills/`. Where this file disagrees with the Drizzle schema,
// THE DRIZZLE SCHEMA WINS — open a follow-up packet to reconcile.
//
// Naming convention: this file uses snake_case throughout because the Anthropic
// tool surface (see `atelier/lib/anthropic/tools/*.ts`) consistently uses
// snake_case. The Drizzle layer uses camelCase JS property names that map to
// snake_case Postgres columns via `text('column_name')`. The conversion between
// camelCase Drizzle rows and snake_case slug-model output happens in
// buildSlugModel (see TODO at bottom). Keep external API/tool inputs in
// snake_case to match the existing convention; the slug model output is what
// the recipient page and Peek's `peek_summary` interpolation consume.
//
// `@ts-nocheck` at top: this file is the canonical SCHEMA, not the runtime
// code path. Until the orchestrator validates it against `atelier/db/schema/*`
// in a follow-up packet, we don't want a worker session blocked by a stale
// import path. Real builder lives at TODO below.

import { z } from 'zod';

// ============================================================================
// Re-exported primitive enums (mirror db/schema/peeks.ts + cards.ts).
// ============================================================================

export const PeekStatusSchema = z.enum([
  'draft',
  'ready_for_publish',
  'published',
  'claimed',
  'archived',
]);
export type PeekStatus = z.infer<typeof PeekStatusSchema>;
// Note: the Drizzle schema (db/schema/peeks.ts:13-18) currently defines
// peek_status as ['draft', 'published', 'claimed', 'archived'] — there is no
// distinct 'ready_for_publish' enum value. The CURATOR_PROMPT spec calls for
// a ready_for_publish intermediate state. Today this is encoded as
// `peeks.metadata.markedReadyAt` (a timestamp string) per
// mark_ready_for_publish.ts:166-167. The SlugModel exposes
// 'ready_for_publish' as a status string by READING metadata.markedReadyAt
// when status === 'draft' (see buildSlugModel TODO). DB schema unchanged.

export const CardTypeSchema = z.enum([
  'product',
  'activity',
  'aspirational',
  'digital',
]);
export type CardType = z.infer<typeof CardTypeSchema>;
// NOTE: 'joke' is NOT a card type in the schema. Per CONCEPT-INVENTORY §1 and
// rules-engine-patterns.md §1, the gag pattern is `is_taunt: true` on any
// card type (typically aspirational or product). Don't add 'joke' here.

export const VariantSelectionSchema = z.enum([
  'pick_one',
  'pick_any',
  'pick_all',
]);
export type VariantSelection = z.infer<typeof VariantSelectionSchema>;

export const HeroImageSourceSchema = z.enum([
  'user_upload',
  'unsplash',
  'ai_generated',
  'external',
]);
export type HeroImageSource = z.infer<typeof HeroImageSourceSchema>;

export const AffiliateNetworkSchema = z.enum([
  'skimlinks',
  'sovrn',
  'amazon_associates',
  'direct',
]);
export type AffiliateNetwork = z.infer<typeof AffiliateNetworkSchema>;

// ============================================================================
// Vibe — mirrors `peeks.vibe` jsonb shape (db/schema/peeks.ts:73-95).
// All visual + tonal direction lives here. See skills/vibe-direction.md.
// ============================================================================

export const VibePaletteSchema = z
  .object({
    bg: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
    surface: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
    ink: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
    accent2: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  })
  .strict();
export type VibePalette = z.infer<typeof VibePaletteSchema>;

export const VibeFontPairingSchema = z
  .object({
    display: z.string().min(1).max(80),
    body: z.string().min(1).max(80),
  })
  .strict();
export type VibeFontPairing = z.infer<typeof VibeFontPairingSchema>;

export const VibeTypographySchema = z
  .object({
    heading: z.enum(['serif', 'display', 'sans', 'mono', 'script']),
    body: z.enum(['sans', 'serif', 'mono']),
  })
  .strict();
export type VibeTypography = z.infer<typeof VibeTypographySchema>;

export const VibeVoiceSchema = z
  .object({
    warmth: z.enum(['restrained', 'measured', 'warm', 'effusive']).optional(),
    humor: z.enum(['none', 'gentle', 'dry', 'sharp']).optional(),
    pace: z.enum(['considered', 'natural', 'quick']).optional(),
    formality: z.enum(['casual', 'neutral', 'formal']).optional(),
    emoji: z.enum(['none', 'rare', 'occasional', 'playful']).optional(),
    vocabulary: z.enum(['slangy', 'neutral', 'elevated']).optional(),
    length: z.enum(['punchy', 'natural', 'fuller']).optional(),
  })
  .strict();
export type VibeVoice = z.infer<typeof VibeVoiceSchema>;

export const VibeSignalSourceEntrySchema = z
  .object({
    source: z.enum(['curator', 'hero_palette', 'tone_classifier', 'card_mix']),
    ts: z.string().datetime(),
    patch: z.record(z.string(), z.unknown()).passthrough(),
  })
  .passthrough();
export type VibeSignalSourceEntry = z.infer<typeof VibeSignalSourceEntrySchema>;

export const VibeSchema = z
  .object({
    preset: z.enum(['playful', 'romantic', 'dry', 'unhinged', 'tender']).optional(),
    tone: z.string().min(1).max(280).optional(),
    palette: VibePaletteSchema.optional(),
    mood_words: z.array(z.string().min(1).max(60)).max(20).optional(),
    motion: z.enum(['still', 'soft', 'lively']).optional(),
    font_pairing: VibeFontPairingSchema.optional(),
    typography: VibeTypographySchema.optional(),
    density: z.enum(['compact', 'cozy', 'breathable']).optional(),
    shape: z.enum(['sharp', 'soft', 'pillowy']).optional(),
    mood: z.enum(['minimal', 'rich', 'whimsical', 'editorial']).optional(),
    voice: VibeVoiceSchema.optional(),
    signal_source_history: z.array(VibeSignalSourceEntrySchema).max(10).optional(),
  })
  .passthrough();
export type Vibe = z.infer<typeof VibeSchema>;

// ============================================================================
// Recipient — mirrors `peeks` recipient_* columns + `peeks.recipient_profile`
// jsonb (db/schema/peeks.ts:97-104, 113-122).
// ============================================================================

export const RecipientProfileSchema = z
  .object({
    favorite_things: z.array(z.string().min(1).max(200)).max(50).optional(),
    current_obsessions: z.array(z.string().min(1).max(200)).max(50).optional(),
    allergies_or_no_gos: z.array(z.string().min(1).max(200)).max(50).optional(),
    sizes: z.record(z.string().min(1).max(40), z.string().min(1).max(40)).optional(),
    notes: z.string().max(2000).optional(),
  })
  .passthrough();
export type RecipientProfile = z.infer<typeof RecipientProfileSchema>;

export const RecipientSchema = z
  .object({
    name: z.string().min(1).max(120).nullable(),
    relationship: z.string().min(1).max(120).nullable(),
    // Curator-only scratchpad. Hidden from the recipient page.
    profile: RecipientProfileSchema,
    // Who the gift is FROM. Group gifts are common; default [].
    giver_names: z.array(z.string().min(1).max(120)).max(20),
    // Soft budget signal, drives card-value choices. Hidden from recipient.
    budget_cents: z.number().int().nonnegative().max(100_000_000).nullable(),
  })
  .strict();
export type Recipient = z.infer<typeof RecipientSchema>;

// ============================================================================
// Occasion — `peeks.occasion` (free text today, enum-shaped per
// occasion-templates/ folder). Drives countdown + vibe defaults + reveal
// choreography.
// ============================================================================

export const OccasionKindSchema = z.enum([
  'birthday',
  'milestone_birthday',
  'princess_birthday',
  'teen_birthday',
  'wedding',
  'anniversary',
  'graduation',
  'bachelorette',
  'just_because',
  'holiday',
  'condolence',
  'retirement',
  'baby_shower',
  'milestone',
  // The free-text escape hatch — Peek's classifier may produce 'other' when
  // nothing matches (Hanukkah-coded just-because, mom's-getting-divorced-party,
  // post-surgery-celebration, etc.). The chat surface keeps the raw text.
  'other',
]);
export type OccasionKind = z.infer<typeof OccasionKindSchema>;

export const OccasionSchema = z
  .object({
    // Raw curator-supplied string (denormalized from peeks.occasion). This is
    // what Peek's classifier reads to pick the occasion-template skill.
    raw: z.string().min(1).max(120).nullable(),
    // Classifier output. May be null pre-classification.
    kind: OccasionKindSchema.nullable(),
    // The MOMENT — drives countdown, date_after locks, and share-pack timing.
    // ISO 8601 UTC. Optional; many occasions ("just because") don't have one.
    date_iso: z.string().datetime().nullable(),
  })
  .strict();
export type Occasion = z.infer<typeof OccasionSchema>;

// ============================================================================
// Hero — mirrors `peeks.hero_image_*` columns (db/schema/peeks.ts:124-127).
// ============================================================================

export const HeroSchema = z
  .object({
    image_url: z.string().url().nullable(),
    source: HeroImageSourceSchema.nullable(),
    // The prompt fed to fal.ai (if AI-generated). Null for uploads.
    prompt: z.string().max(2000).nullable(),
  })
  .strict();
export type Hero = z.infer<typeof HeroSchema>;

// ============================================================================
// Note — mirrors `peeks.note_md` (db/schema/peeks.ts:128). Markdown. The
// emotional core of the page per CURATOR_PROMPT §5.
// ============================================================================

export const NoteSchema = z
  .object({
    body_md: z.string().min(1).max(5000).nullable(),
    // Optional curator-side metadata (avatar URL set via set_note + camera
    // capture). Not yet a schema column; lives in peeks.metadata.note_avatar_url
    // until a follow-up packet promotes it. See voice-camera-protocol.md §3b.
    avatar_url: z.string().url().nullable(),
  })
  .strict();
export type Note = z.infer<typeof NoteSchema>;

// ============================================================================
// Unlock rules — discriminated union per db/schema/cards.ts:49-81. Server
// enforces all four kinds at app/api/pick/route.ts:132-169. See
// rules-engine-patterns.md §4.
// ============================================================================

export const BegUnlockSchema = z
  .object({
    kind: z.literal('beg'),
    beg_prompt: z.string().min(1).max(280).optional(),
  })
  .strict();
export type BegUnlock = z.infer<typeof BegUnlockSchema>;

export const DateAfterUnlockSchema = z
  .object({
    kind: z.literal('date_after'),
    // ISO 8601 timestamp. Server parses via Date.parse.
    unlock_after: z.string().min(1).max(64),
  })
  .strict();
export type DateAfterUnlock = z.infer<typeof DateAfterUnlockSchema>;

export const EventUnlockSchema = z
  .object({
    kind: z.literal('event'),
    // Optional ISO timestamp — used as a teaser ("unlocks after the
    // ceremony") rather than a hard gate. Server always returns
    // unlock_event_pending until curator manually flips a flag.
    // The flip column (`cards.unlock_event_fired_at`) is a proposed
    // follow-up per rules-engine-patterns.md §7.
    unlock_after: z.string().min(1).max(64).optional(),
  })
  .strict();
export type EventUnlock = z.infer<typeof EventUnlockSchema>;

export const RequiresPicksUnlockSchema = z
  .object({
    kind: z.literal('requires_picks'),
    card_ids: z.array(z.string().uuid()).min(1).max(20),
  })
  .strict();
export type RequiresPicksUnlock = z.infer<typeof RequiresPicksUnlockSchema>;

export const UnlockRuleSchema = z.discriminatedUnion('kind', [
  BegUnlockSchema,
  DateAfterUnlockSchema,
  EventUnlockSchema,
  RequiresPicksUnlockSchema,
]);
export type UnlockRule = z.infer<typeof UnlockRuleSchema>;

// ============================================================================
// Card — discriminated union by `type` per db/schema/cards.ts:83-131.
//
// Shared base; subtype extensions for the type-specific fields. Today's
// schema does NOT enforce type-specific column presence (everything's on
// `cards`); the shape below is the conceptual model Peek + the recipient page
// should respect. Drizzle row → SlugModel transformation lives in
// buildSlugModel (TODO).
// ============================================================================

export const CardBaseSchema = z
  .object({
    id: z.string().uuid(),
    peek_id: z.string().uuid(),
    variant_group_id: z.string().uuid().nullable(),
    position: z.number().int().nonnegative(),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).nullable(),
    image_url: z.string().url().nullable(),
    // Always hidden from the recipient. Used for affiliate routing only.
    source_url: z.string().url().nullable(),
    source_retailer: z.string().max(120).nullable(),
    affiliate_url: z.string().url().nullable(),
    affiliate_network: AffiliateNetworkSchema.nullable(),
    // numeric(5,2) in Drizzle; serialized as string from pg, normalized to
    // number here. Null if no commission known.
    commission_pct: z.number().min(0).max(100).nullable(),
    value_cents: z.number().int().nonnegative().max(10_000_000).nullable(),
    reveal_value: z.boolean(),
    // Rules engine — see skills/rules-engine-patterns.md.
    is_taunt: z.boolean(),
    taunt_text: z.string().max(280).nullable(),
    is_locked: z.boolean(),
    // Drizzle stores `{}` for "no rule" (Record<string, never>). The slug model
    // normalizes that to `null` for clarity — only set this when is_locked is
    // true and you have a real rule shape.
    unlock_rule: UnlockRuleSchema.nullable(),
    added_by_user_id: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()).passthrough(),
  });

// Product card — the most common shape. Affiliate-eligible. Has retailer,
// affiliate URL, price.
export const ProductCardSchema = CardBaseSchema.extend({
  type: z.literal('product'),
  // proposed_date and location_hint are nullable on the schema for all card
  // types but only meaningful for activity. Kept here as null-only for
  // products so the consumer doesn't have to type-narrow further.
  proposed_date: z.null(),
  location_hint: z.null(),
}).strict();
export type ProductCard = z.infer<typeof ProductCardSchema>;

// Activity card — the recipient's gift is doing-something-with-the-curator.
// May affiliate-route through OpenTable / Viator / Ticketmaster (Tier 1).
// Has proposed_date + location_hint.
export const ActivityCardSchema = CardBaseSchema.extend({
  type: z.literal('activity'),
  // ISO 8601 UTC, or null for TBD.
  proposed_date: z.string().datetime().nullable(),
  location_hint: z.string().max(280).nullable(),
}).strict();
export type ActivityCard = z.infer<typeof ActivityCardSchema>;

// Aspirational card — the designer thing, the Ferrari, the trip. Often
// beg-locked or date_after-locked. May be `is_taunt: true` for the pure-gag
// pattern (the "HA YEAH RIGHT" Ferrari).
export const AspirationalCardSchema = CardBaseSchema.extend({
  type: z.literal('aspirational'),
  proposed_date: z.string().datetime().nullable(),
  location_hint: z.string().max(280).nullable(),
}).strict();
export type AspirationalCard = z.infer<typeof AspirationalCardSchema>;

// Digital card — song (Spotify), movie (TMDB), video (YouTube), voice/video
// note from curator. May not have a `source_url` / `value_cents` (a voice
// note has neither). The discriminator is just `type: 'digital'`; the consumer
// inspects `metadata` for digital-subtype hints (e.g. `metadata.digital_kind:
// 'spotify_song' | 'tmdb_movie' | 'youtube_video' | 'voice_note'` — see
// TOOL_MANIFEST.md for set_song_card / set_movie_card specs).
export const DigitalCardSchema = CardBaseSchema.extend({
  type: z.literal('digital'),
  proposed_date: z.null(),
  location_hint: z.null(),
}).strict();
export type DigitalCard = z.infer<typeof DigitalCardSchema>;

export const CardSchema = z.discriminatedUnion('type', [
  ProductCardSchema,
  ActivityCardSchema,
  AspirationalCardSchema,
  DigitalCardSchema,
]);
export type Card = z.infer<typeof CardSchema>;

// ============================================================================
// Variant group — mirrors db/schema/cards.ts:30-44.
// ============================================================================

export const VariantGroupSchema = z
  .object({
    id: z.string().uuid(),
    peek_id: z.string().uuid(),
    title: z.string().min(1).max(120),
    selection: VariantSelectionSchema,
    position: z.number().int().nonnegative(),
    // Convenience denormalization — the IDs of cards in this group. Server-side
    // can JOIN; buildSlugModel populates it post-fetch. The page renderer reads
    // this rather than re-filtering `cards.variant_group_id`.
    card_ids: z.array(z.string().uuid()).max(50),
  })
  .strict();
export type VariantGroup = z.infer<typeof VariantGroupSchema>;

// ============================================================================
// Rules — aggregate of card-level locks + group selections + recipient-visible
// rule-pattern label. The label is set by `set_rules_template` (proposed in
// TOOL_MANIFEST.md). Lives in `peeks.metadata.rules_pattern` until a follow-up
// promotes it. See skills/rules-engine-patterns.md §2 for pattern names.
// ============================================================================

export const RulesPatternNameSchema = z.enum([
  'shoes_dinners_ferrari',
  'pick_everything_unless_afternoon',
  'wedding_registry_counter_propose',
  'escalator',
  'surprise_with_roast',
  'vintage_tee_chaos',
  'cheap_and_cheerful_plus_one_luxury',
  'all_of_these_no_choice',
  'event_locked_finale',
  // Custom = curator hand-composed; no canonical pattern name.
  'custom',
]);
export type RulesPatternName = z.infer<typeof RulesPatternNameSchema>;

export const RulesSchema = z
  .object({
    pattern: RulesPatternNameSchema.nullable(),
    // Count of locked cards across the peek (derived from cards). Convenience
    // for the recipient-page "X locked" badge.
    locked_card_count: z.number().int().nonnegative(),
    // Whether any card in the peek is a taunt (drives different render hints).
    has_taunt: z.boolean(),
  })
  .strict();
export type Rules = z.infer<typeof RulesSchema>;

// ============================================================================
// Countdown — derived from `occasion.date_iso`. Null when no date set. The
// recipient page reads this for the countdown UI per CURATOR_PROMPT §8.
// ============================================================================

export const CountdownSchema = z
  .object({
    // ISO 8601 UTC — same as occasion.date_iso, denormalized for convenience.
    target_iso: z.string().datetime(),
    // Curator-supplied display label (e.g. "until the wedding", "until you're
    // legal", "until your birthday"). Optional; the page provides a sensible
    // default per occasion if not set. Lives in `peeks.metadata.countdown_label`.
    label: z.string().min(1).max(120).nullable(),
    // Whether to render the countdown on the page. Curator can opt out even
    // when a date exists. Defaults true when date exists.
    visible: z.boolean(),
  })
  .strict();
export type Countdown = z.infer<typeof CountdownSchema>;

// ============================================================================
// Share — assembled post-publish per skills/share-mechanics.md §1. The
// share-pack is a fan-out from the `peek.published` Inngest event into the
// Anthropic Batch API. Until that lands, the slug model exposes only the
// existing `peeks.share_url` + a placeholder pack shape.
// ============================================================================

export const SharePackVariantSchema = z
  .object({
    platform: z.enum([
      'og',
      'ig_story',
      'twitter',
      'facebook',
      'whatsapp',
      'sms',
      'email',
    ]),
    image_url: z.string().url().nullable(),
    body_text: z.string().max(2000).nullable(),
    subject: z.string().max(120).nullable(), // email only
    cta_label: z.string().max(60).nullable(),
  })
  .strict();
export type SharePackVariant = z.infer<typeof SharePackVariantSchema>;

export const ShareSchema = z
  .object({
    // The /g/[slug] URL. Set on publish; null on draft.
    share_url: z.string().url().nullable(),
    // Per-platform variants — populated by the Inngest fan-out (see
    // share-mechanics.md §1). Null pre-publish.
    pack: z.array(SharePackVariantSchema).nullable(),
    // Recipient-side reaction capture URL (Tier 0 per CAPABILITY_INVENTORY
    // §F3 + skills/voice-camera-protocol.md §4). Schema column proposed in
    // share-mechanics.md §4: `peeks.recipient_reaction_url`. Until that
    // migration lands, lives in `peeks.metadata.recipient_reaction_url`.
    recipient_reaction_url: z.string().url().nullable(),
    recipient_reaction_uploaded_at: z.string().datetime().nullable(),
    // Curator can disable the reaction prompt per-peek (sensitive occasions).
    recipient_reaction_consent_disabled: z.boolean(),
  })
  .strict();
export type Share = z.infer<typeof ShareSchema>;

// ============================================================================
// Collab — mirrors db/schema/collaborators.ts. Tier 1 per CAPABILITY_INVENTORY
// §H5. v0 = solo curator; this is exposed in the slug model for completeness
// but only populated when peek has co-curators.
// ============================================================================

export const CollaboratorRoleSchema = z.enum([
  'organizer',
  'co_organizer',
  'contributor',
]);
export type CollaboratorRole = z.infer<typeof CollaboratorRoleSchema>;

export const CollaboratorSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().nullable(), // Clerk user ID, null for pre-signup invites
    invited_email: z.string().email().nullable(),
    role: CollaboratorRoleSchema,
    accepted_at: z.string().datetime().nullable(),
  })
  .strict();
export type Collaborator = z.infer<typeof CollaboratorSchema>;

export const CollabSchema = z
  .object({
    // The curator who owns the peek (peeks.curator_id). All peeks have one.
    organizer_user_id: z.string().nullable(),
    // Co-curators (excludes the organizer). Empty array for solo peeks.
    collaborators: z.array(CollaboratorSchema),
  })
  .strict();
export type Collab = z.infer<typeof CollabSchema>;

// ============================================================================
// Checkout — Stripe handoff state. Today's `peeks` table tracks
// stripe_payment_intent_id + stripe_checkout_session_id (db/schema/peeks.ts:
// 130-131). Post-publish, status transitions draft → published via webhook.
// See CAPABILITY_INVENTORY §C for the planned Stripe surface expansion.
// ============================================================================

export const CheckoutSchema = z
  .object({
    // Stripe Payment Element handoff. Null pre-handoff.
    payment_intent_id: z.string().nullable(),
    checkout_session_id: z.string().nullable(),
    // ISO timestamp when payment succeeded (mirrors peeks.published_at).
    paid_at: z.string().datetime().nullable(),
    // Whether the published peek was paid for via a test coupon. Read
    // peeks.metadata.test_coupon — never expose in user-facing UI.
    via_test_coupon: z.boolean(),
  })
  .strict();
export type Checkout = z.infer<typeof CheckoutSchema>;

// ============================================================================
// SlugModel — the canonical assembled-page model. Output of buildSlugModel().
// This is what:
//
//   - The recipient page at /g/[slug] reads to render.
//   - Peek receives as the `{peek_summary}` JSON interpolation in
//     CURATOR_PROMPT.md.
//   - The share-pack Batch API jobs receive as input (subset).
//   - The curator-side build preview reads to render live.
//
// One serialization, every consumer.
// ============================================================================

export const SlugModelSchema = z
  .object({
    peek_id: z.string().uuid(),
    slug: z.string().min(1).max(120),
    status: PeekStatusSchema,
    // ISO 8601 UTC.
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    published_at: z.string().datetime().nullable(),
    expires_at: z.string().datetime().nullable(),
    recipient: RecipientSchema,
    occasion: OccasionSchema,
    vibe: VibeSchema,
    hero: HeroSchema,
    note: NoteSchema,
    // Cards in display order (already sorted by position).
    cards: z.array(CardSchema),
    variant_groups: z.array(VariantGroupSchema),
    rules: RulesSchema,
    countdown: CountdownSchema.nullable(),
    share: ShareSchema,
    collab: CollabSchema,
    checkout: CheckoutSchema,
  })
  .strict();
export type SlugModel = z.infer<typeof SlugModelSchema>;

// ============================================================================
// buildSlugModel — declared signature only. Implementation is a follow-up
// packet (likely Packet 41+ per CAPABILITY_INVENTORY §K).
// ============================================================================

/**
 * Assemble the canonical SlugModel from DB rows. Should be a single query
 * via Supabase's nested-select syntax (or one Drizzle query with joins on
 * variant_groups + cards + peek_collaborators) to avoid N+1.
 *
 * Recommended shape (Supabase example):
 *
 *   supabase
 *     .schema('peek_v2')
 *     .from('peeks')
 *     .select(`
 *       *,
 *       variant_groups (*),
 *       cards (*),
 *       peek_collaborators (*)
 *     `)
 *     .eq('id', peekId)
 *     .single();
 *
 * Then in-process: sort cards by position; group card_ids onto their variant
 * groups; derive `rules.locked_card_count` / `rules.has_taunt`; coerce numeric
 * commission_pct (Drizzle returns string for numeric(5,2)) to number; coerce
 * Date columns to ISO strings; normalize unlock_rule `{}` → null; promote
 * `metadata.markedReadyAt` to `status === 'ready_for_publish'` when set and
 * status is still 'draft'.
 *
 * Perf budget: <50ms p95 on a peek with ≤20 cards / ≤5 variant groups. Single
 * query, in-process transform. No second roundtrip.
 *
 * Validation: every output of this function MUST pass SlugModelSchema.parse()
 * in dev mode (strip in prod via a `process.env.NODE_ENV` gate). Catches
 * schema drift cheaply.
 *
 * Caller signature is `(peekId: string, supabaseClient: SupabaseClient)`
 * rather than `(peekId: string, db: DrizzleDB)` so that the recipient page
 * (which uses anon-key Supabase via RLS) and the chat route (which uses
 * Drizzle service-role) can share a builder. Drizzle variant lives alongside
 * with the same return shape.
 *
 * @param peekId - UUID of the peek to load.
 * @param db - Supabase client OR Drizzle DB. Implementation overloads.
 * @returns The canonical SlugModel.
 * @throws if peek not found.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function buildSlugModel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  peekId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: unknown,
): Promise<SlugModel> {
  // TODO: implement in a follow-up packet. See JSDoc above for the recommended
  // shape. Schema is the canonical part; this builder is intentionally
  // unimplemented in the spine drop.
  throw new Error('buildSlugModel not implemented — see follow-up packet');
}

// ============================================================================
// Re-exports for consumer convenience.
// ============================================================================

export {
  // Primitive enums.
  PeekStatusSchema as Status,
  CardTypeSchema as Type,
  VariantSelectionSchema as Selection,
  AffiliateNetworkSchema as Network,
};
