// ============================================================================
// peek.gift — THE IR CONTRACT  (the frozen spine; overbuild this, build lean behind it)
// ----------------------------------------------------------------------------
// This is a SUPERSET MIGRATION of the repo's existing lib/types.ts. Nothing the
// current build relies on is removed — Card / VariantGroup / Pick are kept verbatim.
// What changes: the thin `Vibe` (palette + one font_pairing) is replaced by a real
// `ThemeSpec`, and the page gains a `Concept` and a `sections[]` layer so the PAGE
// STRUCTURE is data — which is what lets the chat store a lotería card, a legal
// decree, a varsity lineup, OR a plain gift grid in the same shape.
//
// RULE: the chat model authors a `PeekIR`. The renderer consumes a `PeekIR`. Checkout
// and the recipient view consume a `PeekIR`. One shape, three parts. Validate every
// model output against this (Zod mirror lives in ir/schema.ts — generate from these).
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// 0. Primitives
// ─────────────────────────────────────────────────────────────────────────────
export type Hex = string;            // '#1c2b4a'
export type ISODate = string;        // '2026-08-09T19:30:00Z'
export type URLString = string;
export type Markdown = string;

export type PageType = 'gift' | 'invite';
export type PeekStatus = 'draft' | 'published' | 'claimed' | 'archived';

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONCEPT — the design idea, captured as data (NEW; this is the anti-generic lock)
//    The chat must fill this. If `oneLiner` is vague enough to fit any other page,
//    the page will be generic — the schema makes the concept a first-class field so
//    it can't be skipped.
// ─────────────────────────────────────────────────────────────────────────────
export interface Concept {
  oneLiner: string;          // "Dad's 60th as a hardware-store work order" — must EXCLUDE things
  boldMove: string;          // the single signature gesture, named: "the dinner is a torn ticket stub"
  voice: string;             // 3-ish adjectives: "gruff, dry, secretly tender"
  emotionalCore: string;     // the feeling, not the facts: "grown kids finally doing something for him"
  antiPattern?: string;      // the generic version being refused: "balloons + 'Happy Birthday Dad'"
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. THEME SPEC — theme-as-data → CSS custom properties (REPLACES thin `Vibe`)
//    A full type SYSTEM (not one pairing), a structured palette, scene/motif/frame,
//    radius/space/motion tokens. The renderer maps these to --peek-* vars.
// ─────────────────────────────────────────────────────────────────────────────
export interface FontSpec {
  family: string;            // 'Oswald'
  // optional loader hint so the host can fetch/subset (Google, Fontsource, self-host…)
  source?: 'google' | 'fontsource' | 'self';
  weights?: number[];
  // raw css2 axis query if the family needs it, e.g. 'Fraunces:opsz,wght@9..144,400..700'
  axis?: string;
}

export interface TypeSystem {
  display: FontSpec;         // the characterful face — half the concept. VARY IT PER PAGE.
  body: FontSpec;
  accent?: FontSpec;         // optional third (script/mono) for eyebrows, numerals, stamps
  scaleRatio: number;        // hierarchy drama; hero ≈ body * (this ^ steps). 1.25–1.6
  displayTracking?: string;  // '-0.02em'
  displayCase?: 'none' | 'upper';
}

export interface Palette {
  mode: 'light' | 'dark';
  bg: Hex; surface: Hex; ink: Hex; muted: Hex; line: Hex;
  accent: Hex; accent2?: Hex;
  glow?: boolean;            // neon treatments on dark
  texture?: boolean;         // grain overlay
}

// Decorative kinds the renderer knows how to draw. Extend the registry, not the schema.
export type SceneKind =
  | 'none' | 'grain' | 'rayfan' | 'sunburst' | 'starfield' | 'gridfloor'
  | 'mirrorball' | 'confetti' | 'bubbles' | 'halftone' | 'blueprint' | 'topo' | 'mesh' | 'scanlines';
export type MotifKind =
  | 'sparkle' | 'star' | 'crown' | 'suit' | 'leaf' | 'zigzag' | 'rule'
  | 'dots' | 'sunburst' | 'hanko' | 'chrome' | 'stamp';
export type FrameKind =
  | 'plain' | 'arch' | 'locket' | 'vinyl' | 'porthole' | 'polaroid' | 'idcard' | 'stamp' | 'ticket';

export interface MotionSpec {
  intensity: number;         // 0..1; 0 = still, 1 = kinetic. Gate ambient loops on this.
  reduceMotionOK: true;      // always honor prefers-reduced-motion
}

export interface ThemeSpec {
  type: TypeSystem;
  palette: Palette;
  scene: SceneKind;
  motifs: MotifKind[];       // keep to an ornament budget (≈ 1–4)
  frame: FrameKind;          // default media treatment for this page
  radius: number;            // px, card corner
  motion: MotionSpec;
  // escape hatch: raw CSS custom properties the model wants to inject. Sanitize server-side.
  cssVars?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MEDIA — every slot is vendor-neutral. A real url OR a directive the host fulfils
//    via the ImageProvider port (see ir/ports.ts). The renderer shows the gradient
//    fallback until a url lands. THIS is how fal/replicate/stock/etc. stay swappable.
// ─────────────────────────────────────────────────────────────────────────────
export type ImageSource = 'user_upload' | 'stock' | 'ai_generated' | 'external' | 'pending';

export interface MediaSlot {
  url: URLString | null;     // null = not yet fulfilled → renderer shows themed placeholder
  source: ImageSource;
  alt?: string;
  // if url is null, this directive tells the ImageProvider port what to make/fetch:
  directive?: {
    op: 'generate' | 'search' | 'edit' | 'upscale' | 'removeBg' | 'relight';
    prompt?: string;         // vivid, specific — for generate/search
    from?: URLString;        // source image for edit/upscale/removeBg/relight
    aspect?: '16:9' | '4:3' | '1:1' | '9:16' | '3:4';
  };
  frame?: FrameKind;         // overrides ThemeSpec.frame for this slot
  status?: 'pending' | 'ready' | 'flagged'; // 'flagged' = failed moderation (Moderation port)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CARDS — KEPT FROM EXISTING lib/types.ts (the product spine code already built).
//    Only change: image_url → MediaSlot so generated/stock imagery flows through ports.
// ─────────────────────────────────────────────────────────────────────────────
export type CardType = 'product' | 'activity' | 'aspirational' | 'digital';
export type VariantSelection = 'pick_one' | 'pick_any' | 'pick_all';

export interface UnlockRule {
  kind: 'beg' | 'date_after' | 'event';
  beg_prompt?: string;
  unlock_after?: ISODate;
}

export interface Card {
  id: string;
  variant_group_id: string | null;
  position: number;
  type: CardType;
  title: string;
  description: string | null;
  media: MediaSlot | null;              // was image_url
  source_url: URLString | null;         // where curator found it — hidden from recipient
  source_retailer: string | null;       // hidden from recipient
  value_cents: number | null;
  reveal_value: boolean;
  is_taunt: boolean;                     // decorative "HA, DENIED" card
  taunt_text: string | null;
  is_locked: boolean;
  unlock_rule: UnlockRule | Record<string, never>;
  proposed_date: ISODate | null;        // activity cards
  location_hint: string | null;         // activity cards
  metadata: Record<string, unknown>;
}

export interface VariantGroup {
  id: string;
  title: string;
  selection: VariantSelection;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SECTIONS — the PAGE STRUCTURE as data (NEW). Ordered blocks the renderer paints.
//    Archetypes cover the originals; `custom` is the no-ceiling escape hatch (the model
//    writes themed HTML against --peek-* css vars; sanitize server-side before render).
//    The gift-card grid is just one block kind, so gift + invite share one shape.
// ─────────────────────────────────────────────────────────────────────────────
export type SectionKind =
  | 'hero'          // eyebrow + big headline + dek + optional hero media
  | 'note'          // the personal note (gift pages)
  | 'giftgrid'      // the cards (references Card[] by group/order) — the core
  | 'rail'          // horizontal scroller of cards/media
  | 'lookbook'      // editorial figure stack
  | 'details'       // when / where / dress (invites)
  | 'steps'         // how it works / how it ships
  | 'tracklist' | 'courses' | 'tiers' | 'stubs' | 'flightplan' // invite archetypes
  | 'custom';       // model-authored themed markup. { html } sanitized before render

export interface Section {
  id: string;
  kind: SectionKind;
  title?: string;
  // free-form, kind-specific content. e.g. hero: {eyebrow, headline, dek, media}
  // details: {rows:[['When','Sat 8pm'],...]}  custom: {html}  giftgrid: {intro}
  data: Record<string, unknown>;
  media?: MediaSlot;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. THE PAGE — Peek record (KEPT) now carries concept + theme + sections.
// ─────────────────────────────────────────────────────────────────────────────
export interface Peek {
  id: string;
  slug: string;
  curator_id: string;
  page_type: PageType;                  // NEW: 'gift' | 'invite'
  recipient_name: string | null;
  relationship: string | null;
  occasion: string | null;

