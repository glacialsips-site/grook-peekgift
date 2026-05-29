/**
 * Grammar Presets — DRAFT (research deliverable).
 * =================================================
 *
 * 40 vibe presets + 22-occasion taxonomy + many-to-many map + remix operators.
 * Conforms to `atelier/lib/vibe/grammar/grammar.ts` (`GenerationOutput`).
 *
 * Status: INTEGRATED (BRIEF 07). Exported from the grammar barrel
 * (`./index.ts`). Covered by `tests/unit/vibe-presets.test.ts`. Consumed by
 * `lib/curator-tools/seed.ts` (`seedVibeFromBrief`) so a preset seeds the vibe
 * BEFORE the model writes its own, and by the SSR proof fixtures.
 *
 * Authoring notes:
 *   - Every preset is shaped as `GenerationOutput` so it flows through the
 *     SAME `generateAndRepair` pipeline as model emissions. No special path.
 *   - We emit `paletteSeed` (strategy + baseHue + key + saturation), NOT
 *     resolved roles — `derivePalette` builds them and guarantees contrast.
 *   - Font pairs are all in `LEGAL_FONT_PAIRS`.
 *   - `scaleContrast` is inside [MIN_SCALE_RATIO=1.067, MAX_SCALE_RATIO=1.95].
 *   - `baseUnitRem` in [0.5, 1.25]; `measureCh` in [45, 80].
 *   - `grain` ≤ 0.06; `wash` ≤ 0.15.
 *   - Sections are intentionally LEFT OFF the preset — presets define a VIBE,
 *     not a page layout. The curator (or `pickComposition()`, future work)
 *     authors the section list per peek content.
 */

import type { GenerationOutput, Section } from './grammar';

/* ════════════════════════════════════════════════════════════════════════
 * Occasion taxonomy
 * ════════════════════════════════════════════════════════════════════════ */

export type OccasionKey =
  | 'kid-bday-littles'
  | 'kid-bday-tween'
  | 'teen-bday'
  | 'bday-adult'
  | 'milestone-bday'
  | 'bachelorette'
  | 'bachelor'
  | 'wedding'
  | 'engagement'
  | 'anniversary'
  | 'baby-shower'
  | 'baby-arrival'
  | 'graduation'
  | 'promotion-new-job'
  | 'retirement'
  | 'housewarming'
  | 'get-well'
  | 'sympathy'
  | 'divorce'
  | 'holiday-cheerful'
  | 'holiday-tender'
  | 'just-because';

export interface OccasionDescriptor {
  readonly key: OccasionKey;
  readonly label: string;
  readonly description: string;
  /** The feeling the RECIPIENT should leave with. */
  readonly recipientFeel: string;
}

export const OCCASIONS: Record<OccasionKey, OccasionDescriptor> = {
  'kid-bday-littles': {
    key: 'kid-bday-littles',
    label: "Kid's birthday (ages 1–9)",
    description: 'Princess, dinosaur, pirate, mermaid — high-magic mode.',
    recipientFeel: 'magic was made for me',
  },
  'kid-bday-tween': {
    key: 'kid-bday-tween',
    label: "Tween birthday (10–13)",
    description: 'Past kiddie, not yet teen. Sticker-and-pop energy.',
    recipientFeel: 'you actually get it',
  },
  'teen-bday': {
    key: 'teen-bday',
    label: 'Teen birthday (14–17)',
    description: 'Respected, never patronized.',
    recipientFeel: 'respected, not babied',
  },
  'bday-adult': {
    key: 'bday-adult',
    label: 'Adult birthday (18–49, no decade milestone)',
    description: 'Personal, considered, not a Hallmark card.',
    recipientFeel: 'they saw the actual me',
  },
  'milestone-bday': {
    key: 'milestone-bday',
    label: 'Milestone birthday (30/40/50/60/70/80/90/100)',
    description: 'A decade landing. Carries weight.',
    recipientFeel: 'the decade is mine',
  },
  bachelorette: {
    key: 'bachelorette',
    label: 'Bachelorette / hen night',
    description: 'Last weekend of unmarried mayhem.',
    recipientFeel: 'we are unhinged together',
  },
  bachelor: {
    key: 'bachelor',
    label: 'Bachelor / stag night',
    description: 'Last weekend of unmarried mayhem (AMAB).',
    recipientFeel: 'this is going to be stupid',
  },
  wedding: {
    key: 'wedding',
    label: 'Wedding day',
    description: 'The big one. Witnessed, formal-but-warm.',
    recipientFeel: 'witnessed and celebrated',
  },
  engagement: {
    key: 'engagement',
    label: 'Engagement',
    description: 'The ring just happened.',
    recipientFeel: 'this is real now',
  },
  anniversary: {
    key: 'anniversary',
    label: 'Anniversary',
    description: 'From 1st (paper) to 50th (gold). Tone scales with year.',
    recipientFeel: 'still',
  },
  'baby-shower': {
    key: 'baby-shower',
    label: 'Baby shower',
    description: 'Pre-arrival celebration.',
    recipientFeel: 'we already love them',
  },
  'baby-arrival': {
    key: 'baby-arrival',
    label: 'Baby arrival',
    description: 'The day they got here.',
    recipientFeel: 'welcome, small one',
  },
  graduation: {
    key: 'graduation',
    label: 'Graduation',
    description: 'High school, college, grad school.',
    recipientFeel: 'what you did is large',
  },
  'promotion-new-job': {
    key: 'promotion-new-job',
    label: 'Promotion / new job',
    description: 'Career milestone.',
    recipientFeel: 'you earned this',
  },
  retirement: {
    key: 'retirement',
    label: 'Retirement',
    description: 'End of a career.',
    recipientFeel: 'the work mattered',
  },
  housewarming: {
    key: 'housewarming',
    label: 'Housewarming',
    description: 'New place, first night, mug-and-throw energy.',
    recipientFeel: 'this is yours',
  },
  'get-well': {
    key: 'get-well',
    label: 'Get-well / recovery',
    description: 'Sick day, surgery, recovery.',
    recipientFeel: 'we are here, no pressure',
  },
  sympathy: {
    key: 'sympathy',
    label: 'Sympathy / bereavement',
    description: 'Loss. Stillness. No motif, no confetti.',
    recipientFeel: 'we have you',
  },
  divorce: {
    key: 'divorce',
    label: 'Divorce celebration',
    description: 'Yes, really. The next chapter is yours.',
    recipientFeel: 'the next chapter is yours',
  },
  'holiday-cheerful': {
    key: 'holiday-cheerful',
    label: 'Cheerful holiday (Christmas, Hanukkah, Diwali, Lunar NY)',
    description: 'Family / friend gathering season.',
    recipientFeel: 'season together',
  },
  'holiday-tender': {
    key: 'holiday-tender',
    label: "Tender holiday (Mother's, Father's, Valentine)",
    description: 'Intimate, person-specific.',
    recipientFeel: 'I see you specifically',
  },
  'just-because': {
    key: 'just-because',
    label: 'Just because',
    description: 'No occasion. Pure expression.',
    recipientFeel: 'you crossed my mind',
  },
};

/* ════════════════════════════════════════════════════════════════════════
 * Vibe presets — 40 distinct looks
 * ════════════════════════════════════════════════════════════════════════ */

export type VibeFamily =
  | 'editorial-quiet'
  | 'playful-bright'
  | 'bold-loud'
  | 'romantic-sentimental'
  | 'cozy-domestic'
  | 'brutalist-contemporary'
  | 'cosmic-cinematic';

