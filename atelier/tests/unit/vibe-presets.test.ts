/**
 * GRAMMAR PRESETS (BRIEF 07) — the 40-preset library, 22-occasion taxonomy,
 * many-to-many map, selector, and remix operators.
 *
 * Contract under test:
 *   - Every preset is authored IN-BAND at the VIBE level: it survives
 *     `generateAndRepair` with its own seed (no SAFE_DEFAULT fallback) and needs
 *     ZERO *vibe-level* repairs (no clamp on scale/spatial/texture/mood, no
 *     FONT_PAIR fix). Its palette is WCAG-legal.
 *   - Presets carry empty `sections`, so `page.ok` is FALSE by design and we do
 *     NOT assert on it. NOTE (empirical, differs from the brief's "0 repairs"
 *     guess): an empty section list ALWAYS draws exactly one *composition*
 *     repair — `STRUCTURE @ sections.emphasis: R7: focal count 0 → 1` from
 *     `ensureExactlyOneFocal`. That repair is independent of the vibe (it fires
 *     identically for all 40 presets and every remix), so the meaningful
 *     assertion is "no VIBE-level repair", which we make precise below.
 *   - `OCCASION_VIBES` references only real `VibeKey`s; key sets line up with
 *     `OCCASIONS`.
 *   - `pickPreset(occasion, edginess)` returns the ranked entry (clamped).
 *   - `remix` keeps a preset legal under every axis (never falls back to
 *     SAFE_DEFAULT, palette stays WCAG-legal), and monotone axes clamp at a
 *     ceiling/floor (idempotent once at the cap). Cyclic axes (`flip-key`,
 *     `shift-hue`) only get the in-band check — they oscillate / rotate.
 *     NOTE: the `weird-pair` axis can legitimately trigger a VIBE-level
 *     FONT_PAIR auto-repair (it weirdens displayRole toward `script`, and
 *     `(script, mono)` is illegal → bodyRole repaired to `sans`). That is the
 *     engine working as designed (documented in the `weird-pair` operator), so
 *     the in-band check asserts "kept legal", not "zero repairs".
 *   - `axesFromBrief` maps brief language to remix axes (declaration order).
 */

import { describe, expect, it } from 'vitest';
import {
  INVARIANTS,
  OCCASIONS,
  OCCASION_VIBES,
  VIBE_PRESETS,
  axesFromBrief,
  contrastRatio,
  generateAndRepair,
  pickPreset,
  remix,
  remixAll,
  type GenerateAndRepairResult,
  type OccasionKey,
  type RemixAxis,
  type VibeKey,
} from '@/lib/vibe/grammar';

const PRESET_KEYS = Object.keys(VIBE_PRESETS) as VibeKey[];
const OCCASION_KEYS = Object.keys(OCCASION_VIBES) as OccasionKey[];

/**
 * Repair codes emitted by `validateVibeSpec` (the VIBE gate) — as opposed to
 * the composition gate (`STRUCTURE` / `CARD_COUNT` / `SEQUENCE`). A preset is
 * "in-band at the vibe level" iff `generateAndRepair` applied NONE of these.
 */
const VIBE_REPAIR_CODES: ReadonlySet<string> = new Set([
  'FONT_PAIR',
  'SCALE_RATIO_MAX',
  'SCALE_RATIO_MIN',
  'BASE_UNIT_REM_MIN',
  'BASE_UNIT_REM_MAX',
  'MEASURE_CH_MIN',
  'MEASURE_CH_MAX',
  'GRAIN_MAX',
  'WASH_MAX',
  'MOOD_WORDS_MIN',
  'MOOD_WORDS_MAX',
]);

function vibeRepairs(result: GenerateAndRepairResult) {
  return result.repairsApplied.filter((r) => VIBE_REPAIR_CODES.has(r.code));
}

function fmt(repairs: GenerateAndRepairResult['repairsApplied']): string {
  return repairs.map((r) => `${r.code} @ ${r.path}: ${r.message}`).join(' | ');
}

/** The benign composition repair every empty-section input draws (R7 focal). */
function assertOnlyEmptySectionRepair(result: GenerateAndRepairResult, label: string) {
  // No vibe-level repair: the preset's authored vibe survived untouched.
  expect(vibeRepairs(result).length, `${label}: VIBE-level repairs (${fmt(result.repairsApplied)})`).toBe(0);
  // The single composition repair is the focal-fixer firing on empty sections.
  expect(result.repairsApplied.length, `${label}: total repairs (${fmt(result.repairsApplied)})`).toBe(1);
  const only = result.repairsApplied[0];
  expect(only?.code, label).toBe('STRUCTURE');
  expect(only?.path, label).toBe('sections.emphasis');
}

