/**
 * peek.gift — Generative Design Grammar (CONTRACT)
 * ================================================
 *
 * Ported from `prototypes/design-grammar-spec/grammar.ts` (the bake-off
 * winner's design language). This is the abstract design LANGUAGE for the
 * peek.gift moat: a chat-driven AI composes a bespoke page per gift that looks
 * RADICALLY different per occasion (princess 6th birthday vs Vegas bachelor
 * party vs luxe jewelry) yet is NEVER broken, ugly, or inaccessible.
 *
 * It is SUBSTRATE-AGNOSTIC. It does not import React, CSS, or any styling
 * library. It defines the *shape* of a valid look (`VibeSpec`), the *shape*
 * of a valid page (`PageComposition`), and the *rules* (`INVARIANTS`) that
 * make any conforming value legal-by-construction.
 *
 * The pipeline functions declared at the bottom of the prototype
 * (`derivePalette`, `validateVibeSpec`, `validatePageComposition`,
 * `generateAndRepair`, `SAFE_DEFAULT`) are IMPLEMENTED in `./engine.ts`. This
 * file is the contract; engine.ts is the realization.
 *
 * Reconciliation with the live 7-dial vibe (`db/schema/peeks.ts`): this grammar
 * is a strict SUPERSET. The renderer consumes the grammar's validated `Vibe`,
 * but the CSS-var emitter (`./css-vars.ts`) keeps the existing `--vibe-*` var
 * NAMES so the DB `vibe` column needs no rename. See `./bridge.ts` for the
 * 7-dial → VibeSpec adapter.
 */

/* ════════════════════════════════════════════════════════════════════════
 * 0. PRIMITIVES — the value spaces every dimension draws from
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * A color is ALWAYS stored in OKLCH (perceptual lightness/chroma/hue). This is
 * not cosmetic: contrast and harmony are checked in a perceptual space, so the
 * generator cannot emit an "accent" that is technically a valid hex but
 * perceptually invisible on the background. Hex in, OKLCH stored.
 *   l: 0..1   (perceptual lightness — the axis contrast math runs on)
 *   c: 0..0.4 (chroma; >0.37 is outside most displays' gamut → clamp)
 *   h: 0..360 (hue angle)
 */
