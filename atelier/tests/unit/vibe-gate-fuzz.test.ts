/**
 * ADVERSARIAL FUZZ — the Zod/validation gate is the ONLY runtime safety
 * (STACK-LOCK guardrail #1). This batch throws illegible, oversized, malformed,
 * and hostile vibes at the gate and asserts NO contrast / scale / overflow /
 * texture violation escapes to the renderer.
 *
 * The contract under test: after `validateVibeSpec` (or `generateAndRepair`),
 * the resulting `Vibe.palette.roles` is ALWAYS WCAG-legal and every numeric
 * dial is inside its invariant band — regardless of what garbage went in.
 */

import { describe, expect, it } from 'vitest';
import {
  INVARIANTS,
  LEGAL_FONT_PAIRS,
  MAX_SCALE_RATIO,
  MIN_SCALE_RATIO,
  contrastRatio,
  generateAndRepair,
  validateVibeSpec,
  type FontRole,
  type GenerationOutput,
  type Vibe,
  type VibeSpec,
} from '@/lib/vibe/grammar';

/** Assert every accessibility + numeric invariant holds on a validated vibe. */
function assertVibeLegal(vibe: Vibe) {
  const p = vibe.palette.roles;

  // ── Contrast (the never-broken core) ──────────────────────────────────
  expect(contrastRatio(p.ink, p.bg), 'ink vs bg').toBeGreaterThanOrEqual(
    INVARIANTS.CONTRAST_INK - 0.01,
  );
  expect(contrastRatio(p.ink, p.surface), 'ink vs surface').toBeGreaterThanOrEqual(
    INVARIANTS.CONTRAST_INK - 0.01,
  );
  expect(contrastRatio(p.inkMuted, p.bg), 'inkMuted vs bg').toBeGreaterThanOrEqual(
    INVARIANTS.CONTRAST_INK_MUTED - 0.01,
  );
  expect(contrastRatio(p.inkMuted, p.surface), 'inkMuted vs surface').toBeGreaterThanOrEqual(
    INVARIANTS.CONTRAST_INK_MUTED - 0.01,
  );
  expect(contrastRatio(p.onAccent, p.accent), 'onAccent vs accent').toBeGreaterThanOrEqual(
    INVARIANTS.CONTRAST_ON_ACCENT - 0.01,
  );
  expect(contrastRatio(p.accent, p.bg), 'accent vs bg').toBeGreaterThanOrEqual(
    INVARIANTS.CONTRAST_ACCENT_VS_BG - 0.01,
  );

  // ── Chroma gamut ───────────────────────────────────────────────────────
  for (const [name, role] of Object.entries(p)) {
    if (role && typeof role === 'object' && 'c' in role) {
      expect(role.c, `${name} chroma`).toBeLessThanOrEqual(INVARIANTS.CHROMA_MAX + 1e-9);
    }
  }

  // ── Typography ─────────────────────────────────────────────────────────
  expect(vibe.typography.scaleContrast).toBeGreaterThanOrEqual(MIN_SCALE_RATIO);
  expect(vibe.typography.scaleContrast).toBeLessThanOrEqual(MAX_SCALE_RATIO);
  const pairLegal = LEGAL_FONT_PAIRS.some(
    ([d, b]) => d === vibe.typography.displayRole && b === vibe.typography.bodyRole,
  );
  expect(pairLegal, `font pair ${vibe.typography.displayRole}/${vibe.typography.bodyRole}`).toBe(true);

  // ── Spatial ─────────────────────────────────────────────────────────────
  expect(vibe.spatial.baseUnitRem).toBeGreaterThanOrEqual(INVARIANTS.BASE_UNIT_REM_MIN);
  expect(vibe.spatial.baseUnitRem).toBeLessThanOrEqual(INVARIANTS.BASE_UNIT_REM_MAX);
  expect(vibe.spatial.measureCh).toBeGreaterThanOrEqual(INVARIANTS.MEASURE_CH_MIN);
  expect(vibe.spatial.measureCh).toBeLessThanOrEqual(INVARIANTS.MEASURE_CH_MAX);

  // ── Texture caps ─────────────────────────────────────────────────────────
  expect(vibe.texture.grain).toBeGreaterThanOrEqual(0);
  expect(vibe.texture.grain).toBeLessThanOrEqual(INVARIANTS.GRAIN_MAX);
  expect(vibe.texture.wash).toBeGreaterThanOrEqual(0);
  expect(vibe.texture.wash).toBeLessThanOrEqual(INVARIANTS.WASH_MAX);

  // ── moodWords count ──────────────────────────────────────────────────────
  expect(vibe.moodWords.length).toBeGreaterThanOrEqual(INVARIANTS.MOOD_WORDS_MIN);
  expect(vibe.moodWords.length).toBeLessThanOrEqual(INVARIANTS.MOOD_WORDS_MAX);

  // ── Brand present ────────────────────────────────────────────────────────
  expect(vibe.__validated).toBe(true);
}

