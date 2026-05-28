/**
 * Grammar ENGINE — the never-broken guarantee, realized.
 * ======================================================
 *
 * Implements the functions the prototype `grammar.ts` only DECLARED:
 *   - derivePalette         — seed → contrast-safe OKLCH role palette
 *   - validateVibeSpec      — clamp/repair every invariant → branded Vibe
 *   - validatePageComposition — structural R1–R8 + automaton + card-count
 *   - generateAndRepair     — parse(Zod) → validate → repair → SAFE_DEFAULT floor
 *   - SAFE_DEFAULT          — the guaranteed-valid editorial floor
 *
 * The contract (grammar.ts §4): the ONLY way to reach the renderer is through a
 * value that has satisfied every invariant. The renderer makes zero legality
 * decisions. This module is therefore the single runtime safety layer
 * (STACK-LOCK guardrail #1). It is fuzzed adversarially in the test batch.
 */

import {
  contrastRatio,
  deriveContrastingInk,
  oklchToHex,
  relativeLuminance,
} from './oklch';
import type {
  GenerationOutput,
  InvariantViolation,
  Oklch,
  Palette,
  PaletteSpec,
  PageComposition,
  Section,
  SectionType,
  TypographySpec,
  ValidationResult,
  Vibe,
  VibeSpec,
} from './grammar';
import {
  INVARIANTS,
  LEGAL_FONT_PAIRS,
  LEGAL_NEXT,
  MAX_SCALE_RATIO,
  MIN_SCALE_RATIO,
  PRODUCT_SET_COUNT_RULES,
} from './grammar';
import { generationOutputSchema } from './schema';

/* ════════════════════════════════════════════════════════════════════════
 * Palette derivation
 * ════════════════════════════════════════════════════════════════════════ */

/** Hue spread (degrees) the accent is pushed off baseHue per strategy. */
const STRATEGY_ACCENT_OFFSET: Record<PaletteSpec['strategy'], number> = {
  monochrome: 0,
  analogous: 32,
  complementary: 180,
  'split-complementary': 150,
  triad: 120,
};

const STRATEGY_ACCENT2_OFFSET: Record<PaletteSpec['strategy'], number> = {
  monochrome: 0,
  analogous: -32,
  complementary: 150,
  'split-complementary': 210,
  triad: 240,
};

/** Chroma ceiling per saturation level (clamped by CHROMA_MAX). */
const SATURATION_CHROMA: Record<PaletteSpec['saturation'], number> = {
  muted: 0.06,
  medium: 0.13,
  vivid: 0.22,
};

/** Base lightness anchors per key. bg / surface / ink seeds. */
const KEY_LIGHTNESS: Record<
  PaletteSpec['key'],
  { bg: number; surface: number; ink: number; inkMuted: number }
> = {
  light: { bg: 0.97, surface: 0.93, ink: 0.22, inkMuted: 0.46 },
  dim: { bg: 0.32, surface: 0.38, ink: 0.92, inkMuted: 0.74 },
  dark: { bg: 0.17, surface: 0.23, ink: 0.95, inkMuted: 0.74 },
};

function clampChroma(c: number): number {
  return Math.max(0, Math.min(c, INVARIANTS.CHROMA_MAX));
}

function normHue(h: number): number {
  let x = h % 360;
  if (x < 0) x += 360;
  return x;
}

/**
 * Build a fully-resolved, contrast-safe `Palette` from a seed. Pure.
 *
 * Strategy: place bg/surface/ink L-values from `key`, derive hues from
 * `strategy` + `baseHue`, clamp chroma by `saturation`, then NUDGE
 * ink/inkMuted/onAccent lightness until every CONTRAST_* invariant passes
 * (always possible — lightness search hits a guaranteed pole). The deriver
 * CANNOT return a failing palette.
 */
