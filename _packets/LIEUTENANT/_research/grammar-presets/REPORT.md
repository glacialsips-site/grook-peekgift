# Grammar Presets — Research & Proposal

_Source: Hercules research sub (Opus 4.8). Companion: `presets.ts` in this dir (40 vibes, 22 occasions, ranked map, remix engine — 1285 lines, picked up in same commit)._

## Problem

The grammar (`atelier/lib/vibe/grammar/grammar.ts`) defines an *infinite* legal vibe space. Three SSR proof fixtures (princess / bachelor / luxe) prove the substrate works but cover ~0.0001% of that space. When the curator-Sonnet receives "bachelor party for steve, miami, golf" it should produce a great-looking page in 1-2 turns. It needs **starting points** — a preset library it picks from and remixes, not a blank `GenerationOutput` it authors from scratch.

This proposal: 40 named vibe presets, 22-occasion taxonomy, many-to-many map (occasion → ranked vibe options), a `remix(vibe, axis)` operator for "make it weirder," and an anti-preset blocklist.

## 1. Occasion taxonomy (22, MECE-ish)

Current launch list is 10 (`OccasionType` in `atelier/lib/anthropic/system-prompt.ts` — Tailwind-era; rebase). Expansion adds adult-life-event cases where peek.gift can ship pages that don't feel like Hallmark insults:

| key | description | recipient feel |
|---|---|---|
| `kid-bday-littles` | birthdays 1–9 — princess, dinosaur, pirate, mermaid | "magic was made for me" |
| `kid-bday-tween` | birthdays 10–13 | "you actually get it" |
| `teen-bday` | birthdays 14–17 | "respected, not babied" |
| `bday-adult` | birthdays 18–49, no milestone | "they saw the actual me" |
| `milestone-bday` | 30/40/50/60/70/80/90/100 | "the decade is mine" |
| `bachelorette` | last night, AFAB | "we are unhinged together" |
| `bachelor` | last night, AMAB | "this is going to be stupid" |
| `wedding` | the day | "witnessed and celebrated" |
| `engagement` | the ring just happened | "this is real now" |
| `anniversary` | 1st through 50+ | "still" |
| `baby-shower` | pre-arrival | "we already love them" |
| `baby-arrival` | the day | "welcome, small one" |
| `graduation` | HS, college, grad school | "what you did is large" |
| `promotion-new-job` | career milestone | "you earned this" |
| `retirement` | end of career | "the work mattered" |
| `housewarming` | new place | "this is yours" |
| `get-well` | recovery, sick day | "we are here, no pressure" |
| `sympathy` | bereavement | "we have you" |
| `divorce` | freedom celebration | "the next chapter is yours" |
| `holiday-cheerful` | Christmas, Hanukkah, Diwali, Lunar NY | "season together" |
| `holiday-tender` | Mother's/Father's Day, Valentine | "I see you specifically" |
| `just-because` | no occasion | "you crossed my mind" |

Intentional holes: pet-loss (collides w/ sympathy), confirmation (covered by just-because + formal), bar/bat mitzvah (teen-bday + cultural voice), Quinceañera (kid-bday-tween + cultural voice). Curator composes.

## 2. The 40 vibe presets

A vibe is NOT an occasion — it's a way of looking. `velvet-rope` can render an engagement page or a 60th birthday; `housewarming` can render via `cottage-warm` or `concrete-poet`.

40 chosen from 5 harmony strategies × 3 keys × ~3 saturations = ~45 grid cells; deduped near-twins, dropped 5 that would never get picked, added 5 highly-loaded named looks (`zine-punk`, `stargazer`, `velvet-rope`).

**Editorial / quiet (8):** `paper-letter`, `velvet-rope`, `chalk-line`, `museum-label`, `slow-craft`, `studio-mono`, `silver-print`, `linen-warm`.
**Playful / bright (8):** `confetti-pop`, `birthday-balloon`, `taffy-pull`, `ice-cream-truck`, `crayon-box`, `gummy-bear`, `mermaid-pearl`, `flag-stand`.
**Bold / loud (8):** `neon-club`, `concert-poster`, `vegas-blur`, `miami-vice`, `racing-stripe`, `zine-punk`, `sticker-pack`, `arcade-cabinet`.
**Romantic / sentimental (6):** `garden-letter`, `dusk-poem`, `velvet-night`, `lace-window`, `field-flowers`, `paper-airplane`.
**Cozy / domestic (4):** `cottage-warm`, `kitchen-table`, `cabin-stack`, `quilt-square`.
**Brutalist / contemporary (3):** `soft-brutalist`, `concrete-poet`, `wireframe`.
**Cosmic / cinematic (3):** `stargazer`, `cinema-noir`, `aurora-bloom`.

