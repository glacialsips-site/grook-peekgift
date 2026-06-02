// ============================================================================
// peek.gift — THE IR CONTRACT  (the FROZEN SPINE; overbuild this, build lean behind it)
// ----------------------------------------------------------------------------
// Ported from peek-jumpoff/ir/contract.ts and AMENDED per DECISIONS.md (the settled
// DQ resolutions). This is the single TypeScript source of truth for the shape the chat
// authors, the renderer consumes, and checkout + the recipient view read. The Zod mirror
// in ./schema.ts is generated from these types and MUST stay in lockstep.
//
// This is a SUPERSET MIGRATION of the repo's existing lib/types.ts. Nothing the current
// build relies on is removed — Card / VariantGroup / Pick are kept verbatim (only the old
// `image_url: string` becomes `media: MediaSlot` so generated/stock imagery flows through
// the ImageProvider port). The thin `Vibe` (palette + one font_pairing) is replaced by a
// real `ThemeSpec`; the page gains a `Concept` and an ordered `sections[]` layer so the
// PAGE STRUCTURE is data — which is what lets the chat store a lotería card, a legal
// decree, a varsity lineup, OR a plain gift grid in the same shape.
//
// RULE: the chat model authors a `PeekIR`. The renderer consumes a `PeekIR`. Checkout and
// the recipient view consume a `PeekIR`. One shape, three parts. Validate every model
// output against the Zod mirror (./schema.ts) before persisting or rendering.
//
// ── AMENDMENTS (DECISIONS.md) ────────────────────────────────────────────────
//   DQ-1  CSS vars standardize to the `--peek-*` namespace (the renderer emits these;
//         the var contract is documented on ThemeSpec below, single source of truth).
//   DQ-2  ThemeSpec enriched so a RICH SHELL renders from data alone: `space`
//         (sectionY, gutter…), `radius` as { card, pill }, `motion` easings
//         (easePanel, easeSheet) beside intensity/reduceMotionOK; TypeSystem gains
//         displayTracking, eyebrowTracking, displayCase, scaleRatio.
//   DQ-3  SectionKind adds `details` + `gallery`; promotes `countdown` + `claim` to
//         first-class (they carry LIVE STATE static HTML can't); keeps `custom` escape
//         hatch. Each kind's expected `data` shape is documented inline below.
//   DQ-4  Card gains `value_display?: string` (ranges / "—") beside value_cents.
//   DQ-5  CardType stays product | activity | aspirational | digital (contract wins;
//         the renderer re-maps its old homemade/experience/idea vocabulary onto these).
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
// 1. CONCEPT — the design idea, captured as data (the anti-generic lock).
//    The chat MUST fill this. If `oneLiner` is vague enough to fit any other page,
//    the page will be generic — making concept a first-class field means it can't be
//    skipped. (Kept verbatim from the source contract.)
// ─────────────────────────────────────────────────────────────────────────────
export interface Concept {
  oneLiner: string;          // "Dad's 60th as a hardware-store work order" — must EXCLUDE things
  boldMove: string;          // the single signature gesture, named: "the dinner is a torn ticket stub"
  voice: string;             // 3-ish adjectives: "gruff, dry, secretly tender"
  emotionalCore: string;     // the feeling, not the facts: "grown kids finally doing something for him"
  antiPattern?: string;      // the generic version being refused: "balloons + 'Happy Birthday Dad'"
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. THEME SPEC — theme-as-data → CSS custom properties (REPLACES thin `Vibe`).
//    A full type SYSTEM (not one pairing), a structured palette, scene/motif/frame, and
//    radius/space/motion tokens. The renderer maps these to --peek-* vars (DQ-1/DQ-2).
//
//    ── THE --peek-* CSS VARIABLE CONTRACT (DQ-1) ──────────────────────────────
//    The renderer is the ONLY emitter; consumers (incl. `custom`-block HTML the model
//    writes) read these and nothing else. Stable names so model-authored markup is
//    forward-compatible. Mapping ThemeSpec → vars (see ir/INTERFACES.md §Renderer):
//      palette.bg      → --peek-bg          palette.surface → --peek-surface
//      palette.ink     → --peek-ink         palette.muted   → --peek-muted
//      palette.line    → --peek-line        palette.accent  → --peek-accent
//      palette.accent2 → --peek-accent-2
//      type.display    → --peek-font-display (full font stack)
//      type.body       → --peek-font-body    type.accent → --peek-font-accent
//      radius.card     → --peek-radius-card  radius.pill → --peek-radius-pill
//      space.sectionY  → --peek-space-section-y   space.gutter → --peek-space-gutter
//      space.stack     → --peek-space-stack
//      motion.easePanel→ --peek-ease-panel   motion.easeSheet → --peek-ease-sheet
//    Any ThemeSpec.cssVars entries are emitted verbatim (already `--peek-*`-namespaced,
//    sanitized server-side). Renderer NEVER emits the legacy `--bg/--accent` names; the
//    ported reference engine (peek-jumpoff/engine/renderer.js) used those and is rewritten.
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
  displayTracking?: string;  // '-0.02em' — letter-spacing on the display face
  eyebrowTracking?: string;  // '0.16em'  — letter-spacing on eyebrows/labels (DQ-2)
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

// DQ-2: spacing rhythm as data so the shell's vertical/gutter feel is theme-driven, not
// hardcoded in the renderer. All px. Maps to --peek-space-*.
export interface SpaceSpec {
  sectionY: number;          // vertical padding between sections (≈ 48–96)
  gutter: number;            // horizontal page gutter (≈ 18–24)
  stack?: number;            // default gap inside a stack of blocks (≈ 10–16)
}

// DQ-2: corner radii split so pills (buttons/badges) and cards differ. Maps to
// --peek-radius-card / --peek-radius-pill.
export interface RadiusSpec {
  card: number;              // px, card/sheet corner (≈ 6–22)
  pill: number;              // px, button/badge corner (≈ 8–999)
}

// ── "LOUD" DECORATIVE TOKENS (ADDITIVE, all optional → default to the prior quiet look) ──
// The mockups lean on hard offset shadows, thick ink borders, real kraft grain. The thin
// 1px-border / soft-radius / faint-grain renderer can't express these. These tokens give the
// shell + section chrome a loud vocabulary. ALL optional; omitting them reproduces the old
// (quiet) render exactly. Maps to --peek-display-shadow / --peek-card-shadow / --peek-border-weight
// / --peek-texture-strength.
export interface LoudSpec {
  // hard offset text-shadow on display headlines, e.g. "3px 3px 0 var(--peek-accent-2)".
  // Pass the FULL css text-shadow value (so the author controls offset/blur/color), or a
  // shorthand the renderer expands. '' / omitted → no display shadow.
  displayShadow?: string;
  // hard offset box-shadow on cards/panels: { x, y, blur?, spread?, color? } → composed into
  // `Xpx Ypx Bpx Spx color`. color defaults to ink. Omitted → soft default card shadow.
  cardShadow?: { x: number; y: number; blur?: number; spread?: number; color?: string };
  // border thickness (px) on cards, panels, ledger, dividers. Default 1.
  borderWeight?: number;
  // grain/texture overlay opacity 0..1 (the mockups run .07; the renderer ran a fixed .06).
  // Omitted → the prior fixed faint value.
  textureStrength?: number;
}

// DQ-2: motion intensity PLUS the easing curves the shell animates with (panel = slide
// menu / sticky bar, sheet = bottom sheet). Maps to --peek-ease-panel / --peek-ease-sheet.
export interface MotionSpec {
  intensity: number;         // 0..1; 0 = still, 1 = kinetic. Gate ambient loops on this.
  reduceMotionOK: true;      // always honor prefers-reduced-motion
  easePanel?: string;        // cubic-bezier(...) for slide menu / sticky bar (DQ-2)
  easeSheet?: string;        // cubic-bezier(...) for the bottom sheet (DQ-2)
}

// NOTE on back-compat: this is the CANONICAL shape NEW IRs must author. The Zod mirror
// (./schema.ts) also NORMALIZES the pre-DQ-2 shape so older IRs (e.g.
// samples/dad-60th.ir.json, which carries `radius: 6` and no `space`) validate unchanged:
// a numeric `radius` becomes { card:n, pill:n }, a missing `space` gets a default, and
// missing motion easings get defaults. validate → use the PARSED result, which is always
// this rich form. Do not author the legacy shape going forward.
export interface ThemeSpec {
  type: TypeSystem;
  palette: Palette;
  scene: SceneKind;
  motifs: MotifKind[];       // keep to an ornament budget (≈ 1–4)
  frame: FrameKind;          // default media treatment for this page
  radius: RadiusSpec;        // DQ-2: { card, pill } (was a single number)
  space: SpaceSpec;          // DQ-2: spacing rhythm as data
  motion: MotionSpec;        // DQ-2: intensity + easings
  loud?: LoudSpec;           // ADDITIVE: hard-offset shadow / thick border / strong grain vocabulary
  // escape hatch: raw CSS custom properties the model wants to inject. MUST be
  // `--peek-*`-namespaced; sanitized server-side before render.
  cssVars?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MEDIA — every slot is vendor-neutral. A real url OR a directive the host fulfils
//    via the ImageProvider port (see ir/ports.ts). The renderer shows the themed
//    gradient fallback until a url lands. THIS is how fal/replicate/stock stay swappable.
//    (Kept verbatim from the source contract.)
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
//    Changes vs the existing build: image_url → MediaSlot (DQ: media via ports); and
//    DQ-4 adds value_display for ranges / "—". value_cents stays for math (subtotals);
//    value_display is what the recipient reads when a number is wrong ("$40–$60", "—").
// ─────────────────────────────────────────────────────────────────────────────
export type CardType = 'product' | 'activity' | 'aspirational' | 'digital'; // DQ-5: unchanged
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
  value_cents: number | null;           // numeric, for subtotal math
  value_display: string | null;         // DQ-4: human string for ranges / "—" / "priceless"
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
// 5. SECTIONS — the PAGE STRUCTURE as data. Ordered blocks the renderer paints.
//    Archetypes cover the originals; `custom` is the no-ceiling escape hatch (the model
//    writes themed HTML against --peek-* css vars; sanitize server-side before render).
//    The gift-card grid is just one block kind, so gift + invite share one shape.
//
//    DQ-3: `details` + `gallery` ADDED; `countdown` + `claim` PROMOTED to first-class
//    because they carry LIVE STATE sanitized static HTML can't (a ticking clock; a live
//    claim/RSVP count). Wild signature moves (lotería, legal decree, varsity lineup)
//    stay model-authored `custom` — we do NOT grow an archetype zoo; the model is the
//    resolver.
//
//    Each kind's expected `Section.data` shape (the renderer dispatches on `kind` and
//    reads `data` accordingly; unknown extra keys are ignored, never an error):
//      hero      : { eyebrow?: string; headline: string; dek?: string;
//                    ledger?: [string,string][]; media?: MediaSlot;
//                    accent?: { word: string; color?: 'accent'|'accent2'|string; italic?: boolean } }
//                    // headline may contain \n; `accent` colors/italicizes ONE matching word
//                    // (the rust "OLD MAN", the italic "Gala") instead of escaping to plain text
//      note      : {}  — pulls Peek.note_md (gift pages). Optional { title?, sub? } override.
//      giftgrid  : { intro?: string; layout?: 'carousel'|'grid'|'checklist';
//                    featuredCardId?: string }  // renders Card[]; layout picks the structural
//                    // treatment (default carousel). featured card spans full-width above the rest.
//      stats     : { items: {value:number|string, dec?:number, pre?:string, suf?:string,
//                    label:string}[] }  // ADDITIVE: serif-numeral count-up band (gala £1.2M/30/14)
//      lede      : { quote: string; body?: string; accentWord?: string }  // ADDITIVE: pull-quote
//      rail      : { title?: string }  — horizontal scroller over Card[] / media
//      lookbook  : { title?: string }  — editorial figure stack over Card[]
//      gallery   : { title?: string; images?: MediaSlot[] }            // DQ-3 ADDED: photo strip
//      details   : { rows: [string,string][];                          // DQ-3 ADDED: when/where/dress
//                    variant?: 'list'|'panel'; panelFill?: 'accent'|'accent2'|'surface'|string;
//                    keyColor?: 'accent'|'accent2'|string; divider?: 'solid'|'dashed';
//                    monogram?: boolean }  // 'panel' = colored fiesta-menu card (El Taquito cobalt);
//                    // monogram:false drops the forced avatar tile
//      steps     : { steps: [string,string][] }   // [ ['01','You send it'], ... ]
//      countdown : { target: ISODate; label?: string; doneText?: string }  // DQ-3 LIVE: ticking clock
//      claim     : { label?: string; capacity?: number; cta?: string }     // DQ-3 LIVE: claim/RSVP count
//      tracklist : { side?: string }   — references Card[] as a numbered list
//      courses   : { title?: string }  — menu-style list over Card[]
//      tiers     : { title?: string }  — levels/price tiers over Card[]
//      stubs     : { title?: string }  — ticket-stub line-up over Card[]
//      flightplan: { title?: string }  — dashed-line itinerary over Card[]
//      custom    : { html: string; _why?: string }  — themed markup, SANITIZED before render
// ─────────────────────────────────────────────────────────────────────────────
export type SectionKind =
  | 'hero'          // eyebrow + big headline + dek + optional hero media + optional ledger
  | 'note'          // the personal note (gift pages)
  | 'giftgrid'      // the cards (references Card[] by group/order) — the core
  | 'rail'          // horizontal scroller of cards/media
  | 'lookbook'      // editorial figure stack
  | 'gallery'       // DQ-3 ADDED: photo/moment strip
  | 'details'       // DQ-3 ADDED: when / where / dress (invites) — { rows }
  | 'stats'         // ADDITIVE: serif-numeral stat band w/ count-up (editorial spine)
  | 'lede'          // ADDITIVE: centered pull-quote + body (editorial spine)
  | 'steps'         // how it works / how it ships
  | 'countdown'     // DQ-3 PROMOTED: live ticking clock to a target date (carries live state)
  | 'claim'         // DQ-3 PROMOTED: live claim / RSVP count (carries live state)
  | 'tracklist' | 'courses' | 'tiers' | 'stubs' | 'flightplan' // invite archetypes
  | 'custom';       // model-authored themed markup. { html } sanitized before render

export interface Section {
  id: string;
  kind: SectionKind;
  title?: string;
  // free-form, kind-specific content — shapes documented per-kind above. The renderer
  // reads only the keys it knows for the kind; extra keys are ignored (forward-compat).
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
  page_type: PageType;                  // 'gift' | 'invite'
  recipient_name: string | null;
  relationship: string | null;
  occasion: string | null;

