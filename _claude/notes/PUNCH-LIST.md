# PUNCH-LIST — to mirror-finish + loop-green (pre-deploy)

> Consolidated from 3 line-by-line implementation audits (`_claude/prep/audit-impl-{generation,render,loop}.md`)
> + the 6 red-team reports. **Verdict across the codebase: exactly ONE rewrite (`peek-runtime.js` recipient
> pick-send); everything else is surgical FIX.** Not a rebuild. Deploy only when A+B+C are done and the loop
> goes green once, live.

## A — THE LOOP (net-new wires; `picks=0` is structural, never closed)
1. **PICK BRIDGE [#1 blocker].** `peek-runtime.js` recipient mode must `postMessage` picks to the parent; `app/g/[slug]/page.tsx` becomes a client island that listens + `POST`s `/api/pick`. (runtime: rewrite recipient path · g/[slug]: rewrite render branch · today: `onAction` undefined, zero network, bare server iframe with no listener)
2. **ONE ID SOURCE.** Server `extractSpine` id ≡ runtime `data-peek-id` — read the tag, mint once — so a pick's `cardId` never 404s in `decidePick`. (`extract.ts` + `peek-runtime.js`)
3. **CAPS LIVE.** Stop dropping `budget_cents` (`draft.ts:25`); add a budget field to the document; pass `caps` to `decidePick` (`pick/route.ts:22`). Engine is correct; enforcement is dead. (`contract.ts`/`document/schema.ts`/`draft.ts`/`pick/route.ts`)
4. **MONEY BUTTON.** Studio handles the dropped `ready`/`publish`/`saved` events and opens the **real, complete** i18n embedded Checkout (`payment/stripe.ts` is done); add `@stripe/stripe-js`. (studio + publish client wiring)
5. **WEBHOOK FAIL-CLOSED + `webhook_log`.** `event_id` idempotency dedup + write the (live, empty) `webhook_log` — *before* any notify side-effect, or Stripe retries double-fire. (`stripe/webhook/route.ts`)
6. **NOTIFY.** Resend on pick/publish — the "creator notified to fulfill" milestone. `RESEND_API_KEY` is keyed but unused; no email code exists. (new `EmailPort` adapter)
7. **SHARE URL.** Studio handles `saved` → shows `/g/<slug>` so the creator can send it. (studio)

## B — THE MEAT (beat the zips)
8. **SEAT PROMPT.** `system-prompt.ts` is materially weaker than the deployed `seat.ts`: restore widen-the-object / "paper artifact is the new generic", make-it-MOVE (motion behind the name), the `data-peek-img` host-filled image-slot contract, the base64/`data:` ban, render-the-material — and fix the lone kraft-paper few-shot so it doesn't rut on sepia. Then exceed it. **Single biggest quality lever.**
9. **AMNESIA FIX v2 (revise my own commit).** Seed `currentHtml` from the **persisted authored doc** (`loadDocumentById(peekId)`), NOT the dirty live iframe `outerHTML` (which carries runtime-injected sheet/bar/picked state + runtime ids the model never wrote, overrides the server's clean `applyPageOp` copy, and re-bills the whole page every turn). (`route.ts` + `studio/page.tsx`)

## C — SECURITY / CORRECTNESS (deploy-blocking subset)
10. **`set_style`/`set_media` through the sanitizer** — `@import`/`url()` currently ship raw into the iframe. (`page-html.ts` + `studio/page.tsx`)
11. **Recipient iframe: drop `allow-same-origin` / isolate origin** (cookie-theft); the pick bridge (#1) is what lets us remove it. Mitigate the studio's same-origin need (it reads `contentDocument`).
12. **Stop swallowing errors** — surface `extractSpine.issues[]`, don't save when nothing changed, no empty `catch` on persistence. (`route.ts`/`draft.ts`)

## D — POST-FIRST-GREEN POLISH (not deploy-blocking)
13. idiomorph morph for `set_page` (edits already patch via `edit_region`, so low priority — white-flash only on full re-author).
14. `bananahead` safeword backdoor default (`route.ts:51`) → env-gated, no live default.
15. `MAX_HOPS=12` silent exhaustion → emit a signal.

## DEPLOY GATE (the sun)
A + B + C done → deploy to a **fresh, non-destructive** Netlify site (keys present) → prove, live, in one run: `create → edit → publish → $12 (test) → pick within a hard cap (over-cap blocked) → creator notified`, green — **and** a golden-brief generation that beats the zip. Only then = mirror-finish. D after.

## SCHEMA NOTE (live, MCP-verified)
`peek_v2.peek_picks` (jsonb, what vNext writes) + `peek_v2.picks` (rich beg/fulfillment, orphaned) both exist, **0 rows**. `budget_cents` lives only on the legacy `peeks` table (unreachable from the vNext document path → item 3 must add it to the doc). `webhook_log` exists, 0 rows, **no `event_id` unique key** (add for idempotency, item 5).
