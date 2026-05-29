# BRIEF 07 — Grammar preset library integration

**Source of need:** the research sub produced 40 named vibe presets, 22 occasions, ranked occasion→vibe map, remix engine — all in `_packets/LIEUTENANT/_research/grammar-presets/presets.ts` (1285 lines, already committed). This brief integrates it into the app.

**Read first (must):**
1. `_packets/LIEUTENANT/_research/grammar-presets/REPORT.md` — the rationale.
2. `_packets/LIEUTENANT/_research/grammar-presets/presets.ts` — the load-bearing TS.
3. `atelier/lib/vibe/grammar/grammar.ts` + `engine.ts` + `fixtures.ts` — the contract presets conform to.

## DELIVERABLES

### 1. Move + integrate the preset library

- Move `_packets/LIEUTENANT/_research/grammar-presets/presets.ts` → `atelier/lib/vibe/grammar/presets.ts`. Fix the relative import path (line 32 per research §7).
- Add to the barrel `atelier/lib/vibe/grammar/index.ts`.
- Verify every preset's `output` survives `generateAndRepair` (test below).

### 2. Tests

`atelier/tests/unit/vibe-presets.test.ts`:
- Every entry in `VIBE_PRESETS` produces a valid `Vibe` through `generateAndRepair` (no hard fails; auto-repair count == 0 is the goal but not required).
- Every `OCCASION_VIBES` entry references a real `VibeKey`.
- `pickPreset(occasion, edginess)` returns a valid `VibeKey` for every `(occasion, edginess)` combination.
- `remix(output, axis)` applied 5× idempotently stays in band for every axis (band ceilings clamp).
- `axesFromBrief` maps known signal words ("weirder", "louder", "softer", "bolder", "moody", "minimal") to expected axes.

### 3. Wire into the curator-Sonnet flow (coordinate with BRIEF 04)

BRIEF 04's `set_vibe_from_occasion` tool currently TODO calls `pickPreset(occasion)`. Confirm that integration; if BRIEF 04 lands first with a stub, replace the stub.

Add a `seedVibeFromBrief(brief, occasion)` helper in `atelier/lib/curator-tools/seed.ts` that:
1. Calls `pickPreset(occasion, edginess)` to pick base.
2. Calls `axesFromBrief(brief)` and applies via `remixAll`.
3. Runs through `generateAndRepair`.
4. Returns the validated `Vibe`.

### 4. Expand `OccasionType`

`atelier/lib/anthropic/system-prompt.ts` (or wherever `OccasionType` lives — read the actual file) currently has 10 values per MEMORY §1.2. Expand to the 22 in the spec.

If the old code referencing `OccasionType` is dead (Tailwind era), let it die — the new 22-occasion enum lives in `presets.ts` already, and curator-Sonnet skills (BRIEF 05) consume it.

### 5. SSR proof additions

Add 5-7 more proof renders to `atelier/scripts/proof-out/` covering presets outside the existing 3 (princess/bachelor/luxe):
- `cottage-warm` (housewarming)
- `chalk-line` (sympathy — gray, restrained, no motif)
- `velvet-rope` (milestone/divorce)
- `zine-punk` (teen-bday)
- `gummy-bear` (baby-arrival)
- `dusk-poem` (engagement)
- `concrete-poet` (brutalist showcase)

Same content as the existing 3 (hero + The Drop ×3 + The Kit ×2) for direct comparison. Update `atelier/app/renderer-proof/[vibe]/page.tsx` to include the new vibes in `generateStaticParams`.

## HARD RULES

- **Renderer is sacred** — no changes to `atelier/components/renderer/` or `atelier/lib/vibe/grammar/{grammar,engine,css-vars}.ts`. Presets must conform to existing types, not the other way around.
- **Anti-presets** (REPORT §6) are NOT enforced by code; they're enforced by what we ship. Do not add a `subtle-tasteful-clean` preset.
- **40 not 50.** Discipline: refuse "one more, but tasteful." Every additional preset that's a milder version drags the average toward generic.
- **Branch:** `lt/grammar-presets` off `claude/bold-ride-Li5zK`. Push. Do not merge.

## VERIFICATION

- `npm --prefix atelier run typecheck` — 0 errors.
- `npm --prefix atelier run test` — all pass, including the new preset tests.
- `npm --prefix atelier run build` — clean; new proof routes prerendered.
- Visually inspect the new proof HTML files — do they look genuinely distinct?

## RETURN.md

Sections required: what you built; preset test results (any that needed auto-repair); the 5-7 new SSR proofs (paths); kind→DB integration with BRIEF 04 (if applicable); any preset you proposed cutting after seeing it render; bright ideas. Honesty section.

Per PROTOCOL.md: push `lt/grammar-presets`, write RETURN.md.
