# 00-BUILD-PLAN — peek.gift, the line we hold

> Written by the CTO from the full prep corpus (`_claude/prep/*` — 11 discovery docs +
> audit-gaps + audit-verify + lieutenant-research + 00-CORPUS, all `branch:path`-sourced).
> Frame: the existing code/mockups/zips are the **floor**. This plan exceeds them.
> Nothing here is immutable — it's the held line, not a cage.

---

## THE BET (why this beats the BUILD-BOOK)

Every one of the ~50 prior restarts hit the **same false choice** and picked a side:
- **Freeform HTML** → gorgeous, unmistakably-theirs output (the moat) … but no commerce rigor (caps not enforced, no gate, picks flattened).
- **Structured IR** → rigorous commerce + a maker-checker gate … but *caged, "housey," bland* output (the parametric engine got rejected for exactly this).

**The plan dissolves the choice instead of picking a side:**
> The model authors **freeform HTML** (max taste — the skin). A **spine** is extracted from the `data-peek-*` tags (the skeleton). The **maker-checker gate validates the spine**, and the **server enforces caps/rules on the spine**. The renderer is a typed *fallback*, not the primary surface.

Gorgeous output **and** bulletproof commerce — the combination no prior line shipped. `clean-slate` started the dual-rep but **bypassed the gate and never passed caps to the engine** (verified in `audit-verify.md`). Closing those two gaps is the whole unlock.

And where the BUILD-BOOK over-engineered (Effect, event-sourcing everywhere, the catalog moat as Chapter 5 *before the loop ever ran*), this plan **overbuilds only the contract** (`packages/core`: document · commands · ports · decide/apply · render) and builds **lean behind it** — the entire future is **ports + stubs**, not implementations. Overbuild the skeleton, stub the organs. That is how it stays unscrapped without tail-spinning.

**The milestone that has never happened:** one real `create → author → publish → $12 → recipient picks within server-enforced caps → creator notified` run, green. `picks=0, webhook_log=0` in the live DB — the loop has never closed once. **Chapter order is milestone-first: close the loop fast, then harden.**

---

## THE CALLS (resolving the corpus §8 open forks — my decisions; veto any)

1. **Page model → freeform-HTML + derived spine (Dual Representation).** It's what's deployed, what the newest plan chose, and what produces the output you rate. The structured-IR/maker-checker is **demoted to (a)** the typed fallback when HTML is absent/corrupt and **(b)** the `next/og` unfurl surface. *But the gate + server-enforced caps move onto the spine — that's the fix.*
2. **Base branch → the `clean-slate` freeform line.** Newest, contains the `packages/core` gate + 13 ports + the freeform render in one tree. Its trimmed backend (rules / security / moderation / rate-limit / idempotency) gets **ported up from the atelier frontier** (`peek-clean`/`intelligent-brahmagupta`) via the asset map — not rebuilt. (First Ch-0 act: confirm the *actual* live commit via Netlify, then stand the base up and make it build — its tip is broken by a "strip every comment" commit.)
3. **Checkout → full-i18n Stripe Checkout Session** (`adaptive_pricing` / `automatic_tax` / `tax_id_collection` / Address Element / promo codes) — your "every non-sanctioned country" requirement, delegated to Stripe. It's a **bookend you own**; I wire the route + the idempotent, **fail-CLOSED** webhook and leave the hookpoint. `publish` is a *mark-ready intent*, never a checkout-UI tool (matches the anti-tools spec).
4. **Model → dialable, not hardcoded.** Opus 4.8 = the artist (page authoring); Sonnet/Haiku = the cheap hands (the collection chat + vision/extract/classify), all behind `LLMPort` + config. Your drop-to-Sonnet is a flag, never a rewrite. The expensive Opus call fires on a **config-dialable trigger** (enough-info OR explicit "show me") so we tune it on real usage — committing to nothing.
5. **Security → isolated origin.** The model's HTML is served from a **sandboxed origin** (sandbox subdomain / iframe without `allow-same-origin`) so a sanitizer miss can never reach Clerk/Stripe cookies. Real CSS sanitizer (not just DOMPurify) + CSP + SSRF-guard on scrape. The corpus names custom HTML the main XSS surface; this neutralizes it.
6. **Thin areas (collab / social / ops rules) → seams now, behavior later.** Built as ports/columns from line one (so never a scrap), behavior deferred until you give the product rules.

---

## THE ARCHITECTURE (overbuild the contract, stub the organs)