/* ════════════════════════════════════════════════════════════════════════
 * 1. Every preset survives generateAndRepair (in-band at the vibe level)
 * ════════════════════════════════════════════════════════════════════════ */

describe('VIBE_PRESETS — every preset survives generateAndRepair', () => {
  it('has exactly 40 entries', () => {
    expect(PRESET_KEYS.length).toBe(40);
  });

  it.each(PRESET_KEYS)('%s: seed survives validation, contrast-safe, no vibe repair', (key) => {
    const preset = VIBE_PRESETS[key];
    // sanity: presets define a vibe, NOT a layout — sections are empty.
    expect(preset.output.sections).toEqual([]);

    const result = generateAndRepair(preset.output, 3);

    // The preset's OWN seed survived Zod + validation; it was NOT replaced by
    // SAFE_DEFAULT. (page.ok is FALSE here because sections are empty — that is
    // expected and intentionally not asserted.)
    expect(result.usedSafeDefaultVibe).toBe(false);

    // Contrast invariants on the validated vibe.
    const roles = result.vibe.palette.roles;
    expect(
      contrastRatio(roles.ink, roles.bg),
      `${key}: ink vs bg`,
    ).toBeGreaterThanOrEqual(INVARIANTS.CONTRAST_INK - 0.01);
    expect(
      contrastRatio(roles.onAccent, roles.accent),
      `${key}: onAccent vs accent`,
    ).toBeGreaterThanOrEqual(INVARIANTS.CONTRAST_ON_ACCENT - 0.01);

    // The brief's GOAL, made precise: presets are authored in-band at the vibe
    // level → ZERO vibe-level repairs. The only repair is the benign R7 focal
    // fix that an empty section list always draws (see file header).
    assertOnlyEmptySectionRepair(result, key);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * 2. OCCASION_VIBES references only real VibeKeys
 * ════════════════════════════════════════════════════════════════════════ */

describe('OCCASION_VIBES references only real VibeKeys', () => {
  it('has 22 occasions, matching OCCASIONS one-to-one', () => {
    expect(OCCASION_KEYS.length).toBe(22);
    expect(Object.keys(OCCASIONS).length).toBe(22);
    expect(new Set(OCCASION_KEYS)).toEqual(new Set(Object.keys(OCCASIONS)));
  });

  it.each(OCCASION_KEYS)('%s: every ranked vibe is a real VibeKey', (occasion) => {
    const ranked = OCCASION_VIBES[occasion];
    expect(ranked.length).toBeGreaterThan(0);
    for (const vibeKey of ranked) {
      expect(VIBE_PRESETS, `${occasion} -> ${vibeKey}`).toHaveProperty(vibeKey);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * 3. pickPreset
 * ════════════════════════════════════════════════════════════════════════ */

describe('pickPreset', () => {
  const EDGINESS: ReadonlyArray<0 | 1 | 2 | 3> = [0, 1, 2, 3];

  it.each(OCCASION_KEYS)('%s: returns the ranked entry (clamped) at each edginess', (occasion) => {
    const ranked = OCCASION_VIBES[occasion];
    for (const edginess of EDGINESS) {
      const picked = pickPreset(occasion, edginess);
      const expectedIdx = Math.min(edginess, ranked.length - 1);
      const expectedKey = ranked[expectedIdx];

      // The returned preset is real and self-consistent.
      expect(VIBE_PRESETS).toHaveProperty(picked.key);
      expect(picked).toBe(VIBE_PRESETS[picked.key]);
      // And it equals the expected ranked entry.
      expect(picked.key, `${occasion} @ edginess ${edginess}`).toBe(expectedKey);
    }
  });

  it('defaults to rank 0 (edginess omitted)', () => {
    for (const occasion of OCCASION_KEYS) {
      expect(pickPreset(occasion).key).toBe(OCCASION_VIBES[occasion][0]);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * 4. remix — stays in band; ceilings clamp
 * ════════════════════════════════════════════════════════════════════════ */

describe('remix — stays in band; ceilings clamp', () => {
  /** Monotone axes: step toward a cap/floor, then no-op once at the cap. */
  const MONOTONE_AXES: readonly RemixAxis[] = [
    '+saturation',
    '+contrast',
    '+texture',
    '-texture',
    '+motion',
    '+shape',
    '+depth',
    '-voice',
    'weird-pair',
  ];
  /** Cyclic axes: oscillate / rotate — never reach a fixed point. */
  const CYCLIC_AXES: readonly RemixAxis[] = [
    'flip-key',
    { axis: 'shift-hue', degrees: 40 },
  ];
  const ALL_AXES: readonly RemixAxis[] = [...MONOTONE_AXES, ...CYCLIC_AXES];

  const BASE_KEYS: readonly VibeKey[] = [
    'confetti-pop',
    'chalk-line',
    'neon-club',
    'museum-label',
  ];

  function axisLabel(axis: RemixAxis): string {
    return typeof axis === 'object' ? `${axis.axis}(${axis.degrees})` : axis;
  }

  function applyN(base: VibeKey, axis: RemixAxis, n: number) {
    let out = VIBE_PRESETS[base].output;
    for (let i = 0; i < n; i++) out = remix(out, axis);
    return out;
  }

  // ── IN-BAND: every axis (monotone + cyclic), applied 5×, stays LEGAL. ──────
  // "Legal" = never replaced by SAFE_DEFAULT and palette stays WCAG-contrast.
  // We do NOT assert "0 repairs": `weird-pair` legitimately draws a FONT_PAIR
  // auto-repair on mono-body presets (the engine repairs and keeps it legal).
  // The empty-section R7 focal repair is also always present (see header).
  describe('5× of any axis keeps the vibe legal (no SAFE_DEFAULT, contrast-safe)', () => {
    for (const base of BASE_KEYS) {
      for (const axis of ALL_AXES) {
        it(`${base} × ${axisLabel(axis)}`, () => {
          const remixed = remixAll(VIBE_PRESETS[base].output, Array.from({ length: 5 }, () => axis));
          const result = generateAndRepair(remixed, 3);
          const label = `${base} × ${axisLabel(axis)}`;

          // The remix kept the vibe legal — the engine never fell back.
          expect(result.usedSafeDefaultVibe, `${label}: usedSafeDefaultVibe`).toBe(false);

          // Palette is still WCAG-legal after 5 remixes.
          const roles = result.vibe.palette.roles;
          expect(contrastRatio(roles.ink, roles.bg), `${label}: ink vs bg`).toBeGreaterThanOrEqual(
            INVARIANTS.CONTRAST_INK - 0.01,
          );
          expect(
            contrastRatio(roles.onAccent, roles.accent),
            `${label}: onAccent vs accent`,
          ).toBeGreaterThanOrEqual(INVARIANTS.CONTRAST_ON_ACCENT - 0.01);

          // The ONLY vibe-level repair the remix operators can introduce is the
          // documented FONT_PAIR fix from `weird-pair`; every other axis stays
          // in-band (zero vibe repairs).
          for (const r of vibeRepairs(result)) {
            expect(r.code, `${label}: unexpected vibe repair (${fmt(result.repairsApplied)})`).toBe('FONT_PAIR');
          }
          if (axisLabel(axis) !== 'weird-pair') {
            expect(vibeRepairs(result).length, `${label}: vibe repairs (${fmt(result.repairsApplied)})`).toBe(0);
          }
        });
      }
    }
  });

  // ── CEILING CLAMP: monotone axes ONLY. 12× then once more is a no-op. ──────
  // (5× isn't guaranteed to hit the cap — e.g. '+contrast' from museum-label's
  // 1.18 needs many +0.15 steps to reach MAX_SCALE — so we use 12×.)
  describe('monotone axes clamp at the cap (apply 12× == apply 13×)', () => {
    for (const base of BASE_KEYS) {
      for (const axis of MONOTONE_AXES) {
        it(`${base} × ${axisLabel(axis)} is idempotent at the cap`, () => {
          const at12 = applyN(base, axis, 12);
          const at13 = remix(at12, axis);
          expect(at13).toEqual(at12);
        });
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * 5. axesFromBrief
 * ════════════════════════════════════════════════════════════════════════ */

describe('axesFromBrief', () => {
  it('maps single-signal briefs to the expected axis', () => {
    expect(axesFromBrief('make it weirder')).toEqual(['weird-pair']);
    expect(axesFromBrief('louder please')).toEqual(['+contrast']);
    expect(axesFromBrief('a bit softer')).toEqual(['+shape']);
    expect(axesFromBrief('go bolder')).toEqual(['+saturation']);
    expect(axesFromBrief('keep it moody')).toEqual(['flip-key']);
    expect(axesFromBrief('very minimal')).toEqual(['-texture']);
  });

  it('emits multiple axes in SIGNAL_AXES declaration order', () => {
    // '+contrast' is declared before 'weird-pair' in the SIGNAL_AXES table.
    expect(axesFromBrief('louder and weirder')).toEqual(['+contrast', 'weird-pair']);
  });

  it('ignores unknown briefs (conservative)', () => {
    expect(axesFromBrief('please make it nice')).toEqual([]);
  });
});
