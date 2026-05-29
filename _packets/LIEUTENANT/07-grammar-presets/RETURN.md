# RETURN — BRIEF 07: Grammar preset library integration

**Branch:** `lt/grammar-presets` (off `claude/bold-ride-Li5zK`). Pushed. Not merged.
**Status:** All five deliverables done. typecheck / test / build / proof — all green (real results below).

---

## What I built

1. **Moved + integrated the preset library.**
   - `git mv _packets/LIEUTENANT/_research/grammar-presets/presets.ts → atelier/lib/vibe/grammar/presets.ts` (history preserved).
   - Fixed the relative grammar-types import (`'../../../../atelier/lib/vibe/grammar/grammar'` → `'./grammar'`).
   - Re-exported the surface from the barrel `atelier/lib/vibe/grammar/index.ts`: `VIBE_PRESETS`, `OCCASION_VIBES`, `OCCASIONS`, `pickPreset`, `remix`, `remixAll`, `axesFromBrief`, and the types.
   - Refreshed the file's header (was "RESEARCH DRAFT — do not import").

2. **Extended the remix engine to cover the brief's full signal-word set.** Test requirement #5 names `"bolder"` and `"minimal"`, but **neither was mapped** in the research draft. Added:
   - a new `-texture` de-escalation axis (`remix` case + `MOTIF_PREV` inverse map) that strips decoration toward the floor (grain↓, wash↓, motif→…→none);
   - `axesFromBrief` signal mappings: `bold|bolder|boldest → +saturation`, `minimal|minimalist|cleaner|… → -texture`.

3. **Tests — `atelier/tests/unit/vibe-presets.test.ts`** (170 cases, all green). All 5 brief groups: every preset survives `generateAndRepair`; `OCCASION_VIBES` references only real `VibeKey`s; `pickPreset` over every occasion×edginess; `remix` 5×-in-band + 12×-clamp idempotence per axis; `axesFromBrief` signal mapping.

4. **Curator wiring — `atelier/lib/curator-tools/seed.ts`** (`seedVibeFromBrief(brief, occasion, edginess=0): Vibe`, plus a `…WithMeta` debug variant): `pickPreset` → `axesFromBrief`+`remixAll` → `generateAndRepair` → return `result.vibe`.

5. **Expanded `OccasionType` 10 → 22.** Unified it with the grammar's `OccasionKey` (single source of truth), made `OCCASION_TEMPLATES` a `Partial` map, rewrote `classify-occasion.ts` to the 22-taxonomy, updated `system-prompt.test.ts`.

6. **SSR proof additions** — 7 new proof fixtures wired into `fixtures.ts` (`PROOF_VIBES`); the route + render script generalize over `PROOF_VIBES`, so both auto-pick-up the new vibes.

---

## Verification (run myself — real results)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm --prefix atelier run typecheck` | **0 errors** |
| Tests | `npm --prefix atelier run test` | **383 passed / 28 files** (170 new) |
| Build | `APP_URL=… npm --prefix atelier run build` | **clean**; `renderer-proof/[vibe]` SSG prerenders **11 paths** (3 existing + 7 new + `all`) |
| SSR proof | `APP_URL=… npm --prefix atelier run proof:render` | **10/10 PASS a11y gate, 0 repairs, never SAFE_DEFAULT** |

⚠️ **Build env caveat (not a code issue):** `lib/env.ts` requires `APP_URL` (`z.string().url()`) — the only *required* env var. A fresh container has no `.env`, so the first `next build` fails page-data collection on `/api/webhooks/clerk`. With `APP_URL=http://localhost:3000` the build is clean. Compilation + TypeScript both passed *before* the env step, so this never reflected my changes.

---

## Preset test results

- **All 40 presets pass with ZERO vibe-level auto-repairs** and are **never** replaced by `SAFE_DEFAULT`. So the brief's "auto-repair count == 0" goal holds — **at the vibe level**. See pitfall #2 for why the raw count isn't literally 0.
- When a preset's vibe is wrapped in a full, legal section list (the proof fixtures), composition repairs are **0** too — confirmed by the proof render (`repairs=0` for all 10).

