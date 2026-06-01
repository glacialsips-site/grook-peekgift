# peek.gift — Aesthetic Gap Analysis (renderer vs. hand-built mockups)

**Mission:** the rendered pages must be *at least* as good as the bespoke mockups. They are not yet. This documents WHY, with screenshots, feature by feature, and maps every gap to an exact file + a [R]/[I]/[T]/[S] root cause.

**Method.** Each pair captured full-page at 430px CSS width, deviceScaleFactor 2 (`/tmp/diag/*.png`). Renderer pages painted by the real `lib/peek-render` via a throwaway `app/diag` route that un-clamps the renderer's internal scroll so the whole column captures (the renderer is otherwise untouched). Mockups served static from `public/_mock`. A second clamped-device capture (`*_render_bar.png`) shows the sticky CTA + running total.

**Tags.** `[R]` renderer archetype too generic · `[I]` the IR under-specifies (the bespoke move should be authored into a `custom` block / richer theme, but isn't) · `[T]` theme/scene/texture fidelity weak in the renderer · `[S]` stub-only artifact (not the renderer's fault, e.g. a placeholder where a real asset goes).

Screenshots:
- `dad_render.png` / `dad_mockup.png` / `dad_render_bar.png`
- `gala_render.png` / `gala_mockup.png` / `gala_render_bar.png`
- `taquito_render.png` / `taquito_mockup.png` / `taquito_render_bar.png`

---

## PAIR A — "For the Old Man" (dad's 60th, hardware work-order)

`dad_render.png` vs `dad_mockup.png`. IR: `peek-jumpoff/samples/dad-60th.ir.json`.

This is the clearest indictment of the hypothesis: the IR is faithful and the *concept* survives, but every signature treatment is flattened into a generic archetype.

| Feature | Mockup (the bar) | Renderer (what we got) | Tag | Fix → file |
|---|---|---|---|---|
| **Display type** | Oswald 58px, line-height .9, uppercase, "OLD MAN" line in **rust** (`h1 em{color:var(--rust)}`) | Oswald renders, sized right, but **both lines olive** — no rust accent word | **[I]** | Hero headline can't carry an inline color span. Author `headline_html`/accent-word support: `lib/ir/contract.ts` hero data + `buildHero`/`mkHead` in `lib/peek-render/sections.ts:734`. Short-term the IR could split the accent into the theme, but the renderer has no mechanism at all — so primarily renderer. |
| **THE bold move — "The Haul"** | A **work-order checklist**: each line is `grid 24px 1fr auto`, a **2px-bordered checkbox with a rust check SVG**, name in Oswald caps, an **inline source chip** (`duluth`/`amazon`/`local`), price in the right rail, rows divided by **`1px dashed var(--line)`** (`.line :52-57`) | A **horizontal carousel of square photo cards** (generic e-commerce). No checkboxes, no dashed rules, no right-rail prices, source chip floats on the image | **[R]** (+[I]) | `buildGiftgrid` (`lib/peek-render/sections.ts:139`) only ever emits a flex carousel of `cardFace` tiles. It needs a **checklist/line-item layout variant** (driven by `data.layout:'checklist'` or `frame:'ticket'`), per `SHELL_SPEC.md:565` which explicitly cites `For the Old Man .chk`. Until then the chat must author the haul as a `custom` block — i.e. the IR also under-specifies. |
| **Hero photo** | 200px framed photo block, 2px ink border, dark caption bar ("Dad + me, opening day…") | **No photo at all** — `type-mega` hero skips media when `hero.url` is null | **[R]/[S]** | `type-mega` in `buildHero` (`sections.ts:842`) renders no media even as a placeholder; the mockup shows a `[YOUR PHOTO]` framed slot. Give `type-mega` an optional framed placeholder when `hero` media exists but is unfulfilled. (`[S]` insofar as the real photo is user-supplied; but the *slot* should still render.) |
| **Dinner ticket** (2nd bold move) | Olive ticket with **punched notch half-circles on both edges** + **dashed perforation line** + foot row "TABLE FOR 2 / NO LAWN ALLOWED" (`.ticket :60-68`) | Plain olive rounded rectangle, **no notches, no perforation, no foot row** | **[I]** | The dad IR's `custom` html (`dad-60th.ir.json` `s_ticket`) is a *simpler* ticket than the mockup — notches/perforation omitted. The renderer's `frame:'ticket'` in `scenes.ts:317` DOES draw notches; nothing routes the custom block through it. Either enrich the custom html (IR) or expose a `ticket`-framed section wrapper. Primarily IR. |
| **Texture / paper grain** | Strong kraft paper: `feTurbulence` at **opacity .07**, body framed dark (`#171407`) so the kraft panel pops | Grain overlay present but **opacity .06 and washed out**; no dark frame, so the page reads flat/pale | **[T]** | Grain is fixed at `opacity:.06` in `scenes.ts:172`. Make texture strength a token, and consider a page-frame/letterbox. The kraft never reads as paper. |
| **Sticky CTA + running total** | `$74 + dinner` / "The whole job" — **precomputed sum** always visible, rust button "Send it to Dad →" | Bar meta reads **"BIRTHDAY / something"**, value is the **empty fallback** (no "$74 + dinner") until you tap-and-claim each card; button OK | **[R]/[I]** | `refreshTotal` in `shell.ts:148` sums only **claimed** cards; nothing is claimed at rest, so the headline total is empty. The mockup shows the *catalogue* total. Add an at-rest "sum of all items" mode (or seed claimed) — `computeTotal`/`formatTotal` in `cards.ts:137`, wired in `shell.ts`. Also the meta label "BIRTHDAY" is a truncated `occasion`; the mockup's is "The whole job". |
| Ledger strip (For/Occasion/From) | 2px ink borders, Oswald values | Renders well — closest match on the page | — | OK |
| Note block | Roboto-Mono, ink border, rust bold words | Renders well (display font, accent-tinted box) | — | OK |
| Steps "How It Ships" | n/a in mockup as chips | 3 numbered chips, fine | — | OK |