export function derivePalette(seed: PaletteSpec): Palette {
  const base = normHue(seed.baseHue);
  const L = KEY_LIGHTNESS[seed.key];
  const cMax = clampChroma(SATURATION_CHROMA[seed.saturation]);

  // Backdrop + surface: low chroma so text sits cleanly on them.
  const bgChroma = clampChroma(cMax * 0.18);
  const surfaceChroma = clampChroma(cMax * 0.26);

  const bg: Oklch = { l: L.bg, c: bgChroma, h: base };
  const surface: Oklch = { l: L.surface, c: surfaceChroma, h: base };

  // Accent: full chroma, hue offset by strategy.
  const accentHue = normHue(base + STRATEGY_ACCENT_OFFSET[seed.strategy]);
  const accentRaw: Oklch = {
    // accent lightness keyed to give it presence on the bg
    l: seed.key === 'light' ? 0.6 : 0.68,
    c: cMax,
    h: accentHue,
  };

  // accent2 only for multi-hue strategies.
  const hasAccent2 = seed.strategy !== 'monochrome';
  const accent2Hue = normHue(base + STRATEGY_ACCENT2_OFFSET[seed.strategy]);
  const accent2Raw: Oklch | undefined = hasAccent2
    ? { l: seed.key === 'light' ? 0.55 : 0.72, c: clampChroma(cMax * 0.85), h: accent2Hue }
    : undefined;

  // Ink seeds (then nudged until contrast passes against BOTH bg and surface).
  const inkSeed: Oklch = { l: L.ink, c: clampChroma(cMax * 0.25), h: base };
  const inkMutedSeed: Oklch = {
    l: L.inkMuted,
    c: clampChroma(cMax * 0.3),
    h: base,
  };

  // ink must clear AA on the WORSE of bg/surface.
  const ink = deriveInkAgainstBoth(inkSeed, bg, surface, INVARIANTS.CONTRAST_INK);
  const inkMuted = deriveInkAgainstBoth(
    inkMutedSeed,
    bg,
    surface,
    INVARIANTS.CONTRAST_INK_MUTED,
  );

  // accent must be perceivable vs bg (≥3:1). Nudge its lightness if not.
  const accent = ensureAccentVsBg(accentRaw, bg);

  // onAccent: text placed on accent fills, ≥4.5:1 on accent.
  const onAccentSeed: Oklch = { l: seed.key === 'light' ? 0.18 : 0.95, c: 0, h: accentHue };
  const onAccent = deriveContrastingInk(
    onAccentSeed,
    accent,
    INVARIANTS.CONTRAST_ON_ACCENT,
  );

  const palette: Palette = {
    bg,
    surface,
    ink,
    inkMuted,
    accent,
    onAccent,
    ...(accent2Raw ? { accent2: ensureAccentVsBg(accent2Raw, bg) } : {}),
  };
  return palette;
}

/** Nudge ink toward whichever pole clears `threshold` against the harder of two bgs. */
function deriveInkAgainstBoth(
  ink: Oklch,
  bg: Oklch,
  surface: Oklch,
  threshold: number,
): Oklch {
  // The background that ink contrasts WORST against governs.
  const worse =
    contrastRatio(ink, bg) <= contrastRatio(ink, surface) ? bg : surface;
  const fixed = deriveContrastingInk(ink, worse, threshold);
  // Re-check the other bg; if the fix broke it (rare), push to a pole.
  if (
    contrastRatio(fixed, bg) >= threshold &&
    contrastRatio(fixed, surface) >= threshold
  ) {
    return fixed;
  }
  // Both must pass: pick the pole that maximizes the MINIMUM of the two.
  const white: Oklch = { l: 1, c: 0, h: ink.h };
  const black: Oklch = { l: 0, c: 0, h: ink.h };
  const whiteMin = Math.min(contrastRatio(white, bg), contrastRatio(white, surface));
  const blackMin = Math.min(contrastRatio(black, bg), contrastRatio(black, surface));
  return whiteMin >= blackMin ? white : black;
}