## The 7 new SSR proofs (paths)

`atelier/scripts/proof-out/{cottage-warm,chalk-line,velvet-rope,zine-punk,gummy-bear,dusk-poem,concrete-poet}.html` (+ regenerated `index.html` gallery & `report.json`). In-app routes: `/renderer-proof/<key>` for each (prerendered).

Genuinely distinct (from `report.json`): backgrounds span warm-cream `#fff0ed` (cottage), dim warm-gray `#383130` (chalk), near-black `#140e0c` (velvet-rope), bright `#ffedff` (zine-punk), pale-aqua `#e4fafb` (gummy), dim-plum `#36303c` (dusk), cold-gray `#2d3437` (concrete) — across light/dim/dark keys, accents from terracotta to vivid green `#099c00` to steel-blue. All clear WCAG by construction.

## A preset to cut?

**None of the 7 rendered argue for cutting.** Each holds a distinct identity on the same Maya-housewarming content. Honest caveat: I eyeballed the **palette/contrast data + emitted CSS vars** for all 10 (no browser in this env to pixel-inspect), and only **7 of 40** presets were rendered to HTML — the other 33 are test-validated (valid + contrast-safe) but not visually reviewed. I held the line on **40, not 50** — added nothing, cut nothing.

## BRIEF 04 integration (kind→DB / set_vibe_from_occasion)

`lib/curator-tools/` and `set_vibe_from_occasion` **do not exist yet** — BRIEF 04 hasn't landed, so there was **no stub to replace**. I created `seed.ts` as the ready integration point and documented (in-file) that `set_vibe_from_occasion` should call `seedVibeFromBrief` / `pickPreset` when it lands.

---

## Integration pitfalls (the valuable part)

1. **The research draft never compiled against atelier's strict tsconfig.** `noUncheckedIndexedAccess: true` made `pickPreset`'s `VIBE_PRESETS[ranked[idx]]` a TS2538 error (`ranked[idx]` is `VibeKey | undefined`). Fixed with a total-indexer fallback (`ranked[idx] ?? 'paper-letter'`, commented as unreachable).

2. **Empty `sections` → one unavoidable composition repair.** Presets carry `sections: []` by design. `generateAndRepair` therefore always runs `ensureExactlyOneFocal` on an empty list, finds focal-count 0 ≠ 1, and emits exactly **one** repair: `STRUCTURE @ sections.emphasis: R7 focal count 0 → 1`. It is identical for all 40 and **independent of the vibe**. So a literal `repairsApplied.length === 0` assertion on raw presets is *wrong*. The test asserts the meaningful thing instead: **0 vibe-level repairs** (no `FONT_PAIR`/`SCALE_RATIO_*`/`*_REM`/`MEASURE_*`/`GRAIN`/`WASH`/`MOOD_*`) and that the lone leftover repair is exactly the benign R7 focal fix.

3. **`weird-pair` legitimately triggers a `FONT_PAIR` auto-repair.** It weirdens `displayRole` toward `script`; `(script, mono)` isn't in `LEGAL_FONT_PAIRS`, so the engine repairs `bodyRole → sans` for the 9 mono-body presets (`museum-label, flag-stand, neon-club, racing-stripe, zine-punk, arcade-cabinet, soft-brutalist, concrete-poet, wireframe`). This is the operator behaving exactly as its own code comment predicts — a correct auto-repair, not a bug. The remix in-band test accounts for it (asserts "stays legal + contrast-safe; only `weird-pair` may introduce that one repair").

