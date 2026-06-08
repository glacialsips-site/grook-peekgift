# redteam-quality-loop.md — BREAKING the "great output, freely editable, no death-spiral" claim

> **Red-team brief.** The CTO's bet (00-BUILD-PLAN): freeform-HTML authoring produces gorgeous,
> unmistakably-theirs pages AND they're editable in plain language without the owner's feared
> micro-revision death-spiral. **My job is to prove that's false on the code as it stands.**
> READ-ONLY pass over the `clean-slate`/`gallant-planck` tree (`apps/web/lib/curator/*`,
> `app/studio/page.tsx`, `app/api/curator/route.ts`, `app/api/pick/route.ts`, `public/peek-runtime.js`,
> `lib/sanitize.ts`, `lib/persistence/store.ts`, `components/preview.tsx`) + the proven zip
> (`peek-zips/deployed`). Everything below is cited to the file/line I read.
>
> **Headline verdict: the claim FAILS as built.** Three of the five attack surfaces are *worse* in
> this tree than in the proven zip it's supposed to exceed — the edit flow loses state, the model is
> amnesiac about its own page on every follow-up turn, and the ~90s-page-on-a-phone timeout that the
> zip *already solved by leaving Netlify* has been **re-introduced** by deploying back onto Netlify
> functions at `maxDuration=120`. "Looks solid" is not the finding. The finding is: the spiral is
> wired in.

---

## THE RANKED HOLES

### H1 — [STRATEGIC] The model is AMNESIAC about its own page on every follow-up turn → "darker / move that / make it pick-one" forces a RE-AUTHOR, not a surgical edit. **This is the death-spiral, in code.**

**The single most important finding.** Trace the edit flow:

1. Studio (`app/studio/page.tsx:209-254`) accumulates the assistant reply as `acc` = **only the streamed `text` deltas** (`:231-233`). The HTML the model emitted via `set_page`/`edit_region` is rendered into the iframe but **never written into the chat transcript** (`messages`). On the next `send()` the client replays `messages.map(m => ({role, content}))` (`:189-192`) — so the assistant turns it sends back to the model contain **the chat sentences only, never the page HTML.**
2. The route (`app/api/curator/route.ts:43-72`) passes those messages straight through to `runCuratorTurnStreaming`. It rebuilds `currentHtml` from `""` every request via `applyPageOp` (`:57-69`) purely to persist the result — **that reconstructed HTML is never fed back into the model's context.**
3. `turn.ts:55-56` pushes `msg.content` (the assistant's tool_use blocks) into the *in-turn* `messages` array, but that array is discarded when the turn ends; the next HTTP request starts from the client's text-only transcript again.

**Consequence:** when the curator says "darker" or "make the shoes pick-one" on turn 3, the model is looking at a transcript that says *its own prior turns were one-sentence chat blurbs with no page attached.* It has **no representation of the current DOM** to do a targeted `edit_region` against — it cannot write a CSS selector for markup it can't see. The overwhelmingly likely behavior is a fresh `set_page` (re-author the whole page), which **re-rolls every liked decision** (type, palette, copy, the one loud move) to satisfy a one-word note. That *is* the owner's feared micro-revision spiral, and it is structurally guaranteed, not a model-mood risk.

**Contrast the proven zip, which this is supposed to exceed:** the zip's prompt and the SEAT push "refine with the smallest surgical edit" — but even the zip would suffer the same amnesia if it didn't re-send HTML. The grook tree took the zip's *single-tool* `set_page` model, added `edit_region`/`set_style`/`set_media` (good intent), and then **removed the one thing that makes a surgical edit possible: the model seeing the page it's editing.**

**Mitigation (STRATEGIC, do before Ch-2 GATE):** feed the current page back into the model context on every turn — either (a) re-send the latest `presentation.html` as an assistant tool_result / a system block ("CURRENT PAGE:\n<html>") so `edit_region` selectors can target real nodes, or (b) cheaper: send a **structural digest** (the `extractSpine` issues + a tag-outline: every `data-peek-id`, section landmarks, the `<style>` selectors) so the model can address regions without the full token cost. Without one of these, `edit_region` is decorative and the model will always reach for `set_page`. Prompt-cache the page block (it's stable within a turn-pair) to control cost (`shared/prompt-caching.md` § multi-turn).

---

### H2 — [STRATEGIC] The studio does NOT morph — it RELOADS the iframe on every `set_page` → mid-edit state loss, flicker, scroll-jump, motion restart. The proven zip's idiomorph was dropped.

The brief assumed `components/preview.tsx` holds "the idiomorph morph." **It does not.** `preview.tsx` is the **structured-IR React renderer** (the typed fallback — `RenderModel`/`SectionView`, 1248 lines) and is unrelated to the freeform studio path. The actual freeform preview host is `app/studio/page.tsx`, and it morphs nothing:

- `setPage(html)` does `f.srcdoc = frameDoc(html)` (`studio/page.tsx:87-94`) — a **full iframe document reload**. `grep idiomorph` over the whole repo returns **only the snapshot/zip copies** (`_claude/snapshots/{deployed,iterated}/public/idiomorph.min.js`); idiomorph is **not** vendored or imported anywhere in `apps/web`.
- The zip's whole point (`zips-deep.md:116`) was: "on each `postMessage({type:'render',html})` it **morphs** the body via Idiomorph (preserving animation/scroll state across streaming updates)… so the page **streams in and re-renders without flicker**." The grook studio replaced that morph with `srcdoc =`, which **blows away the iframe document** every time the model re-emits the page.

**Consequence, compounding H1:** because H1 makes the model re-author on small notes, and H2 makes every re-author a hard reload, a one-word "darker" produces a **full white-flash rebuild**: scroll position resets to top, the signature motion restarts from frame 0, any recipient-side picked state is wiped, and on a phone the ~90s re-stream (H4) plays out again as a blank rebuild. The edit *feels* like a teardown even when the model intended a tweak. `edit_region`/`set_style`/`set_media` DO patch live (`:95-121` use `outerHTML`/`appendChild`/DOM mutation, no reload) — but H1 means those rarely fire; the common path is `set_page` → reload.

**Mitigation (STRATEGIC):** restore idiomorph (or equivalent DOM-morph) for the `set_page` path so a re-authored page diffs into the live DOM instead of replacing it — preserving scroll, motion phase, and `data-peek-picked` state. This is a *regression to repair*, not net-new: the zip already shipped it. Pair with H1 so the model prefers `edit_region`; morph is the safety net for when it doesn't.

---

### H3 — [STRATEGIC] No eval gate is wired anywhere → aesthetic variance ships raw, and the ONLY recourse is re-roll (= $ + the spiral). The "do-not-skip moat" gate (CORPUS §2.11) is 100% absent from the live path.

I searched the whole curator path. There is **no vision-judge, no 10-point self-grade enforcement, no lint floor, no `taste_verdicts`, no Keep/again loop, no `commit_concept`.** The 10-point gate lives only as prose *inside the prompt* (`system-prompt.ts:82-83`, `seat.ts`) — "run it in your head; don't narrate it." That is an unverifiable instruction, not a gate. The route streams whatever Opus emits straight to the iframe and persists it (`route.ts:71-89`). The corpus is explicit that this gate is the moat and "net-new, do-not-skip" (CORPUS §2.11), and the BUILD-PLAN itself flags the vision-judge as net-new/unbuilt (Ch-5).

**Consequence:** Opus 4.8 at `max_tokens:32000` with `thinking:{type:"adaptive"}` (`turn.ts:42-47`) is genuinely capable, but aesthetic output has real variance — the corpus's own GAP_ANALYSIS + cold-range doctrine exist *because* "valid ≠ beautiful" and generic/broken pages do happen. With no gate, a generic or broken draft reaches the curator, and the **only correction primitive a non-designer has is "show me another" / "again"** — which (per H1) triggers a full re-author / re-roll. So aesthetic misses convert directly into spiral turns, and **each re-roll is a fresh ~$0.80–1.0 Opus call** (~32K output × $25/1M ≈ $0.80 output alone, plus growing input). The product's defining failure mode (generic) has no automated catch and an expensive-only manual catch.

**Sharper:** the prompt's own gate text was *weakened* vs the deployed SEAT. The deployed SEAT (`seat.ts`) says a no on (1)(2)(3)(4)(8) is **fatal — fix before authoring** and "One self-patch at most." The grook `PEEK_CONTRACT` gate (`system-prompt.ts:82-83`) keeps "one self-patch at most" but there's still nothing that *checks* it. And there are now **two gates that disagree** in the same prompt: `PEEK_METHOD`'s fatal axes are "(1),(2),(5),(9),(10)" while `PEEK_CONTRACT`'s are "(1),(2),(5),(9),(10)" numbered against a *different* 10-item list than the SEAT's "(1)(2)(3)(4)(8)" — the model is handed two non-identical rubrics in one system prompt.

**Mitigation:** wire at minimum the **free inline tier** now — a deterministic lint floor (JUMPOFF hard-bans: purple→pink gradient, decorative emoji, `<form>`/`<script>` leakage, base64 blob, uniform-grid) run server-side on `currentHtml` before persist, returning issues into the turn so the model self-patches once; and the model's thinking-time self-grade made *load-bearing* by requiring a structured grade in the tool flow. The CI vision-judge (screenshot → 10-axis rubric, `document.fonts.ready` wait) is the real gate but is offline/net-new — until it exists, re-roll is the only recourse and the spiral is the cost.

---

### H4 — [STRATEGIC] The ~90s-Opus-page-on-a-phone TIMEOUT the zip ESCAPED by leaving Netlify has been RE-INTRODUCED. Plus there is no keepalive ping. White-screen/truncation risk is live.

This is the cleanest "looks solid, is not" finding, because the zip's own commit comment documents the exact bug being walked back into.

- The iterated zip moved generation **off Netlify specifically because of this** (`zips-deep.md:139-146`, verbatim from `iterated/supabase/functions/generate/index.ts:1-4`): *"Moved off Netlify Edge (hard ~60s response cap → truncated page → white screen) to Supabase Edge Functions (150s free / 400s paid) so a ~90s Opus page can finish."*
- The grook tree deploys the curator route as a **Netlify Next.js serverless function** (`netlify.toml:16-17` `@netlify/plugin-nextjs`, `base=apps/web`) with `export const maxDuration = 120` and `runtime="nodejs"` (`route.ts:7-8`). Same model, same size: `MODEL="claude-opus-4-8"`, `max_tokens:32000` (`turn.ts:14,42`) — i.e. the same ~90s page the zip said only finishes on a 150s host.
- 120s is *nominally* above 90s, but: (a) Netlify's function ceiling depends on the plan tier (default function timeout is well under 120s on non-enterprise plans — `maxDuration=120` is a request, not a guarantee, and the plugin/CDN may cap the streamed response earlier); (b) **the route emits NO keepalive.** The zip sent a `: ping` every 15s (`zips-deep.md:146`) to keep proxies from killing an idle-looking SSE connection during Opus's long pre-first-token thinking. The grook route's `ReadableStream` (`route.ts:55-95`) emits only real `text`/`page` events — during adaptive-thinking warm-up (which on Opus 4.8 defaults to `display:"omitted"`, so **zero bytes stream until the first visible token**), the socket can sit silent long enough for an intermediary to drop it. Result: the exact "truncated page → white screen" the zip fixed.
- Worse, the **synchronous save runs INSIDE the request, after the full stream** (`route.ts:76-89`): `loadDocumentById` + `extractSpine` + Supabase `upsert` of the whole doc, all before `controller.close()`. On a slow turn this eats into the same 120s budget the generation just spent ~90s of — the save (and its `saved` event the client waits for) can be the thing that gets cut.

**Consequence:** on a real phone on cellular (the stated near-term traffic = Instagram), a non-trivial fraction of first-draft generations truncate mid-`set_page` → the iframe renders a half-built page (the morph's absence, H2, makes this a raw broken DOM, not a graceful partial) → the curator's only move is regenerate → spiral + double spend.

**Mitigation (STRATEGIC):** either (a) move the long Opus stream back off Netlify functions (Supabase Edge / a streaming-tolerant host) as the zip already concluded, or (b) prove the Netlify plan's real streamed-response ceiling ≥ ~120s AND add the 15s `: ping` keepalive AND move the persist OFF the request path (fire-and-forget / queue, or a separate save call after the client has the HTML). Until measured on `vnext.peek.gift` on a throttled phone, treat first-draft completion as **unproven** — it's a Ch-2 GATE blocker (the GATE is "screenshotted on a phone… beats the zip"; a white screen fails that gate).

---

### H5 — [TACTICAL] Server-side caps are DEAD CODE on the freeform path — `decidePick` is called WITHOUT `caps`, so the draining-tab "constraint is the fun" is purely cosmetic and over-cap picks persist.

The corpus flagged this for studio-vnext (CORPUS §3.4, §7.2) and it is **still true verbatim** in this tree:

- `app/api/pick/route.ts:21` — `decidePick(doc, current, { type: "toggle", cardId: body.cardId })`. **No 4th `caps` argument.** Per the engine semantics (CORPUS §3.4), `committedCents` is computed but `hardCents`/`softCents` are never supplied, so the `INVARIANT`-blocked-over-hard-cap and `overSoftCap:true`-warning branches **can never fire**. The route returns `overSoftCap` (`:33`) which will always be false.
- The client runtime thermometer (`peek-runtime.js:30-46`) computes "$X over" purely in the browser and is **trivially bypassable** — the server accepts the pick regardless.
- The freeform path never sets caps at all: `buildDraftDocument` (`draft.ts:20-47`) and `extractSpine` (`extract.ts:108-110`) read `data-budget` into `budgetCents` but there is **no plumbing of a hard/soft cap into `decidePick`** — the spend-cap fields the lieutenant spec wanted (`set_spend_caps`, `recipient_hard_cap_cents`) don't exist on this tool surface (the grook tools are the 7-tool `set_page` family, `tools.ts:7-93`, not the 22-tool spec).

**Consequence:** "more items than the recipient can take" + a budget is the product's defensible rules-engine core, and on the live path it is **unenforced** — a recipient can claim every paid card; the creator's intended constraint is theater. Not a spiral risk, but it's the commerce-rigor half of the BUILD-PLAN's whole "dissolve the false choice" bet, and it's a one-line gap (`Ch-3 GATE: "over-cap is blocked"` cannot pass today).

**Mitigation (TACTICAL):** derive `caps` from the spine (`budgetCents` → hard, or explicit cap fields once added) and pass it as the 4th arg to `decidePick`; wire a real over-cap response. Small change, named in the corpus, blocks a chapter GATE if missed.

---

### H6 — [TACTICAL] The freeform path inherits NONE of the structured-renderer's mobile traps — but introduces NEW ones, and the `edit_region` selector contract is fragile.

On the brief's "does the freeform path inherit the gallery's mobile traps" question: **no, and that's a double-edged answer.**

- The 4-distinct-product-set-variants / collage-masonry-dead-at-3-4-cards traps (lieutenant-research Part 4 §2) and the 375px heading-clip / `--vibe-scale-display` bugs (Part 4 §1) live in the **grammar renderer + `renderer.module.css`** — i.e. in the structured/`preview.tsx` family. The freeform path bypasses all of it (the model hand-authors CSS), so it genuinely does NOT inherit them. Good.
- **But the freeform path has no mobile floor at all** — there's no enforced wrap/clamp safety net, no min-touch-target check, nothing. The only mobile guarantee is the prompt saying "phone first" + "~390-430px column" (`system-prompt.ts:19,28`). With H3 (no gate) there is nothing to catch a hero that clips on a 375px screen, a motion layer that veils the name (the SEAT's explicit fatal failure), or a sticky bar that collides with the chat overlay covering ~60%. The proven mockups pass these by hand; an arbitrary cold brief has no backstop. The owner reviews via phone screenshot (CORPUS §7.3) — so a mobile-clip miss is exactly what he'll see and react to (→ spiral).
- **New fragility:** `edit_region(selector, html)` patches by `el.querySelector(selector)` then `el.outerHTML = html` (`studio/page.tsx:95-104`) / server `el.replaceWith` (`page-html.ts:26-31`). The model authored the markup with its own arbitrary class names and must now *recall an exact CSS selector* for a node it can't see (H1). A stale/mismatched selector silently no-ops (`if (el)` / `if (!el) return html` — both paths just do nothing, no error back to the model). So a "move that" edit can **silently fail**, the curator sees no change, asks again, and the model — having gotten an `ok:true`-shaped result with no failure signal in the no-op server case — escalates to `set_page`. Selector drift → silent edit failure → re-author → spiral.

**Mitigation (TACTICAL):** (a) add a server-side mobile lint (overflow-wrap/hyphens presence on display headings, a `min()` clamp guard, motion-behind-name heuristic) into the H3 lint floor; (b) make `edit_region` return an **explicit failure** when the selector matches 0 nodes (both client and `applyPageOp`) so the model knows to retry the selector rather than nuke the page; this directly de-fuels the H1→set_page escalation.

---

### H7 — [TACTICAL] speed-to-checkout vs make-it-personal: NO guardrail. The chat can speedrun past the note/theming.

The corpus names this tension explicitly (CORPUS §1.2: *"get the human to the checkout/money button as fast as possible without losing them" + "make the page look REALLY good"* — "needs a guardrail so the chat doesn't speedrun past the personal note + theming"). The lieutenant BASE_PROMPT made it a hard rule: *"never publish without a personal note — the note is the thing the recipient re-reads"* and defined DONE as including *"a personal note."*

In the grook tree there is **no such guardrail**:

- The `publish` tool (`tools.ts:88-92`) is parameter-less and the prompt says "Offer it the moment the page is useful, not perfect" (`system-prompt.ts:52,66`) — the bar is "who-it's-for + a few cards + a way to deliver." **The personal note is not in the publish precondition** anywhere on this path (no precondition check exists at all — `turn.ts:125-129` `case "publish"` just emits `{type:"ready"}` and returns ok).
- So Opus, optimizing the stated objective ("publishing is the business," `system-prompt.ts:52`), can and will offer publish after a hero + 2 cards, skipping the note and skipping theming refinement. The thing that makes the gift *personal* (the note the recipient re-reads) is the most skippable step, and nothing stops the skip.

**Consequence:** the product ships pages that are fast-to-$12 but generic-in-the-way-that-matters (no note, default-ish theme) — which is the *other* face of the prime-directive failure (generic = nobody forwards = loop dies, CORPUS §1.4). It also fights the spiral from the opposite side: a curator who *did* want it personal gets rushed to checkout and has to claw back ("no wait, add a note, make it warmer") = more turns.

**Mitigation (TACTICAL):** make `publish` enforce a minimum-personal precondition (a note present, vibe touched beyond the default draft) and return a `preconditions_failed`-style result with what's missing, exactly as the lieutenant spec's `mark_ready_to_publish` did — so the model finishes the personal beat before offering the money button.

---

## SECONDARY / WATCH-LIST (lower severity, real)

- **[TACTICAL] CSS sanitizer is regex-only and DOMPurify "does not sanitize CSS" (CORPUS §7.2).** `lib/sanitize.ts:42-48` strips `@import`/`expression()`/`behavior`/`javascript:` via regex but does **not** neutralize full-viewport fixed overlays, `position:fixed;inset:0;z-index:99999` clickjack layers, or `url()` host-allowlisting — and the studio iframe is `sandbox="allow-scripts allow-same-origin"` (`studio/page.tsx:262`), i.e. **same-origin**, so a sanitizer miss in the studio CAN reach app cookies. The BUILD-PLAN's "isolated origin" (§5) is not present in the studio. (Studio is creator-only so the blast radius is the creator's own session, but the recipient `/g/<slug>` surface must not repeat this.)
- **[TACTICAL] No rate-limit / botGate / auth on `/api/curator`** (`route.ts` — only an `ANTHROPIC_API_KEY` presence check). CORPUS §7.2: "open chat = open wallet the instant a key deploys." Each turn is a ~$0.80+ Opus call; H1/H3 multiply the turn count. The spiral isn't just UX pain — it's uncapped spend on an open endpoint.
- **[TACTICAL] `data-peek-img-src="search"` over-promised** (CORPUS §3.3) and `generate_hero_image`/`resolve_card` degrade by telling the model to "leave a treated slot" (`turn.ts:108,121`) — graceful, but means a hero-image miss leaves a placeholder the curator will want re-rolled (→ spiral). fal returning `image_url:null` (CORPUS §5.1) feeds this.
- **[TACTICAL] Prompt-cache breakpoints are placed but the volatile content ordering is unverified.** `prompt.ts:22-24` puts 4 ephemeral system blocks (METHOD/PANTRY/FEWSHOT/CONTRACT) — all stable, good. But there's no page-state block (because of H1), so the cache is fine *only because nothing dynamic is sent*; the moment H1 is fixed by injecting current-page context, that block must go AFTER the last breakpoint or it invalidates the whole 4-block prefix every turn (`shared/prompt-caching.md` § silent invalidators).

---

## THE BOTTOM LINE FOR THE CTO

The freeform-HTML bet's *output* is plausibly great (Opus 4.8 + the SEAT is real). **The "editable without the spiral" half of the claim is false on this code**, for three compounding structural reasons that are not model-mood and not tuning:

1. **The model never sees the page it's editing** (H1) → small notes become full re-authors.
2. **A full re-author is a hard iframe reload, not a morph** (H2, a regression from the zip) → every re-author loses scroll/motion/picked state and flickers.
3. **Nothing catches a bad or broken draft** (H3, no gate) and **the long page can truncate to a white screen on a phone** (H4, the zip's solved bug, re-introduced) → the only recourse is re-roll, which re-enters 1+2.

That loop — re-author → reload → re-roll → re-author — **is** the owner's feared micro-revision death-spiral, assembled from four separate gaps. Fixing H1 (feed the page back) + H2 (restore the morph) + H4 (keepalive + off-Netlify-or-prove-the-cap) is the minimum to make the editing claim true; H3 (wire the inline gate) is what stops re-roll being the only recourse. None are net-new research — H1/H2/H4 are *restorations of things the proven zip already did right*.