- **Monorepo:** Turborepo + pnpm, TS strict. `packages/core` is framework-agnostic (CI fails the build on a framework import). **No Tailwind** — runtime CSS-variable tokens (`--peek-*`); CI fails on Tailwind classNames.
- **`packages/core` — the durable spine:**
  - `PeekDocument = { schema_version, spine: PeekIR, presentation: {html, html_hash, runtime_version} | null }`.
  - **Command union → `decide(doc, cmd, ctx) → Result<Event[], Err>` (neverthrow) → pure `apply(doc, event) → doc`.** The document is the fold of its events → undo/replay/history free. **Every Command/Event carries `actorId`** (the cheap-now/impossible-later collaboration seam).
  - **`extractSpine(html)` runs the derived spine through `decide`/validation** — not just DOMPurify. A malformed authored page bounces at the boundary; the commerce truth can never drift from the skin.
  - `render(spine, theme)` — pure, deterministic; the fallback + `next/og` surface.
  - **The picks engine takes `caps`** — wire `decidePick(doc, current, op, caps)` in the recipient route (today it's called without caps = dead enforcement). Hard cap blocks; soft cap warns; taunt/lock/`requires_picks`/`beg`/`date_after` enforced server-side.
  - **13 ports + stubs:** `llm · productSource · research · cardResolver · image · persistence · payment · auth · email · analytics · moderation · storage · botGate` — **+ a new stubbed `fulfillment`** (Studio adapter = notify-and-mark-manual). `cardResolver` order stays **data** (`retailer_api → url_scrape → research`).
- **The seat (the moat):** the curator system prompt, **rewritten past v0** using the lieutenant rationale (the kill-the-noun → OBJECT → one-loud-move → make-it-move → tag-don't-script doctrine, the 10-point gate, the leaked-prompt patterns), kept lean, prompt-cached, model-dialable. `set_page(html)` + `edit_region` + `set_style` + `set_media` + `resolve_card` + `generate_hero_image` + `publish` — the 7-tool surface (no anti-tools).
- **The studio:** one screen — translucent chat over a live preview; SSE streams the `set_page` HTML; idiomorph morphs it live; `data-peek-*` host runtime wires selection/tab/locks/sheet/CTA. `visualViewport` keyboard-collapse reveal.
- **The recipient surface:** SSR `/g/<slug>` serving `presentation.html` in the isolated origin + the runtime; picks/beg/unlock read & enforce the spine server-side; cinematic reveal as a `page_type`; no retailer/Stripe/Clerk branding.

---

## THE BUILD SEQUENCE (top-down, each chapter ends in a GATE = test / 200 / deploy / screenshot; a gate that can't pass is a STOP)

- **Ch 0 — Ground truth + a base that builds.** Confirm the live commit on `vnext.peek.gift` (Netlify). Stand `clean-slate` up on our branch; fix the comment-strip breakage (the missing modules from `audit-verify`); de-Tailwind the stale root. **GATE:** `pnpm build` + `typecheck` green; existing core/web tests run.
- **Ch 1 — The contract, hardened.** Spine-through-the-gate (`extractSpine → decide`), `actorId` on events, `render(spine)` fallback, the ports + the new `fulfillment` stub, the widened `payment.createCheckout`/`verifyWebhook`. **GATE:** tests prove a malformed authored page bounces; replay reconstructs; caps enforce.
- **Ch 2 — The seat + studio (the magic).** Rewrite the prompt; wire the Opus curator turn (dialable) + the 7 tools + streaming + the live-preview morph + the runtime. **GATE:** a real one-line brief → a page authored live, **screenshotted on a phone** — and it beats the zip.
- **Ch 3 — The recipient loop + server-enforced rules.** Isolated-origin `/g/<slug>`; pick route with caps; beg/unlock; creator notify (Resend). **GATE:** recipient picks within a hard cap, over-cap is blocked, the pick persists, the creator is notified.
- **Ch 4 — The money button (THE milestone).** Publish CTA → full-i18n Checkout Session → idempotent fail-CLOSED webhook → publish + notify. **GATE:** one end-to-end test-mode run, the whole loop green.
- **Ch 5 — Harden + the no-backfill seams.** `botGate`/Turnstile on `/api/curator`, image moderation, the CSS sanitizer + CSP + isolated origin, Sentry, + the can't-backfill seams (referral attribution, occasion-tagged pick logging). **GATE:** the launch gates pass; an XSS/exfil corpus is clean.
- **Ch 6 — Cutover.** Deploy the line to vNext; repoint the Stripe webhook from legacy **without killing the $12 trickle**; the config-swap regression gate stays green for gift + GlacialSips. **GATE:** a real run on `vnext.peek.gift`.

**Cost/ops discipline throughout:** batch work → one push per gate (you pay per build); subagents over chat; no arbitrary rate/turn caps without real usage data; Opus only for authoring, Sonnet/Haiku for the rest.

---

## WHAT I NEED FROM YOU (non-blocking — I build around it)
- The **legacy Vite repo location** (to repoint the webhook at cutover without killing the live $12 trickle). Not needed until Ch 6.
- The **thin product rules** (collaboration: who-edits-what/invite/caps; social: share/referral/virality) — only when we reach Ch 5+. Seams go in regardless.
- One key when we light generation live (Anthropic) is already in Netlify — so a vNext deploy *runs*. Nothing for you to hand me there.

---

*The disease was ~50 non-compounding restarts. The cure is one held line that ADDS every session. This is that line. Building Ch 0 now.*