**Verdict (A):** the page is recognizably the same concept but reads "tasteful template," not "hand-built work order." The single biggest loss is the **giftgrid → generic carousel** where the mockup's defining artifact is a **dashed checklist with checkboxes + inline source chips** ([R]). Second is the **empty running total** ([R/I]).

---

## PAIR B — Charity Gala (The Lumière Gala)

`gala_render.png` vs `gala_mockup.png`. IR: `peek-jumpoff/samples/charity-gala.ir.json` (authored for this diagnosis; validates).

The renderer does *well* here on type and dark mode — but loses the editorial architecture. (Note: Unsplash photos are blocked by the sandbox in both captures, so both show themed gradient blocks; judge layout/type/treatment, not the imagery.)

| Feature | Mockup | Renderer | Tag | Fix → file |
|---|---|---|---|---|
| **Display type** | Bodoni Moda, `<em>Gala</em>` in **italic** (the signature serif contrast), italic Bodoni sub | Bodoni renders (good), but **"Gala" is not italic** — headline is plain text | **[I]/[R]** | Same root as dad's rust word: no inline italic/accent span in hero headline. `contract.ts` hero data + `mkHead` (`sections.ts:734`). |
| **Hero composition** | `min-height:100vh`, wide brass eyebrow tracking, countdown w/ champagne labels, meta line, **two outline CTAs + scroll cue** | Clean dark hero + countdown, but **no hero CTAs, no scroll cue, less vertical air** | **[T]/[R]** | Full-bleed hero in `buildHero` (`sections.ts:778`) has no CTA row / scroll-cue affordance; relies on sticky bar. Editorial rhythm (the `100vh` breathing) isn't expressed. |
| **Intro + STAT BAND** | Centered Bodoni **lede pull-quote** + body, then a **3-up stat band** with **count-up numerals** (£1.2M / 30 / 14) and hairline dividers (`.stats :126-133`) | **Missing entirely** — there is no lede/stats archetype, so the IR can't author it without `custom` | **[I]/[R]** | No `stats`/`lede` section kind. `SHELL_SPEC.md:368` explicitly specifies a serif-numeral stats row with count-up (and `registerCounter` already exists in `shell.ts:316`, unused by any archetype!). Add a `stats` archetype: `contract.ts` SectionKind + a builder in `sections.ts`. High leverage — the count-up engine is already built and wired. |
| **Programme timeline** | Vertical **centered hairline spine** + **champagne dots with glow ring**, **right-aligned Bodoni-italic times**, Bodoni headings (`.programme :145-154`) | `flightplan`: **left dashed rail** + hollow dots, small accent-caps times, display headings | **[R]/[T]** | `buildFlightplan` (`sections.ts:552`) is a generic left-rail itinerary. The gala wants a centered engraved spine with serif-italic times. Either parametrize flightplan (spine position, dot style, time face) or add a `programme` treatment. |
| **Auction catalogue** | **Headline lot**: big image + emerald copy panel + "Register to bid" button, THEN a **2-col lot grid** w/ donor eyebrows, Bodoni names (underline-on-hover), italic estimates (`.headlot`/`.lots`) | `giftgrid`: a **cramped horizontal carousel of ~1.5 square cards**; the featured villa lot gets **no headline treatment** | **[R]** | `buildGiftgrid` ignores `featured`/`columns`: no full-width headline card, never a grid (always carousel). `SHELL_SPEC.md:316-345` explicitly requires a "featured/headline card spanning full width" + a real grid. Fix in `sections.ts:139`. |
| **Attend tiers** | 3 bordered tier cards, champagne labels, big Bodoni prices, hairline perks, "Best value" emphasis | `tiers`: vertical stack of 3 surface cards — **the closest match on the page** | **[R] minor** | `buildTiers` (`sections.ts:369`) maps well. Wants: bordered-on-dark (not lighter `surface`), visible featured ring, larger price face. |
| **Footer** | Engraved: Bodoni wordmark 30px, italic tagline, brass-separator info line, charity fine print | Minimal one-line footer (`mount.ts:166`) | **[R] minor** | Footer is a fixed minimal block; mockups treat the footer as a designed section. |
| Countdown | Brass numerals + champagne labels, live tick | Live countdown renders (display numerals, accent labels) — good | — | OK |
| Texture | grain + ken-burns photo hero w/ veil | grain present; hero photo blocked (`[S]`) | [S] | external img only |