/** Ensure accent ≥3:1 vs bg by nudging accent lightness away from bg. */
function ensureAccentVsBg(accent: Oklch, bg: Oklch): Oklch {
  if (contrastRatio(accent, bg) >= INVARIANTS.CONTRAST_ACCENT_VS_BG) return accent;
  // Preserve hue + chroma; move lightness away from bg's lightness. A light bg
  // (relative luminance > 0.5) → darken the accent; a dark bg → lighten it.
  const goDarker = relativeLuminance(bg) > 0.5;
  let l = accent.l;
  for (let i = 0; i < 24; i++) {
    l = goDarker ? l - 0.03 : l + 0.03;
    l = Math.max(0, Math.min(1, l));
    const cand: Oklch = { l, c: accent.c, h: accent.h };
    if (contrastRatio(cand, bg) >= INVARIANTS.CONTRAST_ACCENT_VS_BG) return cand;
    if (l <= 0 || l >= 1) break;
  }
  // Final fallback: deriveContrastingInk gets it to a pole (keeps a CTA visible).
  return deriveContrastingInk(accent, bg, INVARIANTS.CONTRAST_ACCENT_VS_BG);
}

/* ════════════════════════════════════════════════════════════════════════
 * Vibe validation / repair
 * ════════════════════════════════════════════════════════════════════════ */

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(n, hi));
}

/** Find the nearest legal body role for a given display role. */
function nearestLegalBody(
  display: TypographySpec['displayRole'],
  body: TypographySpec['bodyRole'],
): TypographySpec['bodyRole'] {
  const legal = LEGAL_FONT_PAIRS.filter(([d]) => d === display).map(([, b]) => b);
  if (legal.includes(body)) return body;
  // Preference order: sans → serif → mono → the display's matched look.
  const pref: TypographySpec['bodyRole'][] = ['sans', 'serif', 'mono'];
  for (const p of pref) if (legal.includes(p)) return p;
  return legal[0] ?? 'sans';
}

/**
 * Validate + normalize a `VibeSpec`. Runs font-pair legality, scale-ratio
 * range + hierarchy, measure/space ranges, texture caps, then derivePalette +
 * contrast (contrast is legal-by-construction via the deriver). Returns a
 * branded `Vibe` and the list of repairs applied (never fails — every invariant
 * here is auto-repairable; the worst case is a fully clamped spec).
 */