export type VibeKey =
  // editorial-quiet (8)
  | 'paper-letter'
  | 'velvet-rope'
  | 'chalk-line'
  | 'museum-label'
  | 'slow-craft'
  | 'studio-mono'
  | 'silver-print'
  | 'linen-warm'
  // playful-bright (8)
  | 'confetti-pop'
  | 'birthday-balloon'
  | 'taffy-pull'
  | 'ice-cream-truck'
  | 'crayon-box'
  | 'gummy-bear'
  | 'mermaid-pearl'
  | 'flag-stand'
  // bold-loud (8)
  | 'neon-club'
  | 'concert-poster'
  | 'vegas-blur'
  | 'miami-vice'
  | 'racing-stripe'
  | 'zine-punk'
  | 'sticker-pack'
  | 'arcade-cabinet'
  // romantic-sentimental (6)
  | 'garden-letter'
  | 'dusk-poem'
  | 'velvet-night'
  | 'lace-window'
  | 'field-flowers'
  | 'paper-airplane'
  // cozy-domestic (4)
  | 'cottage-warm'
  | 'kitchen-table'
  | 'cabin-stack'
  | 'quilt-square'
  // brutalist-contemporary (3)
  | 'soft-brutalist'
  | 'concrete-poet'
  | 'wireframe'
  // cosmic-cinematic (3)
  | 'stargazer'
  | 'cinema-noir'
  | 'aurora-bloom';

export interface VibePreset {
  readonly key: VibeKey;
  readonly label: string;
  /** 1-sentence vibe DNA. */
  readonly dna: string;
  readonly family: VibeFamily;
  /** Authored as model-emission shape. Will pass through `generateAndRepair`. */
  readonly output: GenerationOutput;
}

/** Convenience builder so the 40-entry table stays readable. */
function preset(
  key: VibeKey,
  label: string,
  family: VibeFamily,
  dna: string,
  vibe: GenerationOutput['vibe'],
): VibePreset {
  return { key, label, family, dna, output: { vibe, sections: [] as Section[] } };
}

