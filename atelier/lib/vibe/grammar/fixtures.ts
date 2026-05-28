/**
 * Proof fixtures: ONE example peek × 3 radically different vibes.
 * ==============================================================
 *
 * Used by the SSR proof (`scripts/render-vibe-proof.tsx`), the styles-test
 * route, and the gate tests. The peek is intentionally the brief's shape:
 * a hero + section "The Drop" (3 cards) + section "The Kit" (2 cards), so the
 * 3-vibe range is inspectable on the SAME content.
 *
 * The 3 vibes are authored as grammar `GenerationOutput`-style seeds — exactly
 * what the model would emit — and run through `generateAndRepair` so the proof
 * exercises the REAL validation path, not hand-tuned safe values.
 */

import type { Card, Peek, VariantGroup } from '@/db/schema';
import type { GenerationOutput, Section } from './grammar';

/* ── The example peek (DB-shaped rows) ───────────────────────────────────── */

const PEEK_ID = 'peek_proof_0001';
const GROUP_DROP = 'grp_drop';
const GROUP_KIT = 'grp_kit';

export const exampleVariantGroups: VariantGroup[] = [
  { id: GROUP_DROP, peekId: PEEK_ID, title: 'The Drop', selection: 'pick_one', position: 0 },
  { id: GROUP_KIT, peekId: PEEK_ID, title: 'The Kit', selection: 'pick_any', position: 1 },
];

function card(partial: Partial<Card> & Pick<Card, 'id' | 'title' | 'position' | 'variantGroupId'>): Card {
  return {
    peekId: PEEK_ID,
    description: null,
    imageUrl: null,
    sourceUrl: null,
    sourceRetailer: null,
    affiliateUrl: null,
    affiliateNetwork: null,
    commissionPct: null,
    valueCents: null,
    revealValue: true,
    isTaunt: false,
    tauntText: null,
    isLocked: false,
    unlockRule: {},
    proposedDate: null,
    locationHint: null,
    addedByUserId: null,
    metadata: {},
    type: 'product',
    ...partial,
  } as Card;
}

export const exampleCards: Card[] = [
  card({
    id: 'card_drop_1',
    variantGroupId: GROUP_DROP,
    position: 0,
    title: 'Aurora Table Lamp',
    description: 'Warm dimmable glow for the new place.',
    valueCents: 8800,
    tauntText: 'crowd favorite',
    isTaunt: true,
  }),
  card({
    id: 'card_drop_2',
    variantGroupId: GROUP_DROP,
    position: 1,
    title: 'Stovetop Kettle',
    description: 'Every morning, sorted.',
    valueCents: 6500,
  }),
  card({
    id: 'card_drop_3',
    variantGroupId: GROUP_DROP,
    position: 2,
    title: 'Wool Throw',
    description: 'For the couch nights.',
    valueCents: 12000,
  }),
  card({
    id: 'card_kit_1',
    variantGroupId: GROUP_KIT,
    position: 3,
    title: 'Cedar Candle',
    description: 'First-night ritual.',
    valueCents: 3400,
  }),
  card({
    id: 'card_kit_2',
    variantGroupId: GROUP_KIT,
    position: 4,
    title: 'Ceramic Mug Set',
    description: 'Two, for good company.',
    valueCents: 4200,
  }),
];

/** A DB peek row — vibe left empty; the proof supplies grammar vibes directly. */
export const examplePeek: Pick<
  Peek,
  'recipientName' | 'occasion' | 'heroImageUrl' | 'noteMd' | 'giverNames' | 'vibe'
> = {
  recipientName: 'Maya',
  occasion: 'Housewarming',
  heroImageUrl: null,
  noteMd:
    'You finally got the keys.\n\nWe chipped in so the new place feels like yours from night one — pick whatever speaks to you.',
  giverNames: ['the whole crew'],
  vibe: {},
};

/* ── The 3 radically-different vibes (model-emission shape) ───────────────── */

/** Section layout shared by all three proofs (the brief's structure). */
const PROOF_SECTIONS: Section[] = [
  {
    type: 'hero',
    variant: 'stacked-card',
    slots: { titleRef: 'title', subtitleRef: 'subtitle' },
    emphasis: 'focal',
  },
  { type: 'story', variant: 'prose', slots: { bodyRef: 'noteMd' } },
  {
    type: 'productSet',
    variant: 'tight-grid',
    slots: { cardRefs: ['card_drop_1', 'card_drop_2', 'card_drop_3'], headingRef: 'group:grp_drop' },
  },
  { type: 'divider', variant: 'label' },
  {
    type: 'productSet',
    variant: 'editorial-full-bleed',
    slots: { cardRefs: ['card_kit_1', 'card_kit_2'], headingRef: 'group:grp_kit' },
  },
  { type: 'cta', variant: 'button-row', slots: { labelRef: 'cta:primary' } },
  { type: 'footer', variant: 'signature', slots: { signatureRef: 'signature' } },
];

