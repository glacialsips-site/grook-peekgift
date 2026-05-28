# MEMORY.md navigation test #001 — cinematic reveal slowdown task

**Imaginary task:** Frank says the cinematic reveal feels too fast on `vibe.motion === 'soft'` (claimed currently 0.6× speed multiplier). He wants it slowed to 0.4×. Find the file(s) and line(s) to change.

## Files I opened, in order

1. `_packets/MEMORY.md` — entry point (per instructions). Read all of §0 + §1 task index.
2. `_packets/SPINE/skills/reveal-mechanics.md` — pointed to by §1.5 line 122 ("Read in order: 1. skills/reveal-mechanics.md").
3. `atelier/components/recipient/cinematic-reveal.tsx` (first 50 lines only) — pointed to by §1.5 line 123 (#2 in read-order). Read just the header to confirm where `MOTION_SCALE` lives. Import on lines 7-13 shows the math is exported from `@/lib/reveal/phases`, so I jumped there next instead of reading the full component.
4. `atelier/lib/reveal/phases.ts` (first 80 lines) — pointed to by §1.5 line 124 (#3 in read-order). `MOTION_SCALE` constant found at lines 35-39. STOPPED here — confident answer.

**Total files: 4** (MEMORY.md + 3 pointers it gave me).

## Sections I deliberately did NOT reload (per §2 "Do Not Reload" or per task scope)

- §1.1 (chat loop), §1.3 (tools), §1.4 (auth), §1.6 (Stripe), §1.7 (services), §1.8 (Supabase), §1.9 (Netlify) — scanned task-index headers, skipped bodies. Not reveal-related.
- §2 archived files (AUDIT.md, ORCHESTRATOR-NOTES.md, etc.) — MEMORY.md flagged these as confusing. Skipped.
- Full body of `cinematic-reveal.tsx` (lines 51-end) — the import on line 7-13 told me the constant lives in `phases.ts`. Reading the rest would have been wasted context.
- `phases.ts` lines 81-end — found the constant at line 35-39; no need to read the rest.

## Cross-references that mattered

- **MEMORY.md §1.5 → reveal-mechanics.md → cinematic-reveal.tsx → phases.ts.** Clean four-hop trail. §1.5 line 127 was the killer hint: "Vibe.motion drives all timing (0.6 soft / 1.0 standard / 1.25 lively)". That number-set immediately confirmed I was on the right scent (even though the labels turn out to be wrong — see "wasted time" below).
- The "Read in order" list at §1.5 lines 122-124 explicitly named all three downstream files. No guessing required.
- The import line in `cinematic-reveal.tsx` (lines 7-13) routing to `@/lib/reveal/phases` confirmed where the constant lives without having to read the whole component.

## Cross-references that wasted time

- **MEMORY.md §1.5 line 127** says: "Vibe.motion drives all timing (0.6 soft / 1.0 standard / 1.25 lively)". This is WRONG. The real constant in `phases.ts:35-39` is `{ still: 0.6, soft: 1, lively: 1.25 }`. There is no "standard" key; the slow one is `still`, not `soft`. Cost me ~30 seconds reconciling Frank's task wording against the actual code.
- **reveal-mechanics.md line 38** had the correct values (`still: 0.6, soft: 1, lively: 1.25`). So the skill doc is right; MEMORY.md's parenthetical summary is the drift. The skill doc was also somewhat overkill for this task — 395 lines, when only the 4-line `MOTION_SCALE` block at line 38 mattered. It DID resolve the MEMORY.md inconsistency, so not pure waste, but borderline.

## Missing pointers (had to grep / guess)

- None. MEMORY.md §1.5 was sufficient. Did not need to grep, search, or guess.

## Loops / circular references hit

- None. The trail was strictly linear: MEMORY → skill → component → phases. No A→B→A backtracking.

## Final answer to the task (just to verify I actually got there)

**The task description is internally inconsistent with the codebase.** Frank claims `vibe.motion === 'soft'` is currently 0.6×. The actual code at `atelier/lib/reveal/phases.ts:35-39` says:

```ts
export const MOTION_SCALE: Record<VibeMotion, number> = {
  still: 0.6,
  soft: 1,
  lively: 1.25,
};
```

`soft` is 1.0×, not 0.6×. The 0.6× value lives on the `still` key. Frank is almost certainly conflating "soft" (the label) with "still" (the actually-slow option), OR he wants `soft` itself dropped from 1.0× to 0.4×.

Two plausible interpretations + the edit each implies:

- **Interpretation A** (Frank meant `still`, since that's the 0.6 one): edit line 36 from `still: 0.6,` → `still: 0.4,`.
- **Interpretation B** (Frank literally means `soft` should be slower): edit line 37 from `soft: 1,` → `soft: 0.4,`. But note this would make `soft` SLOWER than `still`, which inverts the semantic ordering of the names — likely not what he wants.

**Most likely intended edit:**

- File: `/home/user/grook-peekgift/atelier/lib/reveal/phases.ts`
- Line: 36
- Diff: `-  still: 0.6,` → `+  still: 0.4,`

Before applying, I'd push back on Frank with: "MEMORY.md §1.5 has 'soft' labeled at 0.6 but the actual code has `still: 0.6, soft: 1, lively: 1.25`. Which key do you actually want at 0.4? (My guess: `still`.)"

There is also a snapshot/jest test that asserts the scale values (per skill §2 "Tests should cover the phase sequence as a snapshot") — likely under `atelier/lib/reveal/` or `atelier/__tests__/`. Did not open it; would need to update it as part of the real edit, but task said stop when I'm confident on the source line.

## Verdict on MEMORY.md as retrieval index

**Worked but with minor issues** (would call it 🟡, not green).

Pros:
- §1.5 named all three relevant files in correct read-order. Zero grep needed.
- §2 "do not reload" list saved me from opening 8+ archived files.
- The §1 task-index pattern (enter the matching subsection, ignore the rest) is exactly right for retrieval economy. I read MEMORY.md + 3 files instead of 20.

Cons:
- **§1.5 line 127 has the wrong key name** ("0.6 soft / 1.0 standard / 1.25 lively"). The real keys are `still / soft / lively`. This is the load-bearing fact future-me needs to remember, and it's wrong in the index. Cost me one extra file-read (the skill doc) to reconcile.
- The skill doc `reveal-mechanics.md` is 395 lines. For a "what's the constant value" lookup, that's overkill. Could be split: a short reference block at the top, then long-form design rationale below.
- `phases.ts` is the file with the actual constant, but it's listed third in the read-order. For a value-change task it should be first. The read-order is currently optimized for design-context, not for surgical edits.

## Suggested edits to MEMORY.md to make this faster next time

1. **Fix §1.5 line 127.** Replace `"Vibe.motion drives all timing (0.6 soft / 1.0 standard / 1.25 lively)"` with `"Vibe.motion drives all timing. MOTION_SCALE lives in atelier/lib/reveal/phases.ts: { still: 0.6, soft: 1, lively: 1.25 }."` That single edit would have let me skip the skill-doc hop entirely — straight from MEMORY → phases.ts.

2. **Add a "fast path for surgical edits" hint at §1.5 line ~125.** Something like: `"For a value tweak, jump straight to phases.ts (it owns all timing constants). For a design change, start with reveal-mechanics.md."` Differentiates value-edit vs design-edit retrieval paths.

3. **Re-order the §1.5 read-list for the "tweaking timing" case.** Current order is design-first (skill → component → phases). For most actual work the order should be: phases.ts (constants) → cinematic-reveal.tsx (consumes them) → reveal-mechanics.md (only if changing the design). Could add a one-line note: `"read order above is for design changes; for timing tweaks, reverse it"`.

4. **Consider a one-line "where do constants live" map** in §0 or near each §1.x subsection. Example: `"All reveal timing constants: phases.ts. All vibe-token mapping: css-vars.ts. All curator prompt text: SPINE/CURATOR_PROMPT.md."` These three-word pointers would beat the multi-file read-orders for value lookups.

5. **The §2 "do not reload" list is great. Keep it. Maybe add a counterpart §2.5 "files that are SHORT and worth a re-skim"** for the genuinely tiny load-bearing files (under 100 lines, e.g. `defaults.ts`, `phases.ts` header).

Overall: MEMORY.md is a real retrieval index, not a knowledge dump, and it works. Fix the one wrong constant (§1.5 L127) and the next future-me lands the answer in 2 file-reads instead of 4.