export const VIBE_PRESETS: Record<VibeKey, VibePreset> = {
  /* ── editorial-quiet ─────────────────────────────────────────────── */
  'paper-letter': preset(
    'paper-letter',
    'Paper Letter',
    'editorial-quiet',
    'Cream serif, hairline rules, a wedding invitation laid on linen.',
    {
      paletteSeed: { strategy: 'monochrome', baseHue: 35, key: 'light', saturation: 'muted' },
      typography: { displayRole: 'serif', bodyRole: 'serif', scaleContrast: 1.25, displayCase: 'small-caps', displayTracking: 'wide', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.15, gutter: 'roomy', measureCh: 68 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'hairline' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.015, wash: 0, motif: 'none' },
      motion: { character: 'still', easing: 'eased' },
      imagery: { treatment: 'framed', textOverImage: false },
      moodWords: ['considered', 'formal', 'graceful', 'quiet'],
      voice: { warmth: 'measured', humor: 'none', pace: 'considered', formality: 'formal', emoji: 'none', vocabulary: 'elevated', length: 'fuller' },
    },
  ),
  'velvet-rope': preset(
    'velvet-rope',
    'Velvet Rope',
    'editorial-quiet',
    'Dark monochrome serif with ochre accent. WSJ magazine after dark.',
    {
      paletteSeed: { strategy: 'monochrome', baseHue: 35, key: 'dark', saturation: 'muted' },
      typography: { displayRole: 'serif', bodyRole: 'serif', scaleContrast: 1.4, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.15, gutter: 'roomy', measureCh: 70 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'hairline' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.025, wash: 0.04, motif: 'none' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'duotone', textOverImage: false },
      moodWords: ['refined', 'considered', 'rich', 'still'],
      voice: { warmth: 'measured', humor: 'dry', pace: 'considered', formality: 'formal', emoji: 'none', vocabulary: 'elevated', length: 'fuller' },
    },
  ),
  'chalk-line': preset(
    'chalk-line',
    'Chalk Line',
    'editorial-quiet',
    'Dim warm gray, oversized serif, no motif. The memorial spine.',
    {
      paletteSeed: { strategy: 'monochrome', baseHue: 25, key: 'dim', saturation: 'muted' },
      typography: { displayRole: 'serif', bodyRole: 'serif', scaleContrast: 1.6, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.2, gutter: 'roomy', measureCh: 65 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'hairline' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.02, wash: 0, motif: 'none' },
      motion: { character: 'still', easing: 'eased' },
      imagery: { treatment: 'duotone', textOverImage: false },
      moodWords: ['solemn', 'still', 'tender', 'spare'],
      voice: { warmth: 'warm', humor: 'none', pace: 'considered', formality: 'formal', emoji: 'none', vocabulary: 'elevated', length: 'natural' },
    },
  ),
  'museum-label': preset(
    'museum-label',
    'Museum Label',
    'editorial-quiet',
    'White, tiny mono caps, max whitespace. Luxury jewelry box.',
    {
      paletteSeed: { strategy: 'monochrome', baseHue: 0, key: 'light', saturation: 'muted' },
      typography: { displayRole: 'mono', bodyRole: 'mono', scaleContrast: 1.18, displayCase: 'upper', displayTracking: 'wide', bodyLeading: 'normal' },
      spatial: { density: 'breathable', baseUnitRem: 1.25, gutter: 'roomy', measureCh: 60 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'hairline' },
      depth: { elevation: 'flat' },
      texture: { grain: 0, wash: 0, motif: 'none' },
      motion: { character: 'still', easing: 'linear' },
      imagery: { treatment: 'framed', textOverImage: false },
      moodWords: ['rare', 'precise', 'quiet', 'archival'],
      voice: { warmth: 'restrained', humor: 'none', pace: 'considered', formality: 'formal', emoji: 'none', vocabulary: 'elevated', length: 'punchy' },
    },
  ),
  'slow-craft': preset(
    'slow-craft',
    'Slow Craft',
    'editorial-quiet',
    'Cream and sage, breathable, botanical. The pottery studio.',
    {
      paletteSeed: { strategy: 'analogous', baseHue: 120, key: 'light', saturation: 'muted' },
      typography: { displayRole: 'serif', bodyRole: 'sans', scaleContrast: 1.35, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.1, gutter: 'roomy', measureCh: 68 },
      shape: { radius: 'soft', imageMask: 'rounded', border: 'hairline' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0.03, wash: 0.06, motif: 'botanical' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'natural', textOverImage: false },
      moodWords: ['considered', 'handmade', 'warm', 'grounded'],
      voice: { warmth: 'warm', humor: 'gentle', pace: 'considered', formality: 'neutral', emoji: 'rare', vocabulary: 'neutral', length: 'natural' },
    },
  ),
  'studio-mono': preset(
    'studio-mono',
    'Studio Mono',
    'editorial-quiet',
    'Off-white, single ochre hue, refined. Architect monograph.',
    {
      paletteSeed: { strategy: 'monochrome', baseHue: 38, key: 'light', saturation: 'muted' },
      typography: { displayRole: 'sans', bodyRole: 'sans', scaleContrast: 1.5, displayCase: 'none', displayTracking: 'tight', bodyLeading: 'normal' },
      spatial: { density: 'cozy', baseUnitRem: 1.0, gutter: 'roomy', measureCh: 64 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'hairline' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.01, wash: 0, motif: 'none' },
      motion: { character: 'still', easing: 'crisp' },
      imagery: { treatment: 'framed', textOverImage: false },
      moodWords: ['precise', 'modern', 'composed', 'considered'],
      voice: { warmth: 'measured', humor: 'dry', pace: 'natural', formality: 'neutral', emoji: 'none', vocabulary: 'elevated', length: 'natural' },
    },
  ),
  'silver-print': preset(
    'silver-print',
    'Silver Print',
    'editorial-quiet',
    'Dim gray duotone, serif, still. Black-and-white documentary.',
    {
      paletteSeed: { strategy: 'monochrome', baseHue: 210, key: 'dim', saturation: 'muted' },
      typography: { displayRole: 'serif', bodyRole: 'serif', scaleContrast: 1.35, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'normal' },
      spatial: { density: 'breathable', baseUnitRem: 1.1, gutter: 'roomy', measureCh: 65 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'hairline' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.04, wash: 0, motif: 'none' },
      motion: { character: 'still', easing: 'eased' },
      imagery: { treatment: 'duotone', textOverImage: false },
      moodWords: ['archival', 'still', 'considered', 'documentary'],
      voice: { warmth: 'measured', humor: 'none', pace: 'considered', formality: 'formal', emoji: 'none', vocabulary: 'elevated', length: 'fuller' },
    },
  ),
  'linen-warm': preset(
    'linen-warm',
    'Linen Warm',
    'editorial-quiet',
    'Cream and dusty rose, serif over sans. Bridal-shower-that-isn\'t-twee.',
    {
      paletteSeed: { strategy: 'analogous', baseHue: 15, key: 'light', saturation: 'muted' },
      typography: { displayRole: 'serif', bodyRole: 'sans', scaleContrast: 1.4, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.1, gutter: 'roomy', measureCh: 66 },
      shape: { radius: 'soft', imageMask: 'rounded', border: 'hairline' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0.02, wash: 0.05, motif: 'none' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'framed', textOverImage: false },
      moodWords: ['warm', 'graceful', 'soft', 'considered'],
      voice: { warmth: 'warm', humor: 'gentle', pace: 'natural', formality: 'neutral', emoji: 'rare', vocabulary: 'elevated', length: 'natural' },
    },
  ),

  /* ── playful-bright ──────────────────────────────────────────────── */
  'confetti-pop': preset(
    'confetti-pop',
    'Confetti Pop',
    'playful-bright',
    'Vivid triad pink/teal/amber, script display, confetti everywhere.',
    {
      paletteSeed: { strategy: 'triad', baseHue: 330, key: 'light', saturation: 'vivid' },
      typography: { displayRole: 'script', bodyRole: 'sans', scaleContrast: 1.55, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'normal' },
      spatial: { density: 'breathable', baseUnitRem: 1.1, gutter: 'roomy', measureCh: 58 },
      shape: { radius: 'pillowy', imageMask: 'rounded', border: 'none' },
      depth: { elevation: 'dramatic' },
      texture: { grain: 0, wash: 0.12, motif: 'confetti' },
      motion: { character: 'lively', easing: 'bouncy' },
      imagery: { treatment: 'illustrated', textOverImage: false },
      moodWords: ['sparkly', 'sweet', 'magical', 'playful'],
      voice: { warmth: 'effusive', humor: 'gentle', pace: 'quick', formality: 'casual', emoji: 'playful', vocabulary: 'slangy', length: 'punchy' },
    },
  ),
  'birthday-balloon': preset(
    'birthday-balloon',
    'Birthday Balloon',
    'playful-bright',
    'Warm analogous yellow/orange/red, display caps, sparkle motif.',
    {
      paletteSeed: { strategy: 'analogous', baseHue: 45, key: 'light', saturation: 'vivid' },
      typography: { displayRole: 'display', bodyRole: 'sans', scaleContrast: 1.7, displayCase: 'upper', displayTracking: 'tight', bodyLeading: 'normal' },
      spatial: { density: 'cozy', baseUnitRem: 1.0, gutter: 'roomy', measureCh: 55 },
      shape: { radius: 'soft', imageMask: 'circle', border: 'bold' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0, wash: 0.1, motif: 'sparkle' },
      motion: { character: 'lively', easing: 'bouncy' },
      imagery: { treatment: 'framed', textOverImage: false },
      moodWords: ['bright', 'celebratory', 'cheerful', 'sunny'],
      voice: { warmth: 'effusive', humor: 'gentle', pace: 'quick', formality: 'casual', emoji: 'playful', vocabulary: 'slangy', length: 'punchy' },
    },
  ),
  'taffy-pull': preset(
    'taffy-pull',
    'Taffy Pull',
    'playful-bright',
    'Pastel triad, pillowy curves, script + sans, soft motion.',
    {
      paletteSeed: { strategy: 'triad', baseHue: 305, key: 'light', saturation: 'medium' },
      typography: { displayRole: 'script', bodyRole: 'sans', scaleContrast: 1.45, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.05, gutter: 'roomy', measureCh: 56 },
      shape: { radius: 'pillowy', imageMask: 'blob', border: 'none' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0, wash: 0.1, motif: 'sparkle' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'illustrated', textOverImage: false },
      moodWords: ['soft', 'sweet', 'sugary', 'tender'],
      voice: { warmth: 'effusive', humor: 'gentle', pace: 'natural', formality: 'casual', emoji: 'occasional', vocabulary: 'slangy', length: 'punchy' },
    },
  ),
  'ice-cream-truck': preset(
    'ice-cream-truck',
    'Ice Cream Truck',
    'playful-bright',
    'Split-comp mint/strawberry, display, lively, summer-coded.',
    {
      paletteSeed: { strategy: 'split-complementary', baseHue: 160, key: 'light', saturation: 'vivid' },
      typography: { displayRole: 'display', bodyRole: 'sans', scaleContrast: 1.65, displayCase: 'upper', displayTracking: 'normal', bodyLeading: 'normal' },
      spatial: { density: 'cozy', baseUnitRem: 1.0, gutter: 'snug', measureCh: 56 },
      shape: { radius: 'pillowy', imageMask: 'rounded', border: 'bold' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0, wash: 0.08, motif: 'confetti' },
      motion: { character: 'lively', easing: 'bouncy' },
      imagery: { treatment: 'illustrated', textOverImage: false },
      moodWords: ['bright', 'sweet', 'summer', 'fun'],
      voice: { warmth: 'warm', humor: 'gentle', pace: 'quick', formality: 'casual', emoji: 'playful', vocabulary: 'slangy', length: 'punchy' },
    },
  ),
  'crayon-box': preset(
    'crayon-box',
    'Crayon Box',
    'playful-bright',
    'Primary triad red/yellow/blue, display, geometric, kid-loud.',
    {
      paletteSeed: { strategy: 'triad', baseHue: 0, key: 'light', saturation: 'vivid' },
      typography: { displayRole: 'display', bodyRole: 'sans', scaleContrast: 1.8, displayCase: 'upper', displayTracking: 'tight', bodyLeading: 'tight' },
      spatial: { density: 'cozy', baseUnitRem: 0.95, gutter: 'snug', measureCh: 52 },
      shape: { radius: 'sharp', imageMask: 'rounded', border: 'bold' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.02, wash: 0.1, motif: 'geometric' },
      motion: { character: 'lively', easing: 'bouncy' },
      imagery: { treatment: 'illustrated', textOverImage: false },
      moodWords: ['primary', 'loud', 'wild', 'kid'],
      voice: { warmth: 'effusive', humor: 'gentle', pace: 'quick', formality: 'casual', emoji: 'playful', vocabulary: 'slangy', length: 'punchy' },
    },
  ),
  'gummy-bear': preset(
    'gummy-bear',
    'Gummy Bear',
    'playful-bright',
    'Pastel split-comp, pillowy, illustrated. Baby-arrival cheerful.',
    {
      paletteSeed: { strategy: 'split-complementary', baseHue: 200, key: 'light', saturation: 'medium' },
      typography: { displayRole: 'display', bodyRole: 'sans', scaleContrast: 1.4, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.05, gutter: 'roomy', measureCh: 56 },
      shape: { radius: 'pillowy', imageMask: 'blob', border: 'none' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0, wash: 0.08, motif: 'sparkle' },
      motion: { character: 'soft', easing: 'bouncy' },
      imagery: { treatment: 'illustrated', textOverImage: false },
      moodWords: ['sweet', 'soft', 'new', 'tender'],
      voice: { warmth: 'effusive', humor: 'gentle', pace: 'natural', formality: 'casual', emoji: 'occasional', vocabulary: 'slangy', length: 'punchy' },
    },
  ),
  'mermaid-pearl': preset(
    'mermaid-pearl',
    'Mermaid Pearl',
    'playful-bright',
    'Analogous aqua to coral, soft, sparkle. Mermaid / princess.',
    {
      paletteSeed: { strategy: 'analogous', baseHue: 190, key: 'light', saturation: 'vivid' },
      typography: { displayRole: 'script', bodyRole: 'serif', scaleContrast: 1.5, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.1, gutter: 'roomy', measureCh: 58 },
      shape: { radius: 'pillowy', imageMask: 'blob', border: 'none' },
      depth: { elevation: 'dramatic' },
      texture: { grain: 0, wash: 0.12, motif: 'sparkle' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'illustrated', textOverImage: false },
      moodWords: ['magical', 'iridescent', 'dreamy', 'soft'],
      voice: { warmth: 'effusive', humor: 'gentle', pace: 'natural', formality: 'casual', emoji: 'playful', vocabulary: 'slangy', length: 'punchy' },
    },
  ),
  'flag-stand': preset(
    'flag-stand',
    'Flag Stand',
    'playful-bright',
    'Primary triad sharper, mono body, geometric. Graduation HS energy.',
    {
      paletteSeed: { strategy: 'triad', baseHue: 220, key: 'light', saturation: 'vivid' },
      typography: { displayRole: 'display', bodyRole: 'mono', scaleContrast: 1.75, displayCase: 'upper', displayTracking: 'tight', bodyLeading: 'normal' },
      spatial: { density: 'cozy', baseUnitRem: 0.95, gutter: 'snug', measureCh: 54 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'bold' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.02, wash: 0.06, motif: 'geometric' },
      motion: { character: 'lively', easing: 'crisp' },
      imagery: { treatment: 'framed', textOverImage: true },
      moodWords: ['proud', 'crisp', 'official', 'energetic'],
      voice: { warmth: 'warm', humor: 'gentle', pace: 'quick', formality: 'casual', emoji: 'occasional', vocabulary: 'slangy', length: 'punchy' },
    },
  ),

  /* ── bold-loud ───────────────────────────────────────────────────── */
  'neon-club': preset(
    'neon-club',
    'Neon Club',
    'bold-loud',
    'Dark complementary purple/cyan, display upper, geometric, lively.',
    {
      paletteSeed: { strategy: 'complementary', baseHue: 265, key: 'dark', saturation: 'vivid' },
      typography: { displayRole: 'mono', bodyRole: 'mono', scaleContrast: 1.9, displayCase: 'upper', displayTracking: 'tight', bodyLeading: 'tight' },
      spatial: { density: 'compact', baseUnitRem: 0.85, gutter: 'snug', measureCh: 50 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'bold' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.05, wash: 0.12, motif: 'geometric' },
      motion: { character: 'lively', easing: 'crisp' },
      imagery: { treatment: 'dim-overlay', textOverImage: true },
      moodWords: ['loud', 'neon', 'unhinged', 'electric'],
      voice: { warmth: 'measured', humor: 'sharp', pace: 'quick', formality: 'casual', emoji: 'occasional', vocabulary: 'slangy', length: 'punchy' },
    },
  ),
  'concert-poster': preset(
    'concert-poster',
    'Concert Poster',
    'bold-loud',
    'Vivid analogous orange/red on black, oversized display, geometric.',
    {
      paletteSeed: { strategy: 'analogous', baseHue: 15, key: 'dark', saturation: 'vivid' },
      typography: { displayRole: 'display', bodyRole: 'sans', scaleContrast: 1.95, displayCase: 'upper', displayTracking: 'tight', bodyLeading: 'tight' },
      spatial: { density: 'compact', baseUnitRem: 0.85, gutter: 'snug', measureCh: 50 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'bold' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.05, wash: 0.1, motif: 'geometric' },
      motion: { character: 'lively', easing: 'crisp' },
      imagery: { treatment: 'dim-overlay', textOverImage: true },
      moodWords: ['loud', 'hot', 'riotous', 'amped'],
      voice: { warmth: 'warm', humor: 'sharp', pace: 'quick', formality: 'casual', emoji: 'occasional', vocabulary: 'slangy', length: 'punchy' },
    },
  ),
  'vegas-blur': preset(
    'vegas-blur',
    'Vegas Blur',
    'bold-loud',
    'Dim split-comp gold/magenta, display, sparkle, lively.',
    {
      paletteSeed: { strategy: 'split-complementary', baseHue: 45, key: 'dim', saturation: 'vivid' },
      typography: { displayRole: 'display', bodyRole: 'sans', scaleContrast: 1.85, displayCase: 'upper', displayTracking: 'normal', bodyLeading: 'tight' },
      spatial: { density: 'compact', baseUnitRem: 0.9, gutter: 'snug', measureCh: 52 },
      shape: { radius: 'soft', imageMask: 'none', border: 'bold' },
      depth: { elevation: 'dramatic' },
      texture: { grain: 0.04, wash: 0.12, motif: 'sparkle' },
      motion: { character: 'lively', easing: 'bouncy' },
      imagery: { treatment: 'dim-overlay', textOverImage: true },
      moodWords: ['glam', 'loud', 'reckless', 'gilded'],
      voice: { warmth: 'effusive', humor: 'sharp', pace: 'quick', formality: 'casual', emoji: 'playful', vocabulary: 'slangy', length: 'punchy' },
    },
  ),
  'miami-vice': preset(
    'miami-vice',
    'Miami Vice',
    'bold-loud',
    'Vivid complementary teal/coral, display, soft, sunset-coded.',
    {
      paletteSeed: { strategy: 'complementary', baseHue: 180, key: 'dim', saturation: 'vivid' },
      typography: { displayRole: 'display', bodyRole: 'sans', scaleContrast: 1.7, displayCase: 'upper', displayTracking: 'wide', bodyLeading: 'normal' },
      spatial: { density: 'cozy', baseUnitRem: 0.95, gutter: 'snug', measureCh: 54 },
      shape: { radius: 'soft', imageMask: 'rounded', border: 'none' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0.03, wash: 0.13, motif: 'geometric' },
      motion: { character: 'lively', easing: 'bouncy' },
      imagery: { treatment: 'duotone', textOverImage: true },
      moodWords: ['neon', 'palm', 'sunset', 'glossy'],
      voice: { warmth: 'warm', humor: 'sharp', pace: 'quick', formality: 'casual', emoji: 'occasional', vocabulary: 'slangy', length: 'punchy' },
    },
  ),
  'racing-stripe': preset(
    'racing-stripe',
    'Racing Stripe',
    'bold-loud',
    'Black and safety-yellow, mono+display, geometric. Motorsport.',
    {
      paletteSeed: { strategy: 'complementary', baseHue: 55, key: 'dark', saturation: 'vivid' },
      typography: { displayRole: 'display', bodyRole: 'mono', scaleContrast: 1.85, displayCase: 'upper', displayTracking: 'tight', bodyLeading: 'tight' },
      spatial: { density: 'compact', baseUnitRem: 0.85, gutter: 'snug', measureCh: 50 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'bold' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.04, wash: 0.05, motif: 'geometric' },
      motion: { character: 'lively', easing: 'crisp' },
      imagery: { treatment: 'dim-overlay', textOverImage: true },
      moodWords: ['fast', 'mechanical', 'precise', 'amped'],
      voice: { warmth: 'measured', humor: 'sharp', pace: 'quick', formality: 'casual', emoji: 'rare', vocabulary: 'slangy', length: 'punchy' },
    },
  ),
  'zine-punk': preset(
    'zine-punk',
    'Zine Punk',
    'bold-loud',
    'Light high-saturation, mono+display, max grain, no motif. Indie show.',
    {
      paletteSeed: { strategy: 'complementary', baseHue: 320, key: 'light', saturation: 'vivid' },
      typography: { displayRole: 'mono', bodyRole: 'mono', scaleContrast: 1.6, displayCase: 'upper', displayTracking: 'tight', bodyLeading: 'tight' },
      spatial: { density: 'compact', baseUnitRem: 0.8, gutter: 'snug', measureCh: 50 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'bold' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.06, wash: 0, motif: 'none' },
      motion: { character: 'lively', easing: 'crisp' },
      imagery: { treatment: 'duotone', textOverImage: true },
      moodWords: ['raw', 'xeroxed', 'loud', 'wired'],
      voice: { warmth: 'measured', humor: 'sharp', pace: 'quick', formality: 'casual', emoji: 'rare', vocabulary: 'slangy', length: 'punchy' },
    },
  ),
  'sticker-pack': preset(
    'sticker-pack',
    'Sticker Pack',
    'bold-loud',
    'Vivid triad, script and sans, confetti, lively. Stadium tour.',
    {
      paletteSeed: { strategy: 'triad', baseHue: 280, key: 'light', saturation: 'vivid' },
      typography: { displayRole: 'script', bodyRole: 'sans', scaleContrast: 1.55, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'normal' },
      spatial: { density: 'cozy', baseUnitRem: 1.0, gutter: 'snug', measureCh: 55 },
      shape: { radius: 'pillowy', imageMask: 'rounded', border: 'bold' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0.02, wash: 0.1, motif: 'confetti' },
      motion: { character: 'lively', easing: 'bouncy' },
      imagery: { treatment: 'framed', textOverImage: false },
      moodWords: ['fun', 'collectible', 'loud', 'cute'],
      voice: { warmth: 'effusive', humor: 'gentle', pace: 'quick', formality: 'casual', emoji: 'playful', vocabulary: 'slangy', length: 'punchy' },
    },
  ),
  'arcade-cabinet': preset(
    'arcade-cabinet',
    'Arcade Cabinet',
    'bold-loud',
    'Dark vivid triad green/magenta/yellow, mono+display upper. Gamer.',
    {
      paletteSeed: { strategy: 'triad', baseHue: 135, key: 'dark', saturation: 'vivid' },
      typography: { displayRole: 'display', bodyRole: 'mono', scaleContrast: 1.85, displayCase: 'upper', displayTracking: 'tight', bodyLeading: 'tight' },
      spatial: { density: 'compact', baseUnitRem: 0.85, gutter: 'snug', measureCh: 50 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'bold' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.05, wash: 0.1, motif: 'geometric' },
      motion: { character: 'lively', easing: 'crisp' },
      imagery: { treatment: 'dim-overlay', textOverImage: true },
      moodWords: ['8-bit', 'neon', 'mechanical', 'playable'],
      voice: { warmth: 'measured', humor: 'sharp', pace: 'quick', formality: 'casual', emoji: 'occasional', vocabulary: 'slangy', length: 'punchy' },
    },
  ),

  /* ── romantic-sentimental ────────────────────────────────────────── */
  'garden-letter': preset(
    'garden-letter',
    'Garden Letter',
    'romantic-sentimental',
    'Light analogous rose/sage, serif, botanical, breathable.',
    {
      paletteSeed: { strategy: 'analogous', baseHue: 350, key: 'light', saturation: 'medium' },
      typography: { displayRole: 'serif', bodyRole: 'serif', scaleContrast: 1.4, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.1, gutter: 'roomy', measureCh: 65 },
      shape: { radius: 'soft', imageMask: 'arch', border: 'hairline' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0.02, wash: 0.06, motif: 'botanical' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'framed', textOverImage: false },
      moodWords: ['tender', 'warm', 'romantic', 'graceful'],
      voice: { warmth: 'warm', humor: 'gentle', pace: 'considered', formality: 'neutral', emoji: 'rare', vocabulary: 'elevated', length: 'natural' },
    },
  ),
  'dusk-poem': preset(
    'dusk-poem',
    'Dusk Poem',
    'romantic-sentimental',
    'Dim analogous plum to peach, serif, soft, considered.',
    {
      paletteSeed: { strategy: 'analogous', baseHue: 310, key: 'dim', saturation: 'medium' },
      typography: { displayRole: 'serif', bodyRole: 'serif', scaleContrast: 1.45, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.15, gutter: 'roomy', measureCh: 62 },
      shape: { radius: 'soft', imageMask: 'arch', border: 'hairline' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.025, wash: 0.08, motif: 'botanical' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'duotone', textOverImage: false },
      moodWords: ['dusky', 'romantic', 'still', 'wine-dark'],
      voice: { warmth: 'warm', humor: 'gentle', pace: 'considered', formality: 'neutral', emoji: 'rare', vocabulary: 'elevated', length: 'fuller' },
    },
  ),
  'velvet-night': preset(
    'velvet-night',
    'Velvet Night',
    'romantic-sentimental',
    'Dark monochrome wine, serif/serif, hairline. 25th anniversary.',
    {
      paletteSeed: { strategy: 'monochrome', baseHue: 350, key: 'dark', saturation: 'medium' },
      typography: { displayRole: 'serif', bodyRole: 'serif', scaleContrast: 1.45, displayCase: 'small-caps', displayTracking: 'wide', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.15, gutter: 'roomy', measureCh: 65 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'hairline' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.025, wash: 0.06, motif: 'none' },
      motion: { character: 'still', easing: 'eased' },
      imagery: { treatment: 'duotone', textOverImage: false },
      moodWords: ['rich', 'lasting', 'considered', 'wine'],
      voice: { warmth: 'warm', humor: 'dry', pace: 'considered', formality: 'formal', emoji: 'none', vocabulary: 'elevated', length: 'fuller' },
    },
  ),
  'lace-window': preset(
    'lace-window',
    'Lace Window',
    'romantic-sentimental',
    'Cream and warm gold, script+serif, botanical, soft. Bridal shower.',
    {
      paletteSeed: { strategy: 'analogous', baseHue: 40, key: 'light', saturation: 'medium' },
      typography: { displayRole: 'script', bodyRole: 'serif', scaleContrast: 1.4, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.1, gutter: 'roomy', measureCh: 62 },
      shape: { radius: 'soft', imageMask: 'arch', border: 'hairline' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0.02, wash: 0.07, motif: 'botanical' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'framed', textOverImage: false },
      moodWords: ['graceful', 'tender', 'gilded', 'soft'],
      voice: { warmth: 'effusive', humor: 'gentle', pace: 'natural', formality: 'neutral', emoji: 'rare', vocabulary: 'elevated', length: 'natural' },
    },
  ),
  'field-flowers': preset(
    'field-flowers',
    'Field Flowers',
    'romantic-sentimental',
    'Light analogous yellow/sage, sans+serif, botanical, friendly.',
    {
      paletteSeed: { strategy: 'analogous', baseHue: 80, key: 'light', saturation: 'medium' },
      typography: { displayRole: 'sans', bodyRole: 'serif', scaleContrast: 1.5, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'normal' },
      spatial: { density: 'breathable', baseUnitRem: 1.05, gutter: 'roomy', measureCh: 62 },
      shape: { radius: 'soft', imageMask: 'rounded', border: 'hairline' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0.02, wash: 0.05, motif: 'botanical' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'natural', textOverImage: false },
      moodWords: ['sunny', 'warm', 'wild', 'tender'],
      voice: { warmth: 'warm', humor: 'gentle', pace: 'natural', formality: 'casual', emoji: 'occasional', vocabulary: 'neutral', length: 'natural' },
    },
  ),
  'paper-airplane': preset(
    'paper-airplane',
    'Paper Airplane',
    'romantic-sentimental',
    'Cream and sky-blue, sans+sans, soft, breathable. Tender Valentine.',
    {
      paletteSeed: { strategy: 'analogous', baseHue: 215, key: 'light', saturation: 'medium' },
      typography: { displayRole: 'sans', bodyRole: 'sans', scaleContrast: 1.5, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.1, gutter: 'roomy', measureCh: 60 },
      shape: { radius: 'soft', imageMask: 'rounded', border: 'hairline' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0.015, wash: 0.06, motif: 'none' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'framed', textOverImage: false },
      moodWords: ['soft', 'tender', 'clear', 'kind'],
      voice: { warmth: 'warm', humor: 'gentle', pace: 'natural', formality: 'neutral', emoji: 'rare', vocabulary: 'neutral', length: 'natural' },
    },
  ),

  /* ── cozy-domestic ───────────────────────────────────────────────── */
  'cottage-warm': preset(
    'cottage-warm',
    'Cottage Warm',
    'cozy-domestic',
    'Cream and terracotta, serif+sans, botanical. Housewarming.',
    {
      paletteSeed: { strategy: 'analogous', baseHue: 25, key: 'light', saturation: 'medium' },
      typography: { displayRole: 'serif', bodyRole: 'sans', scaleContrast: 1.4, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'normal' },
      spatial: { density: 'cozy', baseUnitRem: 1.0, gutter: 'roomy', measureCh: 62 },
      shape: { radius: 'soft', imageMask: 'rounded', border: 'hairline' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0.025, wash: 0.05, motif: 'botanical' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'natural', textOverImage: false },
      moodWords: ['warm', 'cozy', 'lived-in', 'kind'],
      voice: { warmth: 'warm', humor: 'gentle', pace: 'natural', formality: 'casual', emoji: 'occasional', vocabulary: 'neutral', length: 'natural' },
    },
  ),
  'kitchen-table': preset(
    'kitchen-table',
    'Kitchen Table',
    'cozy-domestic',
    'Warm-white and olive, sans+serif, no motif. Get-well.',
    {
      paletteSeed: { strategy: 'analogous', baseHue: 90, key: 'light', saturation: 'muted' },
      typography: { displayRole: 'sans', bodyRole: 'serif', scaleContrast: 1.35, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'normal' },
      spatial: { density: 'cozy', baseUnitRem: 1.0, gutter: 'roomy', measureCh: 60 },
      shape: { radius: 'soft', imageMask: 'rounded', border: 'hairline' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0.02, wash: 0.04, motif: 'none' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'natural', textOverImage: false },
      moodWords: ['warm', 'gentle', 'present', 'quiet'],
      voice: { warmth: 'warm', humor: 'gentle', pace: 'natural', formality: 'casual', emoji: 'rare', vocabulary: 'neutral', length: 'natural' },
    },
  ),
  'cabin-stack': preset(
    'cabin-stack',
    'Cabin Stack',
    'cozy-domestic',
    'Dim warm brown, serif, lifted depth. Retirement / lake house.',
    {
      paletteSeed: { strategy: 'monochrome', baseHue: 22, key: 'dim', saturation: 'medium' },
      typography: { displayRole: 'serif', bodyRole: 'serif', scaleContrast: 1.45, displayCase: 'small-caps', displayTracking: 'normal', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.1, gutter: 'roomy', measureCh: 64 },
      shape: { radius: 'soft', imageMask: 'rounded', border: 'hairline' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0.03, wash: 0.06, motif: 'none' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'duotone', textOverImage: false },
      moodWords: ['warm', 'earned', 'lived-in', 'considered'],
      voice: { warmth: 'warm', humor: 'dry', pace: 'considered', formality: 'neutral', emoji: 'rare', vocabulary: 'neutral', length: 'fuller' },
    },
  ),
  'quilt-square': preset(
    'quilt-square',
    'Quilt Square',
    'cozy-domestic',
    'Cream and faded primaries, sans+serif, geometric. Family holiday.',
    {
      paletteSeed: { strategy: 'triad', baseHue: 10, key: 'light', saturation: 'medium' },
      typography: { displayRole: 'sans', bodyRole: 'serif', scaleContrast: 1.45, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'normal' },
      spatial: { density: 'cozy', baseUnitRem: 1.0, gutter: 'roomy', measureCh: 60 },
      shape: { radius: 'soft', imageMask: 'rounded', border: 'bold' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0.025, wash: 0.06, motif: 'geometric' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'framed', textOverImage: false },
      moodWords: ['warm', 'gathered', 'patchwork', 'familiar'],
      voice: { warmth: 'warm', humor: 'gentle', pace: 'natural', formality: 'casual', emoji: 'occasional', vocabulary: 'neutral', length: 'natural' },
    },
  ),

  /* ── brutalist-contemporary ──────────────────────────────────────── */
  'soft-brutalist': preset(
    'soft-brutalist',
    'Soft Brutalist',
    'brutalist-contemporary',
    'Light gray monochrome, display+mono, sharp, flat, geometric.',
    {
      paletteSeed: { strategy: 'monochrome', baseHue: 240, key: 'light', saturation: 'muted' },
      typography: { displayRole: 'display', bodyRole: 'mono', scaleContrast: 1.85, displayCase: 'upper', displayTracking: 'tight', bodyLeading: 'tight' },
      spatial: { density: 'compact', baseUnitRem: 0.85, gutter: 'snug', measureCh: 56 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'bold' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.015, wash: 0, motif: 'geometric' },
      motion: { character: 'still', easing: 'crisp' },
      imagery: { treatment: 'framed', textOverImage: false },
      moodWords: ['raw', 'precise', 'modernist', 'austere'],
      voice: { warmth: 'measured', humor: 'dry', pace: 'natural', formality: 'neutral', emoji: 'none', vocabulary: 'elevated', length: 'punchy' },
    },
  ),
  'concrete-poet': preset(
    'concrete-poet',
    'Concrete Poet',
    'brutalist-contemporary',
    'Dim concrete gray, display+mono, brutal scale-contrast.',
    {
      paletteSeed: { strategy: 'monochrome', baseHue: 220, key: 'dim', saturation: 'muted' },
      typography: { displayRole: 'display', bodyRole: 'mono', scaleContrast: 1.95, displayCase: 'upper', displayTracking: 'tight', bodyLeading: 'tight' },
      spatial: { density: 'compact', baseUnitRem: 0.85, gutter: 'snug', measureCh: 55 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'bold' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.04, wash: 0, motif: 'geometric' },
      motion: { character: 'still', easing: 'crisp' },
      imagery: { treatment: 'dim-overlay', textOverImage: true },
      moodWords: ['stark', 'monumental', 'precise', 'cold'],
      voice: { warmth: 'restrained', humor: 'dry', pace: 'considered', formality: 'formal', emoji: 'none', vocabulary: 'elevated', length: 'punchy' },
    },
  ),
  wireframe: preset(
    'wireframe',
    'Wireframe',
    'brutalist-contemporary',
    'White and black ink only, mono+mono, geometric grid. Dev wedding.',
    {
      paletteSeed: { strategy: 'monochrome', baseHue: 0, key: 'light', saturation: 'muted' },
      typography: { displayRole: 'mono', bodyRole: 'mono', scaleContrast: 1.4, displayCase: 'upper', displayTracking: 'tight', bodyLeading: 'normal' },
      spatial: { density: 'cozy', baseUnitRem: 0.95, gutter: 'snug', measureCh: 58 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'hairline' },
      depth: { elevation: 'flat' },
      texture: { grain: 0, wash: 0, motif: 'geometric' },
      motion: { character: 'still', easing: 'linear' },
      imagery: { treatment: 'framed', textOverImage: false },
      moodWords: ['schematic', 'precise', 'minimal', 'modern'],
      voice: { warmth: 'measured', humor: 'dry', pace: 'natural', formality: 'neutral', emoji: 'none', vocabulary: 'elevated', length: 'punchy' },
    },
  ),

  /* ── cosmic-cinematic ────────────────────────────────────────────── */
  stargazer: preset(
    'stargazer',
    'Stargazer',
    'cosmic-cinematic',
    'Dark navy with silver, serif+sans, sparkle motif, considered.',
    {
      paletteSeed: { strategy: 'monochrome', baseHue: 230, key: 'dark', saturation: 'medium' },
      typography: { displayRole: 'serif', bodyRole: 'sans', scaleContrast: 1.55, displayCase: 'small-caps', displayTracking: 'wide', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.1, gutter: 'roomy', measureCh: 64 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'hairline' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.025, wash: 0.07, motif: 'sparkle' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'duotone', textOverImage: false },
      moodWords: ['cosmic', 'considered', 'still', 'silvered'],
      voice: { warmth: 'measured', humor: 'gentle', pace: 'considered', formality: 'formal', emoji: 'rare', vocabulary: 'elevated', length: 'fuller' },
    },
  ),
  'cinema-noir': preset(
    'cinema-noir',
    'Cinema Noir',
    'cosmic-cinematic',
    'Dark monochrome charcoal, display+serif, dim-overlay imagery.',
    {
      paletteSeed: { strategy: 'monochrome', baseHue: 245, key: 'dark', saturation: 'muted' },
      typography: { displayRole: 'display', bodyRole: 'serif', scaleContrast: 1.85, displayCase: 'upper', displayTracking: 'wide', bodyLeading: 'normal' },
      spatial: { density: 'cozy', baseUnitRem: 1.0, gutter: 'roomy', measureCh: 60 },
      shape: { radius: 'sharp', imageMask: 'none', border: 'hairline' },
      depth: { elevation: 'flat' },
      texture: { grain: 0.05, wash: 0.05, motif: 'none' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'dim-overlay', textOverImage: true },
      moodWords: ['cinematic', 'moody', 'considered', 'shadowed'],
      voice: { warmth: 'measured', humor: 'dry', pace: 'considered', formality: 'neutral', emoji: 'none', vocabulary: 'elevated', length: 'fuller' },
    },
  ),
  'aurora-bloom': preset(
    'aurora-bloom',
    'Aurora Bloom',
    'cosmic-cinematic',
    'Dim teal monochrome, sans+sans, soft wash, lively motion.',
    {
      paletteSeed: { strategy: 'monochrome', baseHue: 175, key: 'dim', saturation: 'medium' },
      typography: { displayRole: 'sans', bodyRole: 'sans', scaleContrast: 1.55, displayCase: 'none', displayTracking: 'normal', bodyLeading: 'loose' },
      spatial: { density: 'breathable', baseUnitRem: 1.1, gutter: 'roomy', measureCh: 60 },
      shape: { radius: 'soft', imageMask: 'blob', border: 'none' },
      depth: { elevation: 'dramatic' },
      texture: { grain: 0.02, wash: 0.13, motif: 'sparkle' },
      motion: { character: 'lively', easing: 'eased' },
      imagery: { treatment: 'duotone', textOverImage: false },
      moodWords: ['glowing', 'soft', 'cosmic', 'tender'],
      voice: { warmth: 'warm', humor: 'gentle', pace: 'natural', formality: 'neutral', emoji: 'rare', vocabulary: 'neutral', length: 'natural' },
    },
  ),
};