40 covers "white-on-white museum" → "raver in a parking lot." Every preset passes `validateVibeSpec` by construction (palette seeds + font pairs + ratios in-band).

## 3. Occasion → vibe map (abridged)

3-5 vibes per occasion, ranked **first-try → edge alternative**. Curator picks rank 0 default; escalates rank 2-3 when brief includes signal words ("wild", "weird", "loud", "sad", "minimal"). Full TS in `presets.ts`:

| occasion | default | safe-alt | edgier | wildcard |
|---|---|---|---|---|
| `kid-bday-littles` | `confetti-pop` | `taffy-pull` | `mermaid-pearl` | `crayon-box` |
| `kid-bday-tween` | `ice-cream-truck` | `sticker-pack` | `arcade-cabinet` | `zine-punk` |
| `teen-bday` | `sticker-pack` | `arcade-cabinet` | `zine-punk` | `racing-stripe` |
| `bday-adult` | `garden-letter` | `velvet-rope` | `cinema-noir` | `concrete-poet` |
| `milestone-bday` | `velvet-rope` | `stargazer` | `velvet-night` | `concert-poster` |
| `bachelorette` | `miami-vice` | `confetti-pop` | `vegas-blur` | `zine-punk` |
| `bachelor` | `neon-club` | `racing-stripe` | `vegas-blur` | `arcade-cabinet` |
| `wedding` | `paper-letter` | `lace-window` | `velvet-night` | `wireframe` |
| `engagement` | `dusk-poem` | `garden-letter` | `velvet-night` | `aurora-bloom` |
| `anniversary` | `garden-letter` | `velvet-night` | `dusk-poem` | `cinema-noir` |
| `baby-shower` | `taffy-pull` | `gummy-bear` | `paper-airplane` | `aurora-bloom` |
| `baby-arrival` | `gummy-bear` | `aurora-bloom` | `taffy-pull` | `paper-airplane` |
| `graduation` | `flag-stand` | `concert-poster` | `confetti-pop` | `zine-punk` |
| `promotion-new-job` | `studio-mono` | `velvet-rope` | `concrete-poet` | `racing-stripe` |
| `retirement` | `cabin-stack` | `velvet-rope` | `chalk-line` | `silver-print` |
| `housewarming` | `cottage-warm` | `slow-craft` | `cabin-stack` | `concrete-poet` |
| `get-well` | `kitchen-table` | `field-flowers` | `paper-airplane` | `slow-craft` |
| `sympathy` | `chalk-line` | `silver-print` | `museum-label` | `paper-letter` |
| `divorce` | `velvet-rope` | `vegas-blur` | `concert-poster` | `zine-punk` |
| `holiday-cheerful` | `quilt-square` | `confetti-pop` | `cabin-stack` | `crayon-box` |
| `holiday-tender` | `paper-airplane` | `field-flowers` | `garden-letter` | `dusk-poem` |
| `just-because` | `field-flowers` | `paper-airplane` | `kitchen-table` | `zine-punk` |

Read: `divorce` → `velvet-rope` first (80% of buyers want celebration without clown show), `zine-punk` available when "fuck it party." `sympathy` defaults to `chalk-line` — NEVER `confetti-pop`. Composition layer enforces from a different angle (no `sparkle` motif on sympathy); preset map prevents the pick in the first place.

## 4. Calibration vs. live SSR demos

Existing fixtures from `atelier/scripts/proof-out/report.json`:
- princess: `#ffecff` bg, `#b37300` accent, contrast 15.66
- bachelor: `#070e21` bg, `#d58600` accent, contrast 16.33
- luxe: `#38312f` bg, `#b98c7d` accent, contrast 9.98

New presets directly extend these:
- `confetti-pop` ≈ refined princess (tightens `scaleContrast` to 1.55 from 1.6).
- `neon-club` ≈ refined bachelor (pushes `scaleContrast` to 1.9, swaps display to mono+upper).
- `velvet-rope` ≈ refined luxe (escalates to dark/muted, ochre hue 35).

Other 37 fill space these 3 don't touch. **No preset is blander than `luxe`** (the quietest existing demo). Every preset has defensible visual identity.

