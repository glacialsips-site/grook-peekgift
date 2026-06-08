# redteam-scope — breaking the BUILD-PLAN's scope & sequencing

> Red-team for the CTO. READ-ONLY pass over `_claude/notes/00-BUILD-PLAN.md` (7 chapters) against
> the clean-slate working tree (`packages/core` + `apps/web`) and the prep corpus.
> Mandate: prove the plan over-builds (never ships) or under-builds (scraps later); find the
> deploy→tweak→redeploy micro-revision trap. "Well-sequenced" = a finding I missed.
> Judged against the owner's framing this session: **focus on the MEAT (generation core) with a
> TEMP throwaway spine, as long as you OVERBUILD the durable parts.**
>
> Every claim below is grounded in a file I actually read; line refs inline.

---

## THE ONE-LINE VERDICT

The plan is **directionally right but mis-scoped at the chapter grain: it under-states how much already
exists and therefore over-sequences.** Three of the seven chapters' headline "net-new" deliverables are
**already built in the working tree** (the full-i18n Checkout Session, the sandboxed-iframe recipient
surface, the caps-aware picks engine). The plan's own Ch-1 "route the spine through the full gate" is the
**catalog-before-loop mistake in miniature** — it perfects a durable artifact (`decide`/event-sourcing) the
first green loop does not touch. Meanwhile the **genuinely not-backfillable seams** (actorId, widened
`verifyWebhook`) are correctly flagged but **buried in Ch-1/Ch-5 behind hours of work the loop doesn't need**,
which is exactly how they get skipped under time pressure and force a later scrap.

**The fastest path to first-green-loop is ~1.5 chapters, not 4.** Most of Ch-3 and Ch-4 is already standing.

---

## GROUND-TRUTH DELTA: what ALREADY EXISTS vs the plan's "net-new" framing

The plan (line 5) says "the existing code is the floor; this plan exceeds it" but then writes each chapter
as if building from less than the floor. Verified in-tree:

| Plan calls it net-new (chapter) | Reality in working tree | Verdict |
|---|---|---|
| Ch4 "full-i18n Checkout Session (`adaptive_pricing`/`automatic_tax`/`tax_id_collection`/Address/promo)" | `apps/web/lib/payment/stripe.ts:25-37` **already** sets `ui_mode:embedded`, `adaptive_pricing`, `automatic_tax`, `tax_id_collection`, `billing_address_collection`, `allow_promotion_codes`. `app/api/publish/route.ts` already mints the client secret. | **ALREADY BUILT.** Ch4's headline is done. |
| Ch3 "isolated-origin `/g/<slug>`" | `app/g/[slug]/page.tsx:31-36` already serves `presentation.html` in an `<iframe sandbox="allow-scripts">` (no `allow-same-origin`). | **PARTIALLY BUILT.** Iframe-without-same-origin exists; only the *separate sandbox subdomain* is missing (and that's a deploy/DNS config, deferrable). |
| Ch1/Ch3 "wire the picks engine to take caps" | `packages/core/src/picks/engine.ts:21-73` **already** takes `caps?`, blocks hard, warns soft. The ONLY gap is `app/api/pick/route.ts:22` calls `decidePick(doc, current, {…})` with **no 4th arg**. | **3-LINE FIX, not a chapter.** Pass `caps` from the spine. Dead enforcement closes in one edit. |
| Ch2 "wire the Opus curator + 7 tools + streaming + morph + runtime" | `lib/curator/turn.ts` is fully wired: Opus 4.8 (`MODEL` line 14), `client.messages.stream`, all 7 tools dispatched (`tools.ts` = exactly set_page/edit_region/set_style/set_media/resolve_card/generate_hero_image/publish), safeword report, `public/peek-runtime.js` present. | **MOSTLY BUILT.** Real Ch2 gap = the *prompt content* (91 lines, lean) + prompt-caching (absent — `turn.ts:40-47` sends `system` as a plain string, no `cache_control`). |
| Ch5 "real CSS sanitizer" | `lib/sanitize.ts:42-69` already strips `@import`, neutralizes `expression()`, kills `javascript:` urls, forces `rel=noopener`, forbids script/iframe/form/input. | **PARTIALLY BUILT.** Hardening (url() host-allowlist, full-viewport-overlay neutralize, SSRF-guard on scrape) is the real net-new. |

**The genuinely net-new, not-yet-in-tree work** (verified absent): `actorId` on events (`commands/events.ts` — no event carries it); `FulfillmentPort` (absent from `ports.ts` Ports registry, lines 168-182); widened `PaymentPort.createCheckout`/`verifyWebhook` (`ports.ts:132-139` still 3-field / `{event,peekId?}`); `extractSpine→decide` wiring (`draft.ts:25` calls `extractSpine` then **discards `issues[]`** and writes cards raw); `research` tier body (`card-resolver.ts:176-180` honest stub); webhook idempotency/fail-closed + `webhook_log` (`stripe/webhook/route.ts` has none); creator-notify on pick (no Resend call anywhere in the pick/webhook path); botGate/auth on `/api/curator` (`curator/route.ts` — none).

---

## STRATEGIC vs TACTICAL split, per chapter

The owner's frame demands this split explicitly: overbuild DURABLE, throwaway TACTICAL spine. The plan
**does not draw this line inside chapters**, so it gold-plates a few tactical bridges and risks skipping a
couple of durable seams. Per chapter:

### Ch 0 — Ground truth + a base that builds
- **STRATEGIC (keep):** confirm live commit via Netlify; `pnpm build`+`typecheck` green. This is the
  legitimate floor.
- **TACTICAL/over-stated:** "de-Tailwind the stale root." The working tree has **no Tailwind in `apps/web`**
  (runtime CSS-vars confirmed; `postcss.config.mjs` present but app uses `--peek-*`). The stale-root
  Tailwind is a corpus warning about a *different* tree; verify it's even present before spending a gate on it.
- **HUMAN-BLOCKER risk:** "confirm the actual live commit on `vnext.peek.gift` (Netlify)" — the corpus
  (decisions-bugs §3E) flags the Netlify connector as "flaky/down" repeatedly. **This gate can STOP Ch0 on a
  human/infra blocker the plan treats as a 5-minute check.** Decouple: stand the base up locally and prove
  build green *without* waiting on the Netlify read. Don't let a flaky connector gate the whole line.

### Ch 1 — The contract, hardened
- **STRATEGIC (keep, but DEFER most):** `actorId` on every event (not-backfillable, seam-ledger #1);
  widened `verifyWebhook` (not-backfillable, #2); `FulfillmentPort` stub (#4). These three are the durable
  overbuild that justifies the chapter.
- **TACTICAL mis-classified as durable → THE OVER-BUILD:** **"Spine-through-the-gate (`extractSpine → decide`)"
  before the loop runs once is the BUILD-BOOK's catalog-before-loop mistake in miniature.** The first green
  loop needs the spine to *exist and enforce caps* — it does **not** need malformed-page-bounces-at-the-
  command-boundary. `draft.ts` already extracts a usable spine; `decidePick` already validates at pick time;
  `validatePeekDocument` already runs on load (`store.ts:49`). Routing freeform HTML through the 16-command
  `decide`/event-sourced gate is **perfecting the maker-checker before one loop closes** — pure gold-plating
  of a durable artifact whose value (undo/replay/multi-actor) **no Tier-1 self-serve run exercises.**
  - *The TACTICAL spine that's the right call:* keep `draft.ts`'s `extractSpine` + **surface `issues[]`**
    (today discarded — a one-line bug: extract returns `issues`, draft drops them) + a **validate-lite gate**
    (block publish if extraction has `level:"error"` issues, or if a tab is set with unpriced cards —
    `extract.ts:300-311` already computes this). Full `decide`-gate later, behind the loop.
- **Verdict:** Ch1 as written over-builds. Split it: the 3 seams ship as **typed empty sockets** (cheap);
  the spine-gate is **demoted to validate-lite** and the full command-gate moves *after* first green.

### Ch 2 — The seat + studio (the magic)
- **STRATEGIC (the actual MEAT — this is where to overbuild per the owner's frame):** the system prompt
  rewrite past v0 (today 91 lines, lean) + prompt-caching (absent). This is the moat; it's correctly the
  one place the plan should pour effort.
- **TACTICAL/already-done:** the tool wiring, streaming, morph, runtime are built. The plan lists them as
  chapter work; they're a smoke-test, not a build.
- **Verdict:** Ch2's *scope* is right (the prompt is the meat) but its *size* is inflated by re-listing
  built plumbing. Trim to: prompt rewrite + cache_control + a golden-brief harness (see micro-revision trap).

### Ch 3 — Recipient loop + server-enforced rules
- **STRATEGIC:** pass caps to `decidePick` (3-line fix, line 22); creator-notify via Resend (genuinely
  net-new — no notify call exists). beg/unlock server-side enforcement.
- **TACTICAL/already-done:** isolated-origin iframe (built); `/g/<slug>` SSR (built); pick persistence
  (`persistence/picks.ts` wired, route works).
- **Verdict:** Ch3 is ~70% standing. The real work is **one 3-line cap pass + one Resend notify.** This is
  *most of the closed loop already present* — the plan buries it as the third chapter.

### Ch 4 — The money button (THE milestone)
- **STRATEGIC:** webhook idempotency + **fail-CLOSED** (corpus B15: today the legacy fails OPEN; the
  in-tree webhook `stripe/webhook/route.ts` has *no* idempotency at all) + `webhook_log`. publish→notify.
- **TACTICAL/already-done:** the full-i18n Checkout Session (built, `stripe.ts`), the publish route
  (built), the webhook→markPublished (built, and `markPeekPublished` is already doc-level idempotent via
  the status short-circuit `store.ts:73`).
- **Verdict:** Ch4's headline ("build the full-i18n Checkout Session") is **already done.** Remaining real
  work = idempotency/fail-closed + notify — which is **the same Resend notify as Ch3.** Ch3 and Ch4 share a
  deliverable; sequence them as one.

### Ch 5 — Harden + no-backfill seams
- **STRATEGIC (and DANGEROUSLY LATE):** botGate/Turnstile on `/api/curator` (corpus Z1: "open chat = open
  wallet the instant a key deploys"); the not-backfillable **referral attribution** + **occasion-tagged
  pick logging** (seam-ledger #5, #6). These last two **cannot be added after data accrues.**
- **MIS-SEQUENCED:** referral/occasion-logging are *data-shape* seams that must exist **at the first real
  write**, i.e. before Ch3/Ch4 produce the first pick/peek. Putting them in Ch5 (after the milestone) means
  **the milestone run itself produces un-attributable data** — a small scrap. Move the *columns/event-kinds*
  (not the behavior) to Ch1's seam batch.
- **HUMAN-BLOCKER:** botGate needs Turnstile keys (in-flight per corpus §5.1) — but the plan correctly
  notes "$0 until a key deploys"; still, **botGate must land before the curator route is exposed on a
  funded key**, which could be *before* Ch5 if Ch2's studio is demoed live. Flag: don't deploy a keyed
  curator endpoint until the gate exists, regardless of chapter number.

### Ch 6 — Cutover
- **HUMAN-BLOCKER (correctly flagged as Ch6-only):** legacy Vite repo location. This is genuinely
  non-blocking until cutover. Good.
- No over/under-build issue. Leave as-is.

---

## THE MICRO-REVISION TRAP (the owner's feared "loop of nonsense micro-revisions")

**Where it lives:** Ch2 + Ch3 are the danger zone. The output quality (Ch2) and the live loop (Ch3/4) are
both judged by **screenshot on a phone** (gates lines 58-59) and by **a real Anthropic call + a real Stripe
webhook**. That structure *is* the trap: tweak prompt → deploy → screenshot → "too safe, again" → tweak →
redeploy. Each iteration costs a Netlify build + an Opus turn + a human glance. The corpus names this exact
pattern (decisions-bugs §3A rule 2: batch deploys; the owner pays per build).

**The work pattern that triggers it:** any gate whose feedback signal is "deploy then look." The plan's
gates are deploy-shaped (200 / deploy / phone screenshot). Prompt tuning against a deploy-shaped gate is the
deploy→tweak→redeploy treadmill by construction.

**How to kill it (structure the plan to make these LOCAL, not deployed):**
1. **A local golden-brief harness (Ch2, build BEFORE touching the prompt).** A script that runs N fixed
   briefs (the corpus's cold-range set: "get-well for the coworker who broke his leg skiing", "going-away
   for the office cat" + the 10 mockups) through `runCuratorTurnStreaming` against a real key **locally**,
   writes each `presentation.html`, and screenshots all of them in one headless batch (wait for
   `document.fonts.ready` per corpus §2.11). Prompt iteration becomes: edit prompt → run harness → eyeball
   15 pages at once → repeat, **zero deploys** until a batch clears the bar. This converts the treadmill
   into a tight local loop. The fixtures already exist (`packages/core/tests/fixtures/*.ir.json`,
   `apps/web/app/demo/fixtures/*`).
2. **Validate-lite + batch gates (Ch1/Ch3).** Make the spine/caps/publish preconditions **unit-tested in
   `packages/core`** (the picks engine already has `tests/picks.test.ts`; extend with cap-block fixtures)
   so cap enforcement, over-cap block, unpriced-tab block are proven **without a deploy**. The live run is
   then a single confirmation, not an iteration surface.
3. **One push per cleared batch.** The corpus rule (batch deploys) must be written *into the gate
   definition*, not left as discipline: a gate passes locally first; deploy is the last step, once.

**The anti-pattern to forbid explicitly:** "deploy to see if the prompt is better." If the plan doesn't
mandate the local harness, Ch2 *will* become the micro-revision loop the owner fears — it's the highest-
variance, most-subjective gate in the build.

---

## "MIDDLE FIRST"? — is the chapter ORDER the fastest path to a testable closed loop?

**Partially. The plan smuggles infra/contract work ahead of the loop.** "Middle-first" should mean: the
first thing proven green is `create → author → pick → notify`. But Ch1 (the full contract gate) sits
*before* the studio (Ch2) and the loop (Ch3/4), and Ch1's heaviest item (spine-through-`decide`) is
**bookend-grade durability work the middle doesn't need.** That's smuggled infra.

The true middle — author a page (Ch2 plumbing, already built), pick within caps (Ch3 3-line fix +
already-built pick route), pay (Ch4 already-built checkout), notify (the one new Resend call) — is reachable
**without finishing Ch1's gate at all.** The plan orders durability (Ch1) before magic+loop (Ch2-4); a
true middle-first order does the loop on the tactical spine, then hardens.

---

## THE LEANEST CRITICAL PATH TO FIRST GREEN LOOP (ranked, [STRATEGIC|TACTICAL])

The single run that's never happened: `create → author → publish → $12 (test coupon) → recipient picks
within caps → creator notified`. Ranked by what unblocks it, smallest-first:

1. **[TACTICAL] Ch0-lite: stand clean-slate up, `pnpm build`+`typecheck` green, locally.** Don't gate on
   the flaky Netlify live-commit read — do that async. *(verify the stale-root Tailwind even exists before
   de-Tailwinding.)*
2. **[TACTICAL] Pass `caps` to `decidePick` in `pick/route.ts:22`.** 3 lines. Reads `hardCents/softCents`
   off the spine/peek. This alone resurrects dead server-side enforcement.
3. **[TACTICAL] Surface `extractSpine` `issues[]` (fix `draft.ts:25` dropping them) + a validate-lite
   publish precondition** (block on `level:"error"` or unpriced-tab, both already computed in `extract.ts`).
   This is the throwaway spine-gate the owner sanctioned — NOT the `decide` gate.
4. **[STRATEGIC] Webhook idempotency + fail-CLOSED + `webhook_log` insert** in `stripe/webhook/route.ts`.
   Cheap, durable, and the one place fail-open is a money bug (B15).
5. **[STRATEGIC] One Resend creator-notify call** on pick-finalize / publish (serves both Ch3 and Ch4).
   This is the *only* genuinely-missing piece of the loop's behavior.
6. **[STRATEGIC] The cheap not-backfillable seams as DATA only, NOW** (before the first real write):
   `actorId` on the event/command types; `referredByPeekId`/`referrerUserId` columns + `referral` event
   kind; occasion tag on the pick log. Typed sockets + nullable columns — hours, not a chapter. **Skipping
   these forces a data scrap; they are the real reason a "seam now" chapter exists — pull them forward.**
7. **[STRATEGIC] The MEAT: prompt rewrite past v0 + prompt-caching + the local golden-brief harness (Ch2).**
   Last on the critical path *to green* (the loop closes on the existing 91-line prompt), but FIRST in
   durable value once green — and the harness must precede prompt edits to dodge the micro-revision loop.

**Everything else in the plan is post-green hardening** (full `decide` gate, sandbox subdomain, CSS-url
allowlist, SSRF guard, botGate, Sentry, cutover) and should be sequenced *after* the first green loop, not
before. `FulfillmentPort` stub + widened `createCheckout`/`verifyWebhook` are cheap typed sockets — fold
into step 6's seam batch.

---

## DEAD-DROP: mis-classifications & smaller holes

- **`mark_ready` vs `publish` drift:** core `decide` has a `mark_ready` command with preconditions
  (`decide.ts:239-243`) but the live publish path (`tools.ts` `publish` → `turn.ts:125` emits `ready`) never
  routes through it. The plan's "publish = mark-ready intent" is half-wired; the precondition check exists
  in core but is unreachable. Wire publish → `mark_ready` decide (validate-lite) rather than building new.
- **Prompt-caching claimed, absent:** plan lines 32/48 say "prompt-cached"; `turn.ts:40-47` sends `system`
  as a plain string. A COGS risk the corpus explicitly flags (Opus-default + no cache). Add `cache_control`
  in Ch2 — it's part of the meat, not deferrable.
- **`verifyWebhook` not used:** the in-tree webhook calls Stripe SDK directly (`webhook/route.ts:18`), not
  the core `PaymentPort.verifyWebhook`. Widening the *port* (seam #2) is correct for the future, but note the
  live path bypasses it today — widen the port AND keep the live route's own dedup, don't assume the port
  change touches the loop.
- **Research tier stub is fine to leave stubbed** (`card-resolver.ts:177`) — the loop closes on `url_scrape`
  + model-authored cards. The plan correctly defers it. Not a hole.
- **`search` advertised, no backend** (corpus §3.3): the `data-peek-img-src="search"` path has no consumer;
  leave it, but the prompt should not tell the model `search` works.