/* ════════════════════════════════════════════════════════════════════════
 * Occasion → vibe map (ranked: default first, edgier last)
 * ════════════════════════════════════════════════════════════════════════ */

export const OCCASION_VIBES: Record<OccasionKey, readonly VibeKey[]> = {
  'kid-bday-littles': ['confetti-pop', 'taffy-pull', 'mermaid-pearl', 'crayon-box'],
  'kid-bday-tween': ['ice-cream-truck', 'sticker-pack', 'arcade-cabinet', 'zine-punk'],
  'teen-bday': ['sticker-pack', 'arcade-cabinet', 'zine-punk', 'racing-stripe'],
  'bday-adult': ['garden-letter', 'velvet-rope', 'cinema-noir', 'concrete-poet'],
  'milestone-bday': ['velvet-rope', 'stargazer', 'velvet-night', 'concert-poster'],
  bachelorette: ['miami-vice', 'confetti-pop', 'vegas-blur', 'zine-punk'],
  bachelor: ['neon-club', 'racing-stripe', 'vegas-blur', 'arcade-cabinet'],
  wedding: ['paper-letter', 'lace-window', 'velvet-night', 'wireframe'],
  engagement: ['dusk-poem', 'garden-letter', 'velvet-night', 'aurora-bloom'],
  anniversary: ['garden-letter', 'velvet-night', 'dusk-poem', 'cinema-noir'],
  'baby-shower': ['taffy-pull', 'gummy-bear', 'paper-airplane', 'aurora-bloom'],
  'baby-arrival': ['gummy-bear', 'aurora-bloom', 'taffy-pull', 'paper-airplane'],
  graduation: ['flag-stand', 'concert-poster', 'confetti-pop', 'zine-punk'],
  'promotion-new-job': ['studio-mono', 'velvet-rope', 'concrete-poet', 'racing-stripe'],
  retirement: ['cabin-stack', 'velvet-rope', 'chalk-line', 'silver-print'],
  housewarming: ['cottage-warm', 'slow-craft', 'cabin-stack', 'concrete-poet'],
  'get-well': ['kitchen-table', 'field-flowers', 'paper-airplane', 'slow-craft'],
  sympathy: ['chalk-line', 'silver-print', 'museum-label', 'paper-letter'],
  divorce: ['velvet-rope', 'vegas-blur', 'concert-poster', 'zine-punk'],
  'holiday-cheerful': ['quilt-square', 'confetti-pop', 'cabin-stack', 'crayon-box'],
  'holiday-tender': ['paper-airplane', 'field-flowers', 'garden-letter', 'dusk-poem'],
  'just-because': ['field-flowers', 'paper-airplane', 'kitchen-table', 'zine-punk'],
};