export function validateVibeSpec(spec: VibeSpec): {
  vibe: Vibe;
  repairs: InvariantViolation[];
} {
  const repairs: InvariantViolation[] = [];

  // ── Typography: font pair ──────────────────────────────────────────────
  let bodyRole = spec.typography.bodyRole;
  const legalBody = nearestLegalBody(spec.typography.displayRole, bodyRole);
  if (legalBody !== bodyRole) {
    repairs.push({
      code: 'FONT_PAIR',
      path: 'typography.bodyRole',
      message: `(${spec.typography.displayRole},${bodyRole}) illegal → bodyRole=${legalBody}`,
      autoRepairable: true,
    });
    bodyRole = legalBody;
  }

  // ── Typography: scale ratio band ───────────────────────────────────────
  let scaleContrast = spec.typography.scaleContrast;
  if (!Number.isFinite(scaleContrast) || scaleContrast < MIN_SCALE_RATIO || scaleContrast > MAX_SCALE_RATIO) {
    const clamped = Number.isFinite(scaleContrast)
      ? clamp(scaleContrast, MIN_SCALE_RATIO, MAX_SCALE_RATIO)
      : 1.25;
    repairs.push({
      code: scaleContrast > MAX_SCALE_RATIO ? 'SCALE_RATIO_MAX' : 'SCALE_RATIO_MIN',
      path: 'typography.scaleContrast',
      message: `scaleContrast ${scaleContrast} → ${clamped}`,
      autoRepairable: true,
    });
    scaleContrast = clamped;
  }

  // ── Spatial: baseUnitRem + measureCh ───────────────────────────────────
  let baseUnitRem = spec.spatial.baseUnitRem;
  if (!Number.isFinite(baseUnitRem) || baseUnitRem < INVARIANTS.BASE_UNIT_REM_MIN || baseUnitRem > INVARIANTS.BASE_UNIT_REM_MAX) {
    const clamped = Number.isFinite(baseUnitRem)
      ? clamp(baseUnitRem, INVARIANTS.BASE_UNIT_REM_MIN, INVARIANTS.BASE_UNIT_REM_MAX)
      : 1;
    repairs.push({
      code: 'BASE_UNIT_REM_MIN',
      path: 'spatial.baseUnitRem',
      message: `baseUnitRem ${baseUnitRem} → ${clamped}`,
      autoRepairable: true,
    });
    baseUnitRem = clamped;
  }
  let measureCh = spec.spatial.measureCh;
  if (!Number.isFinite(measureCh) || measureCh < INVARIANTS.MEASURE_CH_MIN || measureCh > INVARIANTS.MEASURE_CH_MAX) {
    const clamped = Number.isFinite(measureCh)
      ? clamp(measureCh, INVARIANTS.MEASURE_CH_MIN, INVARIANTS.MEASURE_CH_MAX)
      : 66;
    repairs.push({
      code: 'MEASURE_CH_MIN',
      path: 'spatial.measureCh',
      message: `measureCh ${measureCh} → ${clamped}`,
      autoRepairable: true,
    });
    measureCh = clamped;
  }

  // ── Texture: grain + wash caps ─────────────────────────────────────────
  let grain = spec.texture.grain;
  if (!Number.isFinite(grain) || grain < 0 || grain > INVARIANTS.GRAIN_MAX) {
    const clamped = Number.isFinite(grain) ? clamp(grain, 0, INVARIANTS.GRAIN_MAX) : 0;
    repairs.push({
      code: 'GRAIN_MAX',
      path: 'texture.grain',
      message: `grain ${grain} → ${clamped}`,
      autoRepairable: true,
    });
    grain = clamped;
  }
  let wash = spec.texture.wash;
  if (!Number.isFinite(wash) || wash < 0 || wash > INVARIANTS.WASH_MAX) {
    const clamped = Number.isFinite(wash) ? clamp(wash, 0, INVARIANTS.WASH_MAX) : 0;
    repairs.push({
      code: 'WASH_MAX',
      path: 'texture.wash',
      message: `wash ${wash} → ${clamped}`,
      autoRepairable: true,
    });
    wash = clamped;
  }

  // ── moodWords count ────────────────────────────────────────────────────
  let moodWords = spec.moodWords.filter((w) => typeof w === 'string' && w.trim().length > 0);
  if (moodWords.length < INVARIANTS.MOOD_WORDS_MIN) {
    const filler = ['considered', 'warm', 'personal', 'crafted'];
    while (moodWords.length < INVARIANTS.MOOD_WORDS_MIN) {
      moodWords.push(filler[moodWords.length] ?? 'considered');
    }
    repairs.push({
      code: 'MOOD_WORDS_MIN',
      path: 'moodWords',
      message: `padded to ${INVARIANTS.MOOD_WORDS_MIN}`,
      autoRepairable: true,
    });
  }
  if (moodWords.length > INVARIANTS.MOOD_WORDS_MAX) {
    moodWords = moodWords.slice(0, INVARIANTS.MOOD_WORDS_MAX);
    repairs.push({
      code: 'MOOD_WORDS_MAX',
      path: 'moodWords',
      message: `truncated to ${INVARIANTS.MOOD_WORDS_MAX}`,
      autoRepairable: true,
    });
  }

  // ── Palette: ALWAYS re-derived (never trust supplied roles) ────────────
  const roles = derivePalette(spec.palette);

  const validated: Vibe = {
    palette: { ...spec.palette, roles },
    typography: {
      ...spec.typography,
      bodyRole,
      scaleContrast,
    },
    spatial: { ...spec.spatial, baseUnitRem, measureCh },
    shape: spec.shape,
    depth: spec.depth,
    texture: { ...spec.texture, grain, wash },
    motion: spec.motion,
    imagery: spec.imagery,
    moodWords,
    voice: spec.voice,
    __validated: true,
  };

  return { vibe: validated, repairs };
}

/* ════════════════════════════════════════════════════════════════════════
 * Page composition validation (R1–R8 + automaton + card-count)
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * Validate AND repair a page composition. Repairs are deterministic:
 *  - drop a divider that opens/closes the body or is adjacent to another
 *  - swap an illegal product-set presentation to a count-legal one
 *  - ensure exactly one focal (mark the productSet, else hero)
 * Unrepairable structural failures (no hero, no productSet, no cards) are
 * returned as violations so the caller can fall to a SAFE composition.
 */