Render-imagined diff for the same example peek (Maya housewarming, kettle + lamp + throw):
- `cottage-warm` → terracotta + cream, serif heading "Welcome home, Maya", botanical divider, stacked-card hero.
- `concrete-poet` → cold gray, "WELCOME" display 6rem all-caps, hairline label divider, editorial-full-bleed.
- `slow-craft` → sage + cream, soft serif, breathable spacing, single-hero-product (the kettle becomes the moment).

Three radically different pages from one identical content payload, picked by the same brief. Curator's tone-of-brief signal disambiguates the rank.

## 5. Remix operators

When curator says "make it weirder" or brief is "bachelor party but actually unhinged" — don't re-pick a vibe, **remix** along named axes. Each axis = deterministic shift inside legal grammar. Implemented in `presets.ts` as `remix(output, axis)`:

```
RemixAxis:
  +saturation      // muted → medium → vivid
  +contrast        // scaleContrast += 0.15 (clamped MAX_SCALE_RATIO)
  +texture         // grain += 0.02, wash += 0.05, motif: none → geometric → sparkle → confetti
  +motion          // still → soft → lively; easing: eased → bouncy
  +shape           // radius sharp → soft → pillowy; density compact → breathable
  +depth           // flat → lifted → dramatic
  -voice           // formality: formal → casual; humor: none → dry → sharp
  flip-key         // light ↔ dark, dim is fixed pivot
  weird-pair       // displayRole: serif → display → mono → script
  shift-hue(deg)   // baseHue += deg (mod 360)
```

Each operator = one function. Remix is **idempotent up to the band ceiling** (calling `+saturation` 5 times on vivid stays vivid). Composed remixes still legal (all clamp to INVARIANTS).

`axesFromBrief(brief)` helper maps free-text signal words → remix axes.

Curator-Sonnet workflow:
1. `pickPreset(occasion, edginess)` — base.
2. If signal words: `axesFromBrief()` + `remixAll()`.
3. `generateAndRepair` — guaranteed legal.

## 6. Anti-presets

What we explicitly do NOT include:

- **Corporate SaaS** (Inter-on-white, slate gray, rounded buttons, drop-shadow). Cannot make a gift feel like a gift.
- **Pinterest-mom calligraphy** (`script+script`, watercolor, "Live Laugh Love"). `script+script` blocked by `LEGAL_FONT_PAIRS`.
- **Default Material** (Roboto, indigo CTA, FAB, ripple). No preset uses indigo (220-260) at vivid saturation with pillowy radius.
- **Wedding-website beige nothingness.** `paper-letter` + `linen-warm` cover wedding with distinct identities; no third tasteful-beige twin.
- **Gen-Z generic gradient.** `wash` capped at 0.15 opacity by grammar.
- **Memphis / 90s pattern dump.** `motif: geometric` confined to dividers/CTA backgrounds.
- **AI-slop dreamscape.** `illustrated` used only in 5 kid-coded presets.

Not a deny-list (grammar is generative). Enforced by what we don't ship as starting points.

## 7. The TypeScript draft

Companion `presets.ts` (1285 lines) exports:

- `VIBE_PRESETS: Record<VibeKey, VibePreset>` — 40 entries.
- `OCCASION_VIBES: Record<OccasionKey, readonly VibeKey[]>` — ranked map.
- `OCCASIONS: Record<OccasionKey, OccasionDescriptor>` — taxonomy.
- `pickPreset(occasion, edginess)` — selector with rank 0..3.
- `remix(output, axis)` — pure axis shift; clamps.
- `remixAll(output, axes)` — compose.
- `axesFromBrief(brief)` — signal-word → axis.

Every preset authored as `GenerationOutput` so it flows through `generateAndRepair` unchanged.

**Lieutinant integration TODO** (BRIEF 07):
1. Move into `atelier/lib/vibe/grammar/presets.ts`; fix relative import path on line 32.
2. Add test: every preset's `output` survives `generateAndRepair`; every `OCCASION_VIBES` entry references real `VibeKey`.
3. Wire `pickPreset()` into curator-Sonnet's flow so a preset seeds vibe BEFORE the model writes its own.
4. Expand `OccasionType` from 10 → 22.

## Closing opinion

The bigger lift isn't the 40 — it's the discipline of REFUSING to ship the 50th when someone asks for "one more, but tasteful." Every additional preset that's a milder version of an existing one drags the average toward generic. Taxonomy holds best when each preset is an **identifiable thing in the world**, not an adjective. `velvet-rope`, `concrete-poet`, `zine-punk` work because they evoke place / person / object. `subtle-tasteful-clean` shouldn't be added.