/* ════════════════════════════════════════════════════════════════════════
 * Selector — pick a preset for an occasion at a given edginess
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * Pick a preset for an occasion.
 *   edginess 0 = default (rank 0)
 *   edginess 1 = safe alternative (rank 1)
 *   edginess 2 = edgier (rank 2)
 *   edginess 3 = wildcard (rank 3, if present)
 *
 * Out-of-range edginess clamps to the last entry. Returns the preset; the
 * caller can then call `remix()` to push further.
 */
export function pickPreset(
  occasion: OccasionKey,
  edginess: 0 | 1 | 2 | 3 = 0,
): VibePreset {
  const ranked = OCCASION_VIBES[occasion];
  const idx = Math.min(edginess, ranked.length - 1);
  // OCCASION_VIBES entries are non-empty by construction; the `paper-letter`
  // fallback only exists to keep the indexer total under noUncheckedIndexedAccess.
  const key = ranked[idx] ?? 'paper-letter';
  return VIBE_PRESETS[key];
}

/* ════════════════════════════════════════════════════════════════════════
 * Remix operators — pure shifts within the grammar
 * ════════════════════════════════════════════════════════════════════════ */

export type RemixAxis =
  | '+saturation'
  | '+contrast'
  | '+texture'
  | '-texture'
  | '+motion'
  | '+shape'
  | '+depth'
  | '-voice'
  | 'flip-key'
  | 'weird-pair'
  | { readonly axis: 'shift-hue'; readonly degrees: number };