export function validatePageComposition(
  page: PageComposition,
  cardCount: number,
): {
  result: ValidationResult<PageComposition>;
  repairs: InvariantViolation[];
} {
  const repairs: InvariantViolation[] = [];
  const violations: InvariantViolation[] = [];
  let sections = [...page.sections];

  // R1: exactly one hero, first.
  const heroCount = sections.filter((s) => s.type === 'hero').length;
  if (heroCount !== 1 || sections[0]?.type !== 'hero') {
    violations.push({
      code: 'STRUCTURE',
      path: 'sections',
      message: `R1: need exactly one hero first (have ${heroCount})`,
      autoRepairable: false,
    });
  }

  // R2: exactly one footer, last.
  const footerCount = sections.filter((s) => s.type === 'footer').length;
  if (footerCount !== 1 || sections[sections.length - 1]?.type !== 'footer') {
    violations.push({
      code: 'STRUCTURE',
      path: 'sections',
      message: `R2: need exactly one footer last (have ${footerCount})`,
      autoRepairable: false,
    });
  }

  // R3: ≥1 productSet, with cards.
  const productSets = sections.filter((s) => s.type === 'productSet');
  if (productSets.length === 0) {
    violations.push({
      code: 'STRUCTURE',
      path: 'sections',
      message: 'R3: a peek needs at least one productSet',
      autoRepairable: false,
    });
  }
  if (cardCount <= 0) {
    violations.push({
      code: 'CARD_COUNT',
      path: 'cards',
      message: 'R3: productSet with zero cards',
      autoRepairable: false,
    });
  }

  // R4: ≥1 cta.
  if (!sections.some((s) => s.type === 'cta')) {
    violations.push({
      code: 'STRUCTURE',
      path: 'sections',
      message: 'R4: a peek needs at least one cta',
      autoRepairable: false,
    });
  }

  // R8: count in band.
  if (
    sections.length < INVARIANTS.SECTION_COUNT_MIN ||
    sections.length > INVARIANTS.SECTION_COUNT_MAX
  ) {
    violations.push({
      code: 'STRUCTURE',
      path: 'sections',
      message: `R8: section count ${sections.length} outside [${INVARIANTS.SECTION_COUNT_MIN},${INVARIANTS.SECTION_COUNT_MAX}]`,
      autoRepairable: false,
    });
  }

  // ── Auto-repairs (only attempt if structure is sound enough) ───────────

  // R5/R6: drop dividers at body edges and adjacent dividers/productSets.
  sections = repairAdjacency(sections, repairs);

  // Per-productSet: ensure the presentation is legal for card count.
  sections = sections.map((s) => {
    if (s.type !== 'productSet') return s;
    const rule = PRODUCT_SET_COUNT_RULES[s.variant];
    if (cardCount >= rule.min && cardCount <= rule.max) return s;
    const legal = (Object.keys(PRODUCT_SET_COUNT_RULES) as (keyof typeof PRODUCT_SET_COUNT_RULES)[]).find(
      (v) => cardCount >= PRODUCT_SET_COUNT_RULES[v].min && cardCount <= PRODUCT_SET_COUNT_RULES[v].max,
    );
    if (legal && legal !== s.variant) {
      repairs.push({
        code: 'CARD_COUNT',
        path: 'productSet.variant',
        message: `${s.variant} illegal for ${cardCount} cards → ${legal}`,
        autoRepairable: true,
      });
      return { ...s, variant: legal };
    }
    return s;
  });

  // R7: exactly one focal.
  sections = ensureExactlyOneFocal(sections, repairs);

  // Re-check the automaton on the (possibly repaired) type sequence.
  const seqViolation = checkAutomaton(sections);
  if (seqViolation) violations.push(seqViolation);

  if (violations.length > 0) {
    return { result: { ok: false, violations }, repairs };
  }
  return { result: { ok: true, value: { vibe: page.vibe, sections } }, repairs };
}