**Verdict (B):** strong type/dark-mode foundation, but the renderer **has no editorial-architecture archetypes** — the **stat band is missing** ([I/R], despite the count-up engine already existing) and the **auction collapses a headline-lot + grid into one carousel** ([R]). The page reads "nice dark template," not "engraved gala programme."

---

## PAIR C — El Taquito (backyard taco night, lotería card)

`taquito_render.png` vs `taquito_mockup.png`. IR: `peek-jumpoff/samples/el-taquito.ir.json` (authored for this diagnosis; validates).

Deliberately authored the way the chat *should* work: archetypes for structure + one `custom` block for the genuinely bespoke parts (lotería card, papel picado, chips). Result: the custom parts match closely (proving the escape hatch works), and the gaps land precisely on the archetypes + missing "loud" tokens.

| Feature | Mockup | Renderer | Tag | Fix → file |
|---|---|---|---|---|
| **Lotería card hero** | No. 47 "El Taquito" card: sunburst, CSS taco, `box-shadow:8px 8px 0 marigold` | **Matches** — authored as a `custom` block against `--peek-*` vars | — | Confirms `custom` + `sanitizeCustomHtml` (`schema.ts:364`) is the right escape hatch. |
| **Papel-picado bunting** | Flags with **lace cut-outs** via `mask-image` radial-gradients (`.papel span::after`) | Authored bunting, but **solid triangles** (clip-path only, no lace holes) | **[I]** | My custom html simplified it; the mask-image lace is authorable. IR detail, not renderer. |
| **Headline "Tacos & Tequila"** | Yeseva, **`text-shadow:3px 3px 0 cobalt`** (hard offset), big/tight | Yeseva renders, but **flat rosa, no shadow** | **[R]/[T]** | `mkHead` (`sections.ts:734`) only supports `t.glow` (soft neon on dark). There is **no hard-offset display-shadow token**. This single missing token ("`Xpx Ypx 0 color`") is the difference between "loud handmade" and "clean template" across many playful concepts. Add `--peek-display-shadow`. |
| **Details (Cuándo/Dónde/Traje)** | A **solid cobalt rounded card**, marigold uppercase keys, **dashed dividers** — a "fiesta menu" (`.details :60-66`) | `details`: **plain bordered list on cream with circular monogram avatars** (C/D/T in pink circles) | **[R]** | `buildDetails` (`sections.ts:293`) hard-codes a monogram-avatar + bordered-list look. It cannot become a colored panel. Parametrize: panel fill (`accent`/`surface`), key face/color, divider style; drop the forced monogram. |
| **Bring-a-dish chips** | Pills with on/taken(struck) states | **Matches** — authored as a `custom` block | — | OK (custom). But note: there is **no `chips`/potluck archetype**, so this can only ever be `custom`. Consider a first-class `claimchips` kind. |
| **RSVP** | **One** full-width rosa pill, `box-shadow:4px 4px 0 ink`, fine print below | **Two** RSVP buttons: the `claim` panel's button **and** the sticky bar's button; both generic pills (no hard shadow); claim panel adds an unwanted "YOU'RE INVITED / Will you be there?" heading | **[R]/[I]** | `buildClaim` (`sections.ts:618`) injects a full RSVP *panel* (eyebrow + heading + input + button) AND the shell always shows a sticky CTA (`shell.ts:141`) → **duplication**. For a single-action invite the claim button and the sticky bar are redundant. Let claim suppress the sticky bar, and allow a heading-less claim. |
| **Color/energy** | Loud: hard shadows, thick `3px` ink borders, saturated cobalt/rosa/marigold panels | Pleasant but soft: thin `1px` borders, no hard shadows, mostly cream/white surfaces | **[T]** | The renderer has no "loud" border/shadow vocabulary (hard offsets, thick ink borders, colored section panels). Same root as the display-shadow gap. |