const SAT_NEXT: Record<'muted' | 'medium' | 'vivid', 'muted' | 'medium' | 'vivid'> = {
  muted: 'medium',
  medium: 'vivid',
  vivid: 'vivid',
};
const DENS_NEXT: Record<'compact' | 'cozy' | 'breathable', 'compact' | 'cozy' | 'breathable'> = {
  compact: 'cozy',
  cozy: 'breathable',
  breathable: 'breathable',
};
const MOTION_NEXT: Record<'still' | 'soft' | 'lively', 'still' | 'soft' | 'lively'> = {
  still: 'soft',
  soft: 'lively',
  lively: 'lively',
};
const RADIUS_NEXT: Record<'sharp' | 'soft' | 'pillowy', 'sharp' | 'soft' | 'pillowy'> = {
  sharp: 'soft',
  soft: 'pillowy',
  pillowy: 'pillowy',
};
const DEPTH_NEXT: Record<'flat' | 'lifted' | 'dramatic', 'flat' | 'lifted' | 'dramatic'> = {
  flat: 'lifted',
  lifted: 'dramatic',
  dramatic: 'dramatic',
};
const MOTIF_NEXT: Record<
  'none' | 'confetti' | 'sparkle' | 'botanical' | 'geometric',
  'none' | 'confetti' | 'sparkle' | 'botanical' | 'geometric'