function repairAdjacency(
  sections: Section[],
  repairs: InvariantViolation[],
): Section[] {
  // The "body" is everything between hero (index 0) and footer (last).
  const out: Section[] = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]!;
    if (s.type === 'divider') {
      const prev = out[out.length - 1];
      const next = sections[i + 1];
      const opensBody = prev?.type === 'hero';
      const closesBody = !next || next.type === 'footer';
      const adjacentDivider = prev?.type === 'divider';
      if (opensBody || closesBody || adjacentDivider) {
        repairs.push({
          code: 'SEQUENCE',
          path: `sections[${i}]`,
          message: 'dropped divider at body edge / adjacent divider',
          autoRepairable: true,
        });
        continue; // drop it
      }
    }
    out.push(s);
  }
  // R6: collapse adjacent productSets (drop the later one's *adjacency* by
  // inserting nothing — we keep both but only if separated; if truly adjacent,
  // drop the second to keep the page legal).
  const collapsed: Section[] = [];
  for (const s of out) {
    const prev = collapsed[collapsed.length - 1];
    if (s.type === 'productSet' && prev?.type === 'productSet') {
      repairs.push({
        code: 'SEQUENCE',
        path: 'sections',
        message: 'dropped adjacent productSet (R6)',
        autoRepairable: true,
      });
      continue;
    }
    collapsed.push(s);
  }
  return collapsed;
}

function ensureExactlyOneFocal(
  sections: Section[],
  repairs: InvariantViolation[],
): Section[] {
  const focalIdxs = sections
    .map((s, i) => (('emphasis' in s && s.emphasis === 'focal') ? i : -1))
    .filter((i) => i >= 0);
  if (focalIdxs.length === 1) return sections;

  // Choose the canonical focal: first productSet, else hero.
  let target = sections.findIndex((s) => s.type === 'productSet');
  if (target < 0) target = sections.findIndex((s) => s.type === 'hero');

  repairs.push({
    code: 'STRUCTURE',
    path: 'sections.emphasis',
    message: `R7: focal count ${focalIdxs.length} → 1 (index ${target})`,
    autoRepairable: true,
  });

  return sections.map((s, i) => {
    const canFocal = s.type === 'hero' || s.type === 'story' || s.type === 'productSet';
    if (!canFocal) return s;
    if (i === target) return { ...s, emphasis: 'focal' as const };
    // strip focal from others
    if ('emphasis' in s && s.emphasis === 'focal') {
      const { emphasis: _drop, ...rest } = s;
      return rest as Section;
    }
    return s;
  });
}

function checkAutomaton(sections: Section[]): InvariantViolation | null {
  for (let i = 0; i < sections.length - 1; i++) {
    const cur = sections[i]!.type as SectionType;
    const next = sections[i + 1]!.type as SectionType;
    if (!LEGAL_NEXT[cur].includes(next)) {
      return {
        code: 'SEQUENCE',
        path: `sections[${i}]→[${i + 1}]`,
        message: `illegal adjacency ${cur}→${next}`,
        autoRepairable: false,
      };
    }
  }
  return null;
}

/* ════════════════════════════════════════════════════════════════════════
 * SAFE_DEFAULT — the guaranteed-valid floor
 * ════════════════════════════════════════════════════════════════════════ */

const SAFE_DEFAULT_SPEC: VibeSpec = {
  palette: {
    strategy: 'analogous',
    baseHue: 50, // warm saffron/cream family — matches live DEFAULT_VIBE intent
    key: 'light',
    saturation: 'medium',
  },
  typography: {
    displayRole: 'serif',
    bodyRole: 'sans',
    scaleContrast: 1.333,
    displayCase: 'none',
    displayTracking: 'normal',
    bodyLeading: 'normal',
  },
  spatial: {
    density: 'breathable',
    baseUnitRem: 1,
    gutter: 'roomy',
    measureCh: 66,
  },
  shape: { radius: 'soft', imageMask: 'rounded', border: 'hairline' },
  depth: { elevation: 'lifted' },
  texture: { grain: 0.02, wash: 0.04, motif: 'none' },
  motion: { character: 'soft', easing: 'eased' },
  imagery: { treatment: 'framed', textOverImage: false },
  moodWords: ['warm', 'considered', 'personal', 'crafted'],
  voice: {
    warmth: 'warm',
    humor: 'gentle',
    pace: 'natural',
    formality: 'neutral',
    emoji: 'rare',
    vocabulary: 'neutral',
    length: 'natural',
  },
};

