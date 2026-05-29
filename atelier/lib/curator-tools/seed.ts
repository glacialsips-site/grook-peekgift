/**
 * Curator tool — seed a Vibe from (occasion + free-text brief).
 * =============================================================
 *
 * Gives the curator-Sonnet a STRONG starting point BEFORE it authors its own
 * vibe. Rather than reasoning a look up from nothing, we:
 *   1. pick the occasion's ranked base preset (tuned by an `edginess` dial),
 *   2. nudge it with the remix axes implied by the giver's free-text brief
 *      (e.g. "make it louder and weirder"),
 *   3. run the result through the SAME `generateAndRepair` pipeline every model
 *      emission flows through, so the returned `Vibe` is guaranteed legal —
 *      contrast-safe palette, legal font pair, clamped scales, the lot.
 *
 * The output is a fully-branded `Vibe` the curator can render immediately and
 * then iterate on (adjust palette, swap typography, …). It is a floor, not a
 * ceiling: a sane, on-occasion look that is never broken or ugly.
 *
 * This module is intentionally framework-agnostic — pure TypeScript, no React,
 * no `server-only`, no Next imports — so it can run anywhere (tool dispatch,
 * tests, scripts). Its only dependency is the grammar barrel.
 *
 * NOTE (BRIEF 04 coordination): the planned `set_vibe_from_occasion` curator
 * tool does not exist in the codebase yet (no `lib/curator-tools/` and no
 * `set_vibe_from_occasion` anywhere as of this writing). When it lands it
 * should call `seedVibeFromBrief` (or `pickPreset` directly when there is no
 * brief text) instead of mapping occasions by hand — this helper is the ready
 * integration point.
 */

import {
  pickPreset,
  axesFromBrief,
  remixAll,
  generateAndRepair,
  type OccasionKey,
  type Vibe,
} from '@/lib/vibe/grammar';

/**
 * Seed a guaranteed-legal `Vibe` from an occasion plus an optional free-text
 * brief. `edginess` (0–3) walks the occasion's ranked preset list from safest
 * to boldest.
 *
 * @example
 *   // brief (free text) first, then the occasion key, then optional edginess
 *   const vibe = seedVibeFromBrief('make it louder and weirder', 'bachelor', 2);
 *   // → validated Vibe; render it, then let the curator iterate.
 */
export function seedVibeFromBrief(
  brief: string,
  occasion: OccasionKey,
  edginess: 0 | 1 | 2 | 3 = 0,
): Vibe {
  // 1. The occasion's base preset (edginess picks how bold within the occasion).
  const base = pickPreset(occasion, edginess);

  // 2. Nudge the preset by the signal words found in the brief (unknown words
  //    are ignored, so an empty/irrelevant brief is a harmless no-op).
  const axes = axesFromBrief(brief);
  const remixed = remixAll(base.output, axes);

  // 3. Run through the validator/repair pipeline to mint a branded Vibe.
  //    cardCount is irrelevant to the vibe — presets carry NO sections — so a
  //    nominal `1` is fine; `result.vibe` is always a valid Vibe regardless.
  const result = generateAndRepair(remixed, 1);

  return result.vibe;
}

/**
 * Result-bearing variant of {@link seedVibeFromBrief}. Same pipeline, but also
 * surfaces the chosen preset key and the brief-derived remix axes — handy for
 * logging / debugging the curator's starting point. Prefer `seedVibeFromBrief`
 * when you only need the `Vibe`.
 */
export interface SeedVibeResult {
  readonly vibe: Vibe;
  /** The `VibeKey` of the base preset chosen for the occasion + edginess. */
  readonly presetKey: string;
  /** The remix axes the brief mapped to (empty when no signal words matched). */
  readonly axesApplied: ReturnType<typeof axesFromBrief>;
}

export function seedVibeFromBriefWithMeta(
  brief: string,
  occasion: OccasionKey,
  edginess: 0 | 1 | 2 | 3 = 0,
): SeedVibeResult {
  const base = pickPreset(occasion, edginess);
  const axesApplied = axesFromBrief(brief);
  const remixed = remixAll(base.output, axesApplied);
  // cardCount nominal `1`: presets carry no sections, so it cannot affect the vibe.
  const result = generateAndRepair(remixed, 1);

  return { vibe: result.vibe, presetKey: base.key, axesApplied };
}