> = {
  none: 'geometric',
  geometric: 'sparkle',
  sparkle: 'confetti',
  confetti: 'confetti',
  botanical: 'botanical',
};
/** Inverse of MOTIF_NEXT: step decoration DOWN toward `none` (the `-texture` floor). */
const MOTIF_PREV: Record<
  'none' | 'confetti' | 'sparkle' | 'botanical' | 'geometric',
  'none' | 'confetti' | 'sparkle' | 'botanical' | 'geometric'
> = {
  confetti: 'sparkle',
  sparkle: 'geometric',
  geometric: 'none',
  botanical: 'none',
  none: 'none',
};
const KEY_FLIP: Record<'light' | 'dim' | 'dark', 'light' | 'dim' | 'dark'> = {
  light: 'dark',
  dark: 'light',
  dim: 'dim',
};
const FORM_LOOSEN: Record<'casual' | 'neutral' | 'formal', 'casual' | 'neutral' | 'formal'> = {
  formal: 'neutral',
  neutral: 'casual',
  casual: 'casual',
};
const HUMOR_LOOSEN: Record<
  'none' | 'gentle' | 'dry' | 'sharp',
  'none' | 'gentle' | 'dry' | 'sharp'
> = {
  none: 'dry',
  gentle: 'dry',
  dry: 'sharp',
  sharp: 'sharp',
};
const DISPLAY_WEIRDEN: Record<
  'serif' | 'sans' | 'display' | 'mono' | 'script',
  'serif' | 'sans' | 'display' | 'mono' | 'script'