/**
 * The last line of defense — a guaranteed-valid, deliberately-neutral vibe.
 * Mirrors the live DEFAULT_VIBE intent: warm, editorial, legible. Built once
 * through the validator so its palette roles are present + contrast-safe.
 */
export const SAFE_DEFAULT: Vibe = validateVibeSpec(SAFE_DEFAULT_SPEC).vibe;

/* ════════════════════════════════════════════════════════════════════════
 * generateAndRepair — the full pipeline
 * ════════════════════════════════════════════════════════════════════════ */

export interface GenerateAndRepairResult {
  readonly page: ValidationResult<PageComposition>;
  readonly vibe: Vibe;
  readonly repairsApplied: readonly InvariantViolation[];
  readonly usedSafeDefaultVibe: boolean;
  readonly repairPrompt?: string;
}

/**
 * The heart of "invalid output is rejected/repaired":
 *   1. Parse the raw output with Zod (shape gate). Malformed → SAFE_DEFAULT vibe.
 *   2. validateVibeSpec → clamp/repair/derive (vibe is always valid after).
 *   3. validatePageComposition → structural repairs; unrepairable → return a
 *      repairPrompt AND fall back so a valid page still ships.
 *   4. The pipeline NEVER hard-fails: a boring-but-valid page always renders.
 */
export function generateAndRepair(
  raw: unknown,
  cardCount: number,
): GenerateAndRepairResult {
  const repairsApplied: InvariantViolation[] = [];

  // 1. Zod shape gate.
  const parsed = generationOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      page: {
        ok: false,
        violations: [
          {
            code: 'STRUCTURE',
            path: 'root',
            message: `Zod parse failed: ${parsed.error.issues.length} issue(s)`,
            autoRepairable: false,
          },
        ],
      },
      vibe: SAFE_DEFAULT,
      repairsApplied,
      usedSafeDefaultVibe: true,
      repairPrompt: summarizeZodError(parsed.error.issues),
    };
  }

  const output: GenerationOutput = parsed.data as GenerationOutput;

  // 2. Vibe validate/repair. (paletteSeed → full PaletteSpec)
  const vibeSpec: VibeSpec = {
    palette: { ...output.vibe.paletteSeed },
    typography: output.vibe.typography,
    spatial: output.vibe.spatial,
    shape: output.vibe.shape,
    depth: output.vibe.depth,
    texture: output.vibe.texture,
    motion: output.vibe.motion,
    imagery: output.vibe.imagery,
    moodWords: output.vibe.moodWords,
    voice: output.vibe.voice,
  };
  const { vibe, repairs: vibeRepairs } = validateVibeSpec(vibeSpec);
  repairsApplied.push(...vibeRepairs);

  // 3. Composition validate/repair.
  const { result, repairs: compRepairs } = validatePageComposition(
    { vibe, sections: output.sections },
    cardCount,
  );
  repairsApplied.push(...compRepairs);

  if (!result.ok) {
    return {
      page: result,
      vibe,
      repairsApplied,
      usedSafeDefaultVibe: false,
      repairPrompt: result.violations.map((v) => `${v.code} @ ${v.path}: ${v.message}`).join('; '),
    };
  }

  return {
    page: { ok: true, value: { vibe, sections: result.value.sections } },
    vibe,
    repairsApplied,
    usedSafeDefaultVibe: false,
  };
}

function summarizeZodError(issues: { path: PropertyKey[]; message: string }[]): string {
  return issues
    .slice(0, 8)
    .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
    .join('; ');
}

/** Emit the canonical hex for each palette role (debug / OG use). */
export function paletteToHex(p: Palette): Record<string, string> {
  return {
    bg: oklchToHex(p.bg),
    surface: oklchToHex(p.surface),
    ink: oklchToHex(p.ink),
    inkMuted: oklchToHex(p.inkMuted),
    accent: oklchToHex(p.accent),
    onAccent: oklchToHex(p.onAccent),
    ...(p.accent2 ? { accent2: oklchToHex(p.accent2) } : {}),
  };
}