/* ── PRNG for deterministic fuzz ──────────────────────────────────────────── */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HARMONIES = ['monochrome', 'analogous', 'complementary', 'split-complementary', 'triad'] as const;
const KEYS = ['light', 'dark', 'dim'] as const;
const SATS = ['muted', 'medium', 'vivid'] as const;
const FONT_ROLES: FontRole[] = ['serif', 'sans', 'display', 'mono', 'script'];

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

/** A fully-random (often illegal) VibeSpec. */
function randomSpec(rng: () => number): VibeSpec {
  // include hostile numeric values: negatives, NaN, huge, sub-legible.
  const hostileNum = () => {
    const r = rng();
    if (r < 0.15) return Number.NaN;
    if (r < 0.3) return -50 + rng() * 100;
    if (r < 0.45) return rng() * 10000;
    return rng() * 3;
  };
  return {
    palette: {
      strategy: pick(rng, HARMONIES),
      baseHue: rng() < 0.2 ? rng() * 5000 - 1000 : rng() * 360,
      key: pick(rng, KEYS),
      saturation: pick(rng, SATS),
    },
    typography: {
      displayRole: pick(rng, FONT_ROLES),
      bodyRole: pick(rng, FONT_ROLES),
      scaleContrast: hostileNum(),
      displayCase: pick(rng, ['none', 'upper', 'small-caps', 'title'] as const),
      displayTracking: pick(rng, ['tight', 'normal', 'wide'] as const),
      bodyLeading: pick(rng, ['tight', 'normal', 'loose'] as const),
    },
    spatial: {
      density: pick(rng, ['compact', 'cozy', 'breathable'] as const),
      baseUnitRem: hostileNum(),
      gutter: pick(rng, ['edge', 'snug', 'roomy'] as const),
      measureCh: rng() < 0.3 ? rng() * 400 - 100 : 40 + rng() * 60,
    },
    shape: {
      radius: pick(rng, ['sharp', 'soft', 'pillowy'] as const),
      imageMask: pick(rng, ['none', 'rounded', 'arch', 'blob', 'circle'] as const),
      border: pick(rng, ['none', 'hairline', 'bold'] as const),
    },
    depth: { elevation: pick(rng, ['flat', 'lifted', 'dramatic'] as const) },
    texture: {
      grain: rng() < 0.4 ? rng() * 5 - 1 : rng() * 0.06,
      wash: rng() < 0.4 ? rng() * 5 - 1 : rng() * 0.15,
      motif: pick(rng, ['none', 'confetti', 'sparkle', 'botanical', 'geometric'] as const),
    },
    motion: {
      character: pick(rng, ['still', 'soft', 'lively'] as const),
      easing: pick(rng, ['linear', 'crisp', 'eased', 'bouncy'] as const),
    },
    imagery: {
      treatment: pick(rng, ['natural', 'duotone', 'full-bleed', 'framed', 'dim-overlay', 'illustrated'] as const),
      textOverImage: rng() < 0.5,
    },
    moodWords: Array.from({ length: Math.floor(rng() * 12) }, (_, i) => (rng() < 0.2 ? '' : `w${i}`)),
    voice: {
      warmth: pick(rng, ['restrained', 'measured', 'warm', 'effusive'] as const),
      humor: pick(rng, ['none', 'gentle', 'dry', 'sharp'] as const),
      pace: pick(rng, ['considered', 'natural', 'quick'] as const),
      formality: pick(rng, ['casual', 'neutral', 'formal'] as const),
      emoji: pick(rng, ['none', 'rare', 'occasional', 'playful'] as const),
      vocabulary: pick(rng, ['slangy', 'neutral', 'elevated'] as const),
      length: pick(rng, ['punchy', 'natural', 'fuller'] as const),
    },
  };
}