> = {
  serif: 'display',
  sans: 'display',
  display: 'mono',
  mono: 'script',
  script: 'script',
};

const MAX_SCALE = 1.95; // ceiling for the +contrast remix (mirrors MAX_SCALE_RATIO)

/** Apply a single remix axis. Pure; output is still a `GenerationOutput`. */
export function remix(input: GenerationOutput, axis: RemixAxis): GenerationOutput {
  const v = input.vibe;
  if (typeof axis === 'object') {
    if (axis.axis === 'shift-hue') {
      const next = ((v.paletteSeed.baseHue + axis.degrees) % 360 + 360) % 360;
      return {
        ...input,
        vibe: { ...v, paletteSeed: { ...v.paletteSeed, baseHue: next } },
      };
    }
    return input;
  }

  switch (axis) {
    case '+saturation':
      return {
        ...input,
        vibe: {
          ...v,
          paletteSeed: { ...v.paletteSeed, saturation: SAT_NEXT[v.paletteSeed.saturation] },
        },
      };
    case '+contrast': {
      const next = Math.min(MAX_SCALE, v.typography.scaleContrast + 0.15);
      return {
        ...input,
        vibe: { ...v, typography: { ...v.typography, scaleContrast: next } },
      };
    }
    case '+texture': {
      const grain = Math.min(0.06, v.texture.grain + 0.02);
      const wash = Math.min(0.15, v.texture.wash + 0.05);
      const motif = MOTIF_NEXT[v.texture.motif];
      return { ...input, vibe: { ...v, texture: { grain, wash, motif } } };
    }
    case '-texture': {
      // De-escalation ("make it minimal"): strip decoration toward the floor.
      const grain = Math.max(0, v.texture.grain - 0.02);
      const wash = Math.max(0, v.texture.wash - 0.05);
      const motif = MOTIF_PREV[v.texture.motif];
      return { ...input, vibe: { ...v, texture: { grain, wash, motif } } };
    }
    case '+motion':
      return {
        ...input,
        vibe: {
          ...v,
          motion: {
            character: MOTION_NEXT[v.motion.character],
            easing: v.motion.easing === 'eased' ? 'bouncy' : v.motion.easing,
          },
        },
      };
    case '+shape':
      return {
        ...input,
        vibe: {
          ...v,
          shape: { ...v.shape, radius: RADIUS_NEXT[v.shape.radius] },
          spatial: { ...v.spatial, density: DENS_NEXT[v.spatial.density] },
        },
      };
    case '+depth':
      return {
        ...input,
        vibe: { ...v, depth: { elevation: DEPTH_NEXT[v.depth.elevation] } },
      };
    case '-voice':
      return {
        ...input,
        vibe: {
          ...v,
          voice: {
            ...v.voice,
            formality: FORM_LOOSEN[v.voice.formality],
            humor: HUMOR_LOOSEN[v.voice.humor],
          },
        },
      };
    case 'flip-key':
      return {
        ...input,
        vibe: { ...v, paletteSeed: { ...v.paletteSeed, key: KEY_FLIP[v.paletteSeed.key] } },
      };
    case 'weird-pair': {
      const nextDisplay = DISPLAY_WEIRDEN[v.typography.displayRole];
      // Defensive: if shift would break LEGAL_FONT_PAIRS the engine's
      // validator will auto-repair (font pair → SAFE_DEFAULT body). We don't
      // hand-check here to keep the operator simple.
      return {
        ...input,
        vibe: { ...v, typography: { ...v.typography, displayRole: nextDisplay } },
      };
    }
    default:
      return input;
  }
}

/** Apply multiple remix axes left-to-right. Useful for "+motion +saturation". */
export function remixAll(
  input: GenerationOutput,
  axes: readonly RemixAxis[],
): GenerationOutput {
  return axes.reduce((acc, ax) => remix(acc, ax), input);
}

/* ════════════════════════════════════════════════════════════════════════
 * Brief-signal → remix axis mapping
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * Curator helper: given a brief like "make it crazier and louder", emit the
 * list of remix axes to apply. Conservative: unknown words are ignored.
 */
const SIGNAL_AXES: ReadonlyArray<readonly [RegExp, RemixAxis]> = [
  [/\b(wild|crazy|crazier|insane|unhinged|chaotic|bold|bolder|boldest)\b/i, '+saturation'],
  [/\b(loud|louder|big|bigger|huge|massive)\b/i, '+contrast'],
  [/\b(textured|rich|messy|grungy|gritty)\b/i, '+texture'],
  [/\b(minimal|minimalist|cleaner|simpler|spare|stripped|quieter|pared)\b/i, '-texture'],
  [/\b(lively|bouncy|alive|energetic|kinetic)\b/i, '+motion'],
  [/\b(soft|softer|round|rounder|pillowy)\b/i, '+shape'],
  [/\b(deeper|elevated|lifted|dramatic)\b/i, '+depth'],
  [/\b(casual|loose|chill|punchier|funnier)\b/i, '-voice'],
  [/\b(dark|moody|night|nocturnal)\b/i, 'flip-key'],
  [/\b(weird|weirder|odd|strange|unusual|different)\b/i, 'weird-pair'],
];

export function axesFromBrief(brief: string): readonly RemixAxis[] {
  const axes: RemixAxis[] = [];
  for (const [re, ax] of SIGNAL_AXES) {
    if (re.test(brief)) axes.push(ax);
  }
  return axes;
}