**Verdict (C):** where the IR used `custom`, the render is faithful — so the escape hatch works. The gaps are (1) the **`details` archetype is a fixed monogram-list** that can't become a colored fiesta menu ([R]), (2) **no hard-offset shadow / thick-border / colored-panel tokens** so playful concepts read soft ([T]), and (3) **claim panel ↔ sticky bar duplication** ([R/I]).

---

## CROSS-CUTTING FINDINGS (the same root causes recur)

1. **Archetypes are single-skin, not parametrized.** `giftgrid` is always a carousel; `details` is always a monogram list; `flightplan` is always a left dashed rail. The mockups vary the *shape* per concept (checklist, headline-lot+grid, centered serif timeline, cobalt menu card). The renderer skins color/type via `--peek-*` but **cannot change the structural treatment** — so every concept converges on one look. This is the dominant cause. (`lib/peek-render/sections.ts` throughout.)

2. **No "loud" decorative vocabulary.** The mockups lean on **hard offset shadows** (`Xpx Ypx 0 color`), **thick ink borders** (`3–4px`), **dashed perforations/dividers**, **punched notches**, and **colored section panels**. The renderer has thin 1px borders, soft radii, one glow token, and grain at a fixed faint opacity. Missing tokens: `--peek-display-shadow`, `--peek-card-shadow` (offset+spread), `--peek-border-weight`, a texture-strength control. (`lib/peek-render/theme.ts` + `styles.ts` + `scenes.ts:172`.)

3. **Hero headline can't carry an inline accent** (rust "OLD MAN", italic "Gala"). Both mockups put the emotional punch in a colored/italic *word*. `mkHead` escapes the headline to plain text. (`sections.ts:734`, `contract.ts` hero data.)