4. **`OccasionType` was LIVE code, not dead Tailwind-era code.** The brief hedged "if dead, let it die" — but it drives occasion-template skill loading in `app/api/chat/route.ts` and is locked by `system-prompt.test.ts`. So I expanded it carefully rather than deleting:
   - `OccasionType = OccasionKey` (single source of truth, type-only import).
   - `OCCASION_TEMPLATES` → `Partial<Record<…>>`: the 10 launch templates remapped onto the 22 keys (`holiday` file → `holiday-cheerful` + `holiday-tender`; `teen-grad` file → `teen-bday` + `graduation`; `princess-bday` → `kid-bday-littles`). The other 10 occasions classify but inject no template (Block 3 already guards `if (tpl)`).
   - Rewrote `classify-occasion.ts` to the 22-taxonomy (added engagement/bachelor/divorce/sympathy/get-well/housewarming/promotion/baby-arrival/etc.), **preserving every existing test mapping except** `graduation`, which is now its own key (was the combined `teen-grad`) — that one locked assertion was updated and a new test added for the expanded set.
   - **Cosmetic nuance:** the template FILES keep their launch names, so a remapped template's skill *label* uses the new taxonomy key while its body still references the legacy name. Purely cosmetic; the prompt content is byte-identical. (Follow-up: rename the files to kill the mismatch.)

5. **`flip-key` and `shift-hue` are not idempotent.** `flip-key` oscillates light↔dark (dim is a fixed pivot); `shift-hue` rotates mod 360. The brief's "applied 5× idempotently" only holds for the **monotone** axes; the cyclic two "stay in band" (always valid) but never converge. The test checks idempotence-at-the-cap only for monotone axes and in-band-only for the cyclic two. (Also: `+contrast` from a low base like `museum-label`'s 1.18 doesn't reach the 1.95 cap by 5×, so the clamp test uses 12×.)

---

## Judgment calls (flagging for orchestrator review)

- **`"bolder" → +saturation`** (not `+contrast`): "louder" already owns `+contrast` (type-scale drama), so mapping "bolder" to chromatic intensity gives the curator two distinct levers. Defensible either way — one-line change in `SIGNAL_AXES` if you'd rather `+contrast`.
- **`"minimal" → -texture`** (new axis): the single most impactful "make it minimal" gesture inside the grammar is stripping decoration (motif/grain/wash). Bidirectional remix now exists for texture only; see bright ideas.
- **`seedVibeFromBrief(brief, occasion, edginess=0)`**: the brief wrote `(brief, occasion)` but step 1 says "pickPreset(occasion, edginess)", so I added `edginess` as an optional 3rd param.

## Stubbed / skipped (plainly)

- **Did NOT create the `set_vibe_from_occasion` tool** — that's BRIEF 04's, and it doesn't exist yet. `seed.ts` is the ready hook.
- **Did NOT rename occasion-template skill files** — out of scope; hence the cosmetic label/body mismatch in pitfall #4.
- **Did NOT pixel-inspect rendered HTML** (no browser in this env) — distinctness verified via palette hexes, key levels, section-variant choices, and the a11y gate. 33 of 40 presets are test-validated but not rendered to HTML.

## Bright ideas

- **`pickComposition()`** is the missing other half: presets define a *vibe*, not a *layout*. A companion that picks legal section layouts per occasion + content count would close the "great page in 1–2 turns" loop and eliminate the spurious R7 repair (pitfall #2) at the source.
- The empty-section R7 repair smell argues for a **vibe-only validation entry** (validate the seed, skip composition) for the seed/preview path — `seed.ts` already sidesteps it by returning `result.vibe`, but a named API would be clearer.
- `axesFromBrief` could grow a small **inverse set** (`-saturation`, `+voice`) for fully bidirectional remix once curators ask to dial *down*, not just up.
- **Rename the 10 occasion-template files** to the new taxonomy keys in a follow-up to remove the cosmetic label mismatch.

---

## Honesty

Everything above is the real state. typecheck/test/build/proof were run by me and are green (with the documented `APP_URL` env prerequisite for `build`/`proof`, which is environmental, not a code defect). The one place I diverged from the brief's literal wording — "auto-repair count == 0" — is because the empty-section R7 repair makes the literal count 1, not 0; I asserted the stronger/真 invariant (0 *vibe-level* repairs, never SAFE_DEFAULT) and documented exactly why. Two signal-word mappings the brief's tests required (`bolder`, `minimal`) didn't exist in the draft; I added them and flagged the judgment calls. No inflation: 7 of 40 presets were visually rendered; the rest are validated by test only.