/** princess 6th birthday — vivid triad, pillowy, illustrated, lively. */
export const VIBE_PRINCESS: GenerationOutput = {
  vibe: {
    paletteSeed: { strategy: 'triad', baseHue: 330, key: 'light', saturation: 'vivid' },
    typography: {
      displayRole: 'script',
      bodyRole: 'sans',
      scaleContrast: 1.6,
      displayCase: 'none',
      displayTracking: 'normal',
      bodyLeading: 'normal',
    },
    spatial: { density: 'breathable', baseUnitRem: 1.1, gutter: 'roomy', measureCh: 60 },
    shape: { radius: 'pillowy', imageMask: 'rounded', border: 'none' },
    depth: { elevation: 'dramatic' },
    texture: { grain: 0, wash: 0.12, motif: 'confetti' },
    motion: { character: 'lively', easing: 'bouncy' },
    imagery: { treatment: 'illustrated', textOverImage: false },
    moodWords: ['sparkly', 'sweet', 'magical', 'playful'],
    voice: {
      warmth: 'effusive',
      humor: 'gentle',
      pace: 'quick',
      formality: 'casual',
      emoji: 'playful',
      vocabulary: 'slangy',
      length: 'punchy',
    },
  },
  sections: PROOF_SECTIONS.map((sec) =>
    sec.type === 'hero' ? { ...sec, variant: 'stacked-card' } : sec,
  ),
};

/** bachelor party — dark poster, complementary, display caps, loud. */
export const VIBE_BACHELOR: GenerationOutput = {
  vibe: {
    paletteSeed: { strategy: 'complementary', baseHue: 265, key: 'dark', saturation: 'vivid' },
    typography: {
      displayRole: 'display',
      bodyRole: 'mono',
      scaleContrast: 1.85,
      displayCase: 'upper',
      displayTracking: 'tight',
      bodyLeading: 'tight',
    },
    spatial: { density: 'compact', baseUnitRem: 0.85, gutter: 'snug', measureCh: 52 },
    shape: { radius: 'sharp', imageMask: 'none', border: 'bold' },
    depth: { elevation: 'flat' },
    texture: { grain: 0.05, wash: 0.1, motif: 'geometric' },
    motion: { character: 'lively', easing: 'crisp' },
    imagery: { treatment: 'dim-overlay', textOverImage: true },
    moodWords: ['loud', 'neon', 'unhinged', 'electric'],
    voice: {
      warmth: 'measured',
      humor: 'sharp',
      pace: 'quick',
      formality: 'casual',
      emoji: 'occasional',
      vocabulary: 'slangy',
      length: 'punchy',
    },
  },
  sections: PROOF_SECTIONS.map((sec) =>
    sec.type === 'hero'
      ? { ...sec, variant: 'centered-type' }
      : sec.type === 'productSet' && sec.slots.headingRef === 'group:grp_drop'
        ? { ...sec, variant: 'horizontal-scroll' }
        : sec,
  ),
};

/** luxe jewelry — dim mono, serif, hairline, still, editorial. */
export const VIBE_LUXE: GenerationOutput = {
  vibe: {
    paletteSeed: { strategy: 'monochrome', baseHue: 40, key: 'dim', saturation: 'muted' },
    typography: {
      displayRole: 'serif',
      bodyRole: 'serif',
      scaleContrast: 1.25,
      displayCase: 'small-caps',
      displayTracking: 'wide',
      bodyLeading: 'loose',
    },
    spatial: { density: 'breathable', baseUnitRem: 1.2, gutter: 'roomy', measureCh: 70 },
    shape: { radius: 'sharp', imageMask: 'none', border: 'hairline' },
    depth: { elevation: 'flat' },
    texture: { grain: 0.02, wash: 0, motif: 'none' },
    motion: { character: 'still', easing: 'eased' },
    imagery: { treatment: 'duotone', textOverImage: false },
    moodWords: ['refined', 'quiet', 'rare', 'considered'],
    voice: {
      warmth: 'restrained',
      humor: 'none',
      pace: 'considered',
      formality: 'formal',
      emoji: 'none',
      vocabulary: 'elevated',
      length: 'fuller',
    },
  },
  sections: PROOF_SECTIONS.map((sec) =>
    sec.type === 'hero'
      ? { ...sec, variant: 'minimal-mark' }
      : sec.type === 'productSet' && sec.slots.headingRef === 'group:grp_kit'
        ? { ...sec, variant: 'editorial-full-bleed' }
        : sec,
  ),
};

export const PROOF_VIBES = {
  princess: { label: 'Princess 6th Birthday', output: VIBE_PRINCESS },
  bachelor: { label: 'Bachelor Party', output: VIBE_BACHELOR },
  luxe: { label: 'Luxe Jewelry', output: VIBE_LUXE },
} as const;

export type ProofVibeKey = keyof typeof PROOF_VIBES;