export interface Oklch {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

/**
 * A modular scale ratio. Typographic and spatial scales are GEOMETRIC: each
 * step = previous × ratio. A single ratio (`scaleContrast`) drives how
 * dramatic the jump from body → display is.
 */
export type ScaleRatio = number; // legal: [MIN_SCALE_RATIO, MAX_SCALE_RATIO]

export const MIN_SCALE_RATIO = 1.067; // minor second — barely-there hierarchy
export const MAX_SCALE_RATIO = 1.95; // just under double — poster-loud, still legible

/* ════════════════════════════════════════════════════════════════════════
 * 1. VIBE SPEC — the dimensions that define a "look"
 * ════════════════════════════════════════════════════════════════════════ */

/* ── 1.1 Palette ────────────────────────────────────────────────────────── */

/**
 * Color ROLES, not raw colors. The renderer only ever asks for a role.
 *   bg       — page backdrop (the dominant field)
 *   surface  — raised planes: cards, sheets (sits ON bg, slightly offset)
 *   ink      — primary text/icons (MUST clear AA on bg AND surface)
 *   inkMuted — secondary text (MUST clear AA-large / 3:1 on bg AND surface)
 *   accent   — CTAs, links, the one color the eye is pulled to
 *   accent2  — secondary accent for variety; optional
 *   onAccent — text/icon color placed ON accent fills (MUST clear AA on accent)
 */
export interface Palette {
  readonly bg: Oklch;
  readonly surface: Oklch;
  readonly ink: Oklch;
  readonly inkMuted: Oklch;
  readonly accent: Oklch;
  readonly accent2?: Oklch;
  readonly onAccent: Oklch;
}

export type HarmonyStrategy =
  | 'monochrome' // single hue, varied L/C. Calm, editorial, condolence.
  | 'analogous' // hues within ~40deg. Cohesive, warm, sentimental.
  | 'complementary' // base + ~180deg accent. High-energy, bold CTAs.
  | 'split-complementary' // base + two near-complement accents. Playful.
  | 'triad'; // three hues ~120deg apart. Loud, kid-birthday, carnival.

export interface PaletteSpec {
  readonly strategy: HarmonyStrategy;
  /** 0..360 — the anchor hue the whole palette is generated from. */
  readonly baseHue: number;
  /**
   * Overall lightness key. Drives whether the page is a dark poster or a
   * cream stationery card. The validator builds bg/surface/ink L-values from
   * this so contrast is guaranteed regardless of hue.
   */
  readonly key: 'light' | 'dark' | 'dim'; // dim = mid-dark, muted (moody brand)
  /** Chroma intensity ceiling. Clamped to display gamut by the validator. */
  readonly saturation: 'muted' | 'medium' | 'vivid';
  /**
   * Fully resolved roles. The generator MAY omit this and emit only the seed
   * above; `derivePalette()` fills it. If present it is re-validated, not
   * trusted.
   */
  readonly roles?: Palette;
}

/* ── 1.2 Typography ──────────────────────────────────────────────────────── */

export type FontRole =
  | 'serif' // editorial, sentimental (Fraunces, Playfair, Cormorant)
  | 'sans' // modern, neutral, tech (Inter, Geist, Manrope)
  | 'display' // oversized poster faces (Anton, Bowlby One, Abril Fatface)
  | 'mono' // zine / receipt / dev (JetBrains Mono, IBM Plex Mono)
  | 'script'; // cursive cards/invites (Caveat, Dancing Script)

export interface TypographySpec {
  readonly displayRole: FontRole;
  readonly bodyRole: FontRole;
  /** Modular-scale ratio for the WHOLE page (type AND space derive from it). */
  readonly scaleContrast: ScaleRatio;
  /** Casing applied to display text. `upper` for posters, `none` for editorial. */
  readonly displayCase: 'none' | 'upper' | 'small-caps' | 'title';
  /** Letter-spacing intent for display. */
  readonly displayTracking: 'tight' | 'normal' | 'wide';
  /** Body line-height band. */
  readonly bodyLeading: 'tight' | 'normal' | 'loose';
}

/* ── 1.3 Spatial system ──────────────────────────────────────────────────── */

export interface SpatialSpec {
  /** Multiplies base spacing + line-height + section gaps. */
  readonly density: 'compact' | 'cozy' | 'breathable';
  /** Base spacing unit in rem. The full scale = baseUnit × ratio^n. */
  readonly baseUnitRem: number; // legal [0.5, 1.25]
  /** Side gutter on mobile. Bounded; never edge-to-edge text. */
  readonly gutter: 'edge' | 'snug' | 'roomy';
  /** Target max line length in CHARACTERS for body copy. 45 ≤ value ≤ 80. */
  readonly measureCh: number;
}

/* ── 1.4 Shape ───────────────────────────────────────────────────────────── */

export interface ShapeSpec {
  readonly radius: 'sharp' | 'soft' | 'pillowy'; // 0-4px | 8-16px | 24-40px
  /** Optional non-rectangular hero/image mask. `none` is always legal. */
  readonly imageMask: 'none' | 'rounded' | 'arch' | 'blob' | 'circle';
  /** Border treatment for surfaces. */
  readonly border: 'none' | 'hairline' | 'bold';
}

/* ── 1.5 Depth (elevation / shadow) ──────────────────────────────────────── */

export interface DepthSpec {
  readonly elevation: 'flat' | 'lifted' | 'dramatic';
}

/* ── 1.6 Texture ─────────────────────────────────────────────────────────── */

export interface TextureSpec {
  /** Film-grain opacity 0..0.06 (capped so it never muddies text). */
  readonly grain: number;
  /** Background gradient wash 0..0.15 opacity. */
  readonly wash: number;
  /** Decorative motif layer. */
  readonly motif: 'none' | 'confetti' | 'sparkle' | 'botanical' | 'geometric';
}

/* ── 1.7 Motion character ────────────────────────────────────────────────── */

export interface MotionSpec {
  readonly character: 'still' | 'soft' | 'lively';
  /** Easing personality. */
  readonly easing: 'linear' | 'crisp' | 'eased' | 'bouncy';
}

/* ── 1.8 Imagery treatment ───────────────────────────────────────────────── */

export interface ImagerySpec {
  readonly treatment:
    | 'natural' // unmodified photo
    | 'duotone' // mapped to two palette colors (editorial)
    | 'full-bleed' // edge-to-edge, no padding
    | 'framed' // inset with surface border
    | 'dim-overlay' // darkened for text legibility (moody brand)
    | 'illustrated'; // illustration register, not photo (kid)
  /** Whether text is allowed to overlay imagery (forces a legibility scrim). */
  readonly textOverImage: boolean;
}

/* ── 1.9 Mood / voice descriptors ────────────────────────────────────────── */

export interface VoiceSpec {
  readonly warmth: 'restrained' | 'measured' | 'warm' | 'effusive';
  readonly humor: 'none' | 'gentle' | 'dry' | 'sharp';
  readonly pace: 'considered' | 'natural' | 'quick';
  readonly formality: 'casual' | 'neutral' | 'formal';
  readonly emoji: 'none' | 'rare' | 'occasional' | 'playful';
  readonly vocabulary: 'slangy' | 'neutral' | 'elevated';
  readonly length: 'punchy' | 'natural' | 'fuller';
}

/** The complete look. Every renderer decision is a pure function of this. */
export interface VibeSpec {
  readonly palette: PaletteSpec;
  readonly typography: TypographySpec;
  readonly spatial: SpatialSpec;
  readonly shape: ShapeSpec;
  readonly depth: DepthSpec;
  readonly texture: TextureSpec;
  readonly motion: MotionSpec;
  readonly imagery: ImagerySpec;
  readonly moodWords: readonly string[]; // 3..6
  readonly voice: VoiceSpec;
}

/**
 * A `VibeSpec` that has passed `validateVibeSpec`. The brand prevents an
 * un-validated spec reaching the renderer at the type level. `roles` is now
 * guaranteed present and contrast-safe.
 *
 * NOTE: implemented as a structural brand (a boolean discriminant) rather than
 * the prototype's `unique symbol`, because a `unique symbol` field cannot be
 * constructed by the engine at runtime — there is no value of that type to
 * assign. The brand is non-optional so an unbranded `VibeSpec` is not
 * assignable to `Vibe`; only `engine.brandVibe` mints it.
 */
export type Vibe = VibeSpec & {
  readonly __validated: true;
  readonly palette: PaletteSpec & { readonly roles: Palette };
};

/* ════════════════════════════════════════════════════════════════════════
 * 2. SECTION ARCHETYPES — composable units driven by the VibeSpec
 * ════════════════════════════════════════════════════════════════════════ */

export type SectionType =
  | 'hero'
  | 'story' // narrative / content block (the note lives here, or context)
  | 'productSet' // the gift cards — the commercial heart
  | 'divider'
  | 'cta'
  | 'footer';

/* ── 2.1 Hero variants (≥3 required) ─────────────────────────────────────── */
export type HeroVariant =
  | 'full-bleed-image' // image edge-to-edge, title overlaid (needs scrim)
  | 'centered-type' // big type on a flat field, no/optional image (poster)
  | 'split' // image one side, type the other (editorial)
  | 'stacked-card' // image in a framed card above title (soft, kid, gift-y)
  | 'minimal-mark'; // tiny wordmark + lots of space (luxury, condolence)

/* ── 2.2 Story / content-section variants ───────────────────────────────── */
export type StoryVariant =
  | 'prose' // a paragraph / the personal note, measure-constrained
  | 'pull-quote' // the note treated as an oversized editorial quote
  | 'timeline' // ordered beats
  | 'two-up' // text + single supporting image side by side
  | 'banner'; // short punchy line, full width (party hype)

/* ── 2.3 Product-set presentations (≥4 distinct, REQUIRED) ───────────────── */
export type ProductSetVariant =
  | 'editorial-full-bleed' // one card per row, large image, magazine feel
  | 'tight-grid' // 2–3 col uniform grid, scannable, product-heavy
  | 'horizontal-scroll' // swipeable rail, great on mobile, party/playful
  | 'collage-masonry' // varied heights, scrapbook/whimsical
  | 'list' // compact rows w/ thumbnail, utilitarian (condolence help)
  | 'single-hero-product'; // ONE card, full cinematic treatment

/* ── 2.4 Divider variants ────────────────────────────────────────────────── */
export type DividerVariant =
  | 'rule' // a hairline
  | 'whitespace' // pure gap (breathable)
  | 'motif' // a decorative SVG
  | 'label'; // a tiny eyebrow label ("THE GIFTS")

/* ── 2.5 CTA variants ────────────────────────────────────────────────────── */
export type CtaVariant =
  | 'button-row' // one or two buttons, centered
  | 'banner-bar' // full-width accent bar with a button
  | 'inline-link' // quiet text link (luxury/sentimental)
  | 'sticky-bar'; // pinned bottom action (mobile checkout)

/* ── 2.6 Footer variants ─────────────────────────────────────────────────── */
export type FooterVariant = 'minimal' | 'signature' | 'branded';

export interface HeroSlots {
  readonly titleRef: string; // recipient name / occasion headline
  readonly subtitleRef?: string;
  readonly imageRef?: string; // required iff variant uses an image
}
export interface StorySlots {
  readonly bodyRef: string; // the note or context copy
  readonly imageRef?: string;
}
export interface ProductSetSlots {
  readonly cardRefs: readonly string[]; // ids of the gift cards to show
  /** Optional section heading ("The Drop", "The Kit"). */
  readonly headingRef?: string;
}
export interface CtaSlots {
  readonly labelRef: string;
  readonly secondaryLabelRef?: string;
}
export interface FooterSlots {
  readonly signatureRef?: string; // "from, the curator"
}

/**
 * Discriminated union of a section instance. `slots` are CONTENT references
 * (ids into the peek's data) — never literal styling.
 */
export type Section =
  | {
      readonly type: 'hero';
      readonly variant: HeroVariant;
      readonly slots: HeroSlots;
      readonly emphasis?: 'focal';
    }
  | {
      readonly type: 'story';
      readonly variant: StoryVariant;
      readonly slots: StorySlots;
      readonly emphasis?: 'focal';
    }
  | {
      readonly type: 'productSet';
      readonly variant: ProductSetVariant;
      readonly slots: ProductSetSlots;
      readonly emphasis?: 'focal';
    }
  | { readonly type: 'divider'; readonly variant: DividerVariant }
  | {
      readonly type: 'cta';
      readonly variant: CtaVariant;
      readonly slots: CtaSlots;
    }
  | {
      readonly type: 'footer';
      readonly variant: FooterVariant;
      readonly slots: FooterSlots;
    };

/* ════════════════════════════════════════════════════════════════════════
 * 3. COMPOSITION RULES + INVARIANTS — the "never broken" guarantee
 * ════════════════════════════════════════════════════════════════════════ */

/** An ordered page. The reveal sequence follows `sections` order. */
export interface PageComposition {
  readonly vibe: VibeSpec; // unvalidated at emit time; Vibe after validation
  readonly sections: readonly Section[];
}

/**
 * COMPOSITION AUTOMATON — legal section sequencing.
 *
 *   Page    := Hero  Body+  Footer
 *   Body    := Story | ProductSet | Cta | Divider
 *
 * Structural rules (checked in `validatePageComposition`):
 *   R1  Exactly one `hero`, and it is FIRST.
 *   R2  Exactly one `footer`, and it is LAST.
 *   R3  At least one `productSet`.
 *   R4  At least one `cta`.
 *   R5  No two `divider`s adjacent; a divider never opens or closes the Body.
 *   R6  No two `productSet`s adjacent unless separated by story/cta.
 *   R7  Exactly one section carries `emphasis:'focal'`.
 *   R8  Section count in [3, 9].
 */
export const LEGAL_NEXT: Record<SectionType, readonly SectionType[]> = {
  hero: ['story', 'productSet', 'cta', 'divider'],
  story: ['productSet', 'cta', 'divider', 'story', 'footer'],
  productSet: ['story', 'cta', 'divider', 'footer'],
  divider: ['story', 'productSet', 'cta'], // never → divider, never → footer
  cta: ['story', 'productSet', 'divider', 'footer'],
  footer: [], // terminal
};

export const PRODUCT_SET_COUNT_RULES: Record<
  ProductSetVariant,
  { readonly min: number; readonly max: number }
> = {
  'single-hero-product': { min: 1, max: 1 },
  'editorial-full-bleed': { min: 1, max: 5 },
  'tight-grid': { min: 3, max: 12 },
  'horizontal-scroll': { min: 3, max: 12 },
  'collage-masonry': { min: 4, max: 12 },
  list: { min: 2, max: 20 },
};

/**
 * LEGAL FONT PAIRINGS — the (display, body) role combos that are never ugly.
 * Anything not in this set is rejected (auto-repaired to nearest legal body).
 */
export const LEGAL_FONT_PAIRS: ReadonlyArray<readonly [FontRole, FontRole]> = [
  ['serif', 'serif'],
  ['serif', 'sans'],
  ['sans', 'sans'],
  ['sans', 'serif'],
  ['display', 'sans'],
  ['display', 'serif'],
  ['display', 'mono'],
  ['mono', 'sans'],
  ['mono', 'mono'],
  ['script', 'serif'],
  ['script', 'sans'],
];

/**
 * THE INVARIANTS — the legal-by-construction set. Every one is checkable and
 * every one is auto-repairable.
 */
export const INVARIANTS = {
  // ── Accessibility (hard; never relaxed) ──────────────────────────────
  CONTRAST_INK: 4.5,
  CONTRAST_INK_MUTED: 3.0,
  CONTRAST_ON_ACCENT: 4.5,
  CONTRAST_ACCENT_VS_BG: 3.0,
  MIN_TOUCH_TARGET_PX: 44,
  MIN_BODY_FONT_PX: 16,

  // ── Typography ────────────────────────────────────────────────────────
  SCALE_RATIO_MIN: MIN_SCALE_RATIO,
  SCALE_RATIO_MAX: MAX_SCALE_RATIO,
  MIN_DISPLAY_STEPS_ABOVE_BODY: 3,

  // ── Spatial ─────────────────────────────────────────────────────────────
  MEASURE_CH_MIN: 45,
  MEASURE_CH_MAX: 80,
  BASE_UNIT_REM_MIN: 0.5,
  BASE_UNIT_REM_MAX: 1.25,

  // ── Texture ─────────────────────────────────────────────────────────────
  GRAIN_MAX: 0.06,
  WASH_MAX: 0.15,

  // ── Palette ──────────────────────────────────────────────────────────────
  CHROMA_MAX: 0.37,

  // ── Composition ──────────────────────────────────────────────────────────
  SECTION_COUNT_MIN: 3,
  SECTION_COUNT_MAX: 9,
  MOOD_WORDS_MIN: 3,
  MOOD_WORDS_MAX: 6,
} as const;

/* ════════════════════════════════════════════════════════════════════════
 * 4. GENERATION CONTRACT — prompt → valid VibeSpec + PageComposition
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * What the MODEL emits. `paletteSeed` (strategy + hue + key + saturation),
 * NOT resolved colors — `derivePalette` builds and contrast-fixes the roles.
 */
export interface GenerationOutput {
  readonly vibe: {
    readonly paletteSeed: Pick<
      PaletteSpec,
      'strategy' | 'baseHue' | 'key' | 'saturation'
    >;
    readonly typography: TypographySpec;
    readonly spatial: SpatialSpec;
    readonly shape: ShapeSpec;
    readonly depth: DepthSpec;
    readonly texture: TextureSpec;
    readonly motion: MotionSpec;
    readonly imagery: ImagerySpec;
    readonly moodWords: readonly string[];
    readonly voice: VoiceSpec;
  };
  readonly sections: readonly Section[];
  /** Free-text rationale — logged for tuning, never rendered. */
  readonly rationale?: string;
}

/** A single failed invariant. `path` points at the offending field. */
export interface InvariantViolation {
  readonly code:
    | keyof typeof INVARIANTS
    | 'FONT_PAIR'
    | 'SEQUENCE'
    | 'CARD_COUNT'
    | 'STRUCTURE';
  readonly path: string;
  readonly message: string;
  /** True if the validator can fix it deterministically without the model. */
  readonly autoRepairable: boolean;
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly violations: readonly InvariantViolation[] };