  concept: Concept;                     // the design idea as data
  theme: ThemeSpec;                     // REPLACES `vibe`
  hero: MediaSlot | null;               // was hero_image_url / hero_image_source

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
// 7. THE FULL IR — what the chat emits, the renderer reads, checkout + recipient consume.
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
// 9. MIGRATION NOTES (for the spine/DB agent)
// ─────────────────────────────────────────────────────────────────────────────
// • DB: keep `cards`, `variant_groups`, `picks` tables. On `peeks`: drop `vibe` jsonb,
//   add `concept` jsonb, `theme` jsonb, `page_type` text, `cta_label` text; change
//   `hero_image_url`/`hero_image_source` → `hero` jsonb (MediaSlot). Add `sections`
//   jsonb (or a `sections` table; JSONB is fine for v0). On `cards`: `image_url` →
//   `media` jsonb (MediaSlot); ADD `value_display` text (DQ-4).
// • The old VIBE_PRESETS become *seed ThemeSpecs* the model can start from — but the
//   model authors `theme` directly and must VARY `type.display` per concept. Presets are
//   a floor, never the ceiling. Delete the "every preset = Fraunces+Inter" default.
// • Tools the chat needs (see ir/INTERFACES.md §Tool→IR reducer): set_concept, set_theme,
//   upsert_section, set_note, the card tools (now writing MediaSlot + value_display),
//   generate_hero_image, resolve_card/scrape_url, mark_ready.
// • Validate every tool payload against the Zod mirror (./schema.ts) before persisting.
//   Never render unvalidated model output — `custom` html → sanitizeCustomHtml() first.