4. **The running total is empty at rest.** The mockups show the *catalogue* sum ("$74 + dinner"); the renderer shows it only after per-card claim. The count-up + total engines exist (`shell.ts:316`, `cards.ts:137`) but are under-used. (`shell.ts:148`.)

5. **Built-but-unused capability.** `registerCounter` (count-up numerals) is fully implemented in `shell.ts` and specified for stat bands in `SHELL_SPEC.md:368`, yet **no archetype emits a stat band** — a high-leverage, low-cost add for the gala class of page.

6. **Claim ↔ sticky-bar duplication** on single-action invites (taquito). (`sections.ts:618` + `shell.ts:141`.)

---

## PRIORITIZED FIX LIST (by aesthetic impact)

1. **Parametrize `giftgrid` with structural variants + a featured/headline card + real grid.** `[R]` `lib/peek-render/sections.ts:139`. Add `data.layout: 'carousel' | 'grid' | 'checklist'` and a full-width featured card path. This single change recovers dad's checklist *and* the gala auction catalogue — the #1 loss in two of three pairs. (Per `SHELL_SPEC.md:316-345`, already specified.)

2. **Add a "loud" token set + apply it.** `[T]` `lib/peek-render/theme.ts` (emit `--peek-display-shadow`, `--peek-card-shadow`, `--peek-border-weight`, `--peek-texture-strength`) + consume in `styles.ts`/`sections.ts`/`scenes.ts:172`. Recovers the taco hard-shadow energy, the kraft paper, the thick-border sticker look. Cheap, broad.

3. **Add a `stats` archetype (serif numerals + count-up) and a `lede` pull-quote.** `[I]/[R]` `contract.ts` SectionKind + `sections.ts`. The count-up engine (`shell.ts:316`) is already built and wired — this is mostly a builder. Recovers the gala's missing editorial spine.

4. **Hero headline accent span (color + italic).** `[I]/[R]` `contract.ts` hero data (`headline_html` or `accent` field) + `mkHead` (`sections.ts:734`). Recovers rust "OLD MAN" and italic "Gala".

5. **Parametrize `details` (panel fill / key face / divider) and drop the forced monogram avatar.** `[R]` `sections.ts:293`. Recovers the cobalt fiesta menu; helps every invite.

6. **Fix the running total + claim/bar duplication.** `[R]/[I]` `shell.ts:148` (at-rest catalogue sum) and `sections.ts:618`/`shell.ts:141` (let a `claim` section suppress the redundant sticky bar; allow heading-less claim). Recovers dad's "$74 + dinner" and de-duplicates taquito's RSVP.

Secondary: parametrize `flightplan` (spine position / dot / time face) `[R]`; give `type-mega` a framed photo placeholder `[R]`; treat the footer as a designed section `[R]`; first-class `claimchips`/potluck kind `[R]`.

---

## VERDICT

**The primary reason the outputs don't measure up is #1 above: the renderer expresses every IR through *single-skin, structurally-fixed archetypes*, while the mockups' caliber lives in *concept-specific structural treatments*.** The theme layer (`--peek-*`) faithfully restyles color and type — which is why the pages read "good" — but it cannot restructure a section, so a hardware work-order, an engraved auction catalogue, and a lotería invite all collapse toward the same tasteful card-grid template. The IR and the `custom` escape hatch are sound (the taquito custom blocks prove it); the deficit is in the renderer's archetypes, secondarily in a missing "loud" decorative-token vocabulary.

**Highest-leverage single fix:** parametrize `giftgrid` (`lib/peek-render/sections.ts:139`) with `layout` variants — `checklist` and a full-width featured/headline card plus a true grid. It is THE defining money section, it is the largest single loss in both the dad and gala pairs, and `SHELL_SPEC.md:316-345` already specifies the exact behavior — the code simply generalized it away. Pair it with the loud-token set (fix #2) and the gap closes on the majority of concepts.