describe('vibe gate — adversarial fuzz', () => {
  it('1000 random hostile VibeSpecs all validate to LEGAL vibes', () => {
    const rng = mulberry32(0xc0ffee);
    for (let i = 0; i < 1000; i++) {
      const spec = randomSpec(rng);
      const { vibe } = validateVibeSpec(spec);
      assertVibeLegal(vibe);
    }
  });

  it('every (display,body) font-role combo resolves to a LEGAL pair', () => {
    for (const display of FONT_ROLES) {
      for (const body of FONT_ROLES) {
        const base = randomSpec(mulberry32(1));
        const { vibe } = validateVibeSpec({
          ...base,
          typography: { ...base.typography, displayRole: display, bodyRole: body, scaleContrast: 1.4 },
        });
        const legal = LEGAL_FONT_PAIRS.some(
          ([d, b]) => d === vibe.typography.displayRole && b === vibe.typography.bodyRole,
        );
        expect(legal, `${display}/${body} → ${vibe.typography.displayRole}/${vibe.typography.bodyRole}`).toBe(true);
      }
    }
  });

  it('illegible palettes (ink==bg, accent invisible) get repaired to legible', () => {
    // Force the worst case via seeds the deriver must rescue.
    const seeds = [
      { strategy: 'monochrome', baseHue: 0, key: 'light', saturation: 'muted' },
      { strategy: 'monochrome', baseHue: 0, key: 'dark', saturation: 'muted' },
      { strategy: 'triad', baseHue: 60, key: 'light', saturation: 'vivid' }, // yellow on light
      { strategy: 'complementary', baseHue: 200, key: 'dim', saturation: 'vivid' },
    ] as const;
    for (const seed of seeds) {
      const base = randomSpec(mulberry32(7));
      const { vibe } = validateVibeSpec({ ...base, palette: seed });
      assertVibeLegal(vibe);
    }
  });

  it('oversized scale + sub-legible body are clamped into the legal band', () => {
    const base = randomSpec(mulberry32(99));
    for (const scale of [0.1, 0.5, 1.0, 3, 50, -5, Number.NaN, Infinity]) {
      const { vibe } = validateVibeSpec({
        ...base,
        typography: { ...base.typography, scaleContrast: scale },
      });
      expect(vibe.typography.scaleContrast).toBeGreaterThanOrEqual(MIN_SCALE_RATIO);
      expect(vibe.typography.scaleContrast).toBeLessThanOrEqual(MAX_SCALE_RATIO);
    }
  });

  it('generateAndRepair never hard-fails: malformed JSON → SAFE_DEFAULT vibe', () => {
    const garbage: unknown[] = [
      null,
      undefined,
      {},
      { vibe: 'not an object' },
      { vibe: { paletteSeed: { strategy: 'bogus' } }, sections: 'nope' },
      42,
      [],
      { vibe: { paletteSeed: { strategy: 'triad', baseHue: 1, key: 'light', saturation: 'vivid' } } }, // missing fields
    ];
    for (const g of garbage) {
      const res = generateAndRepair(g, 3);
      // The vibe is ALWAYS a legal Vibe (SAFE_DEFAULT or repaired).
      assertVibeLegal(res.vibe);
      // A repairPrompt is surfaced for the model when shape is wrong.
      if (!res.page.ok) {
        expect(typeof res.repairPrompt === 'string' || res.usedSafeDefaultVibe).toBeTruthy();
      }
    }
  });

  it('well-formed output with an illegal product-set presentation gets count-repaired', () => {
    const validVibe = {
      paletteSeed: { strategy: 'analogous', baseHue: 200, key: 'light', saturation: 'medium' },
      typography: {
        displayRole: 'serif', bodyRole: 'sans', scaleContrast: 1.4,
        displayCase: 'none', displayTracking: 'normal', bodyLeading: 'normal',
      },
      spatial: { density: 'cozy', baseUnitRem: 1, gutter: 'roomy', measureCh: 66 },
      shape: { radius: 'soft', imageMask: 'none', border: 'hairline' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0.02, wash: 0.04, motif: 'none' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'framed', textOverImage: false },
      moodWords: ['a', 'b', 'c'],
      voice: {
        warmth: 'warm', humor: 'gentle', pace: 'natural', formality: 'neutral',
        emoji: 'rare', vocabulary: 'neutral', length: 'natural',
      },
    };
    const output: GenerationOutput = {
      vibe: validVibe as GenerationOutput['vibe'],
      sections: [
        { type: 'hero', variant: 'split', slots: { titleRef: 't' }, emphasis: 'focal' },
        // single-hero-product is illegal for 5 cards — must be repaired.
        { type: 'productSet', variant: 'single-hero-product', slots: { cardRefs: ['1', '2', '3', '4', '5'] } },
        { type: 'cta', variant: 'button-row', slots: { labelRef: 'l' } },
        { type: 'footer', variant: 'minimal', slots: {} },
      ],
    };
    const res = generateAndRepair(output, 5);
    expect(res.page.ok).toBe(true);
    if (res.page.ok) {
      const ps = res.page.value.sections.find((s) => s.type === 'productSet');
      expect(ps && ps.type === 'productSet' && ps.variant !== 'single-hero-product').toBe(true);
    }
    // a count repair must have been logged.
    expect(res.repairsApplied.some((r) => r.code === 'CARD_COUNT')).toBe(true);
  });

  it('adjacent dividers and body-edge dividers are dropped (R5)', () => {
    const validVibe = {
      paletteSeed: { strategy: 'analogous', baseHue: 50, key: 'light', saturation: 'medium' },
      typography: {
        displayRole: 'serif', bodyRole: 'sans', scaleContrast: 1.3,
        displayCase: 'none', displayTracking: 'normal', bodyLeading: 'normal',
      },
      spatial: { density: 'cozy', baseUnitRem: 1, gutter: 'roomy', measureCh: 66 },
      shape: { radius: 'soft', imageMask: 'none', border: 'hairline' },
      depth: { elevation: 'lifted' },
      texture: { grain: 0, wash: 0, motif: 'none' },
      motion: { character: 'soft', easing: 'eased' },
      imagery: { treatment: 'framed', textOverImage: false },
      moodWords: ['a', 'b', 'c'],
      voice: {
        warmth: 'warm', humor: 'gentle', pace: 'natural', formality: 'neutral',
        emoji: 'rare', vocabulary: 'neutral', length: 'natural',
      },
    };
    const output: GenerationOutput = {
      vibe: validVibe as GenerationOutput['vibe'],
      sections: [
        { type: 'hero', variant: 'split', slots: { titleRef: 't' }, emphasis: 'focal' },
        { type: 'divider', variant: 'rule' }, // opens body → drop
        { type: 'divider', variant: 'whitespace' }, // adjacent → drop
        { type: 'productSet', variant: 'tight-grid', slots: { cardRefs: ['1', '2', '3'] } },
        { type: 'divider', variant: 'label' }, // closes body (before footer) → drop
        { type: 'cta', variant: 'button-row', slots: { labelRef: 'l' } },
        { type: 'footer', variant: 'minimal', slots: {} },
      ],
    };
    const res = generateAndRepair(output, 3);
    expect(res.page.ok).toBe(true);
    if (res.page.ok) {
      // The label divider sits between productSet and cta → legal, kept.
      // The two leading dividers are dropped.
      const dividerCount = res.page.value.sections.filter((s) => s.type === 'divider').length;
      expect(dividerCount).toBeLessThanOrEqual(1);
    }
  });
});