  concept: Concept;                     // NEW — the design idea as data
  theme: ThemeSpec;                     // REPLACES `vibe`
  hero: MediaSlot | null;               // was hero_image_url/source

  note_md: Markdown | null;
  cta_label: string | null;             // in-world button: "Send the care package"

  status: PeekStatus;
  // checkout (KEPT)
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  published_at: ISODate | null;
  expires_at: ISODate | null;
  share_url: URLString | null;
  created_at: ISODate;
  updated_at: ISODate;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. THE FULL IR — what the chat emits, the renderer reads, checkout+recipient consume.
//    `schema_version` so migrations never force a scrap.
// ─────────────────────────────────────────────────────────────────────────────
export interface PeekIR {
  schema_version: 1;
  peek: Peek;
  sections: Section[];          // ordered page structure
  variant_groups: VariantGroup[];
  cards: Card[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. RECIPIENT SIDE — KEPT verbatim from existing types.
// ─────────────────────────────────────────────────────────────────────────────
export interface Pick {
  id: string;
  peek_id: string;
  card_id: string;
  picked_at: ISODate;
  recipient_signature: string | null;
  recipient_note: string | null;
  beg_message: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. MIGRATION NOTES (for code)
// ─────────────────────────────────────────────────────────────────────────────
// • DB: keep `cards`, `variant_groups`, `picks` tables. On `peeks`: drop `vibe` jsonb,
//   add `concept` jsonb, `theme` jsonb, `page_type` text, `cta_label` text; change
//   `hero_image_url`/`hero_image_source` → `hero` jsonb (MediaSlot). Add `sections`
//   jsonb (or a `sections` table if you prefer relational; JSONB is fine for v0).
// • The old VIBE_PRESETS become *seed ThemeSpecs* the model can start from — but the
//   model authors `theme` directly and must VARY `type.display` per concept. Presets
//   are a floor, never the ceiling. Delete the "every preset = Fraunces+Inter" default.
// • Tools the chat needs (extend lib/peek-tools.ts): set_concept, set_theme,
//   set_sections / upsert_section, plus the existing card tools (now writing MediaSlot).
// • Validate every tool payload against the Zod mirror before persisting. Reject invalid
//   — never render unvalidated model output (especially `custom` html → sanitize).
