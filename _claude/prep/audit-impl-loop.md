# Implementation Audit — create→publish→$12→pick→notify loop

**Scope:** line-by-line read of the files named in the brief + the live Supabase schema (MCP `list_tables`, project `ewqpujqerdnrkjqlpobo`). READ-ONLY. Question answered: does the loop *actually close once, live* — not "does it compile."

**Verdict up front: NO. The loop cannot close.** Two structural breaks make it impossible even with every key present:
1. The **published recipient page never sends a pick** — the injected runtime no-ops on tap (no `fetch`, sandboxed iframe). `/api/pick` + `decidePick` + `peek_picks` are dead on the real path.
2. There is **no notify leg anywhere** in `apps/web`. Even a successful publish + pick tells the creator nothing.

Plus the brief's specific gaps are all real: caps never passed to the engine, `budget_cents` discarded, webhook writes no `webhook_log` and is fail-open for any future side-effect, no studio publish CTA.

---

## A. Live schema ground truth (Supabase MCP, project `ewqpujqerdnrkjqlpobo`)

The repo migrations only define `peek_v2.peek_documents` and `peek_v2.peek_picks`. The live DB has **both the legacy relational `peek_v2.*` graph AND the vNext document store**, plus a separate legacy `public.*` graph. Relevant rows:

| Table | Exists | Rows | Notes |
|---|---|---|---|
| `peek_v2.peek_documents` (text id, jsonb `doc`, status **free text**) | yes | **1** | vNext store the code uses. No `budget_cents`, no `share_url` column (both live inside `doc` jsonb). |
| `peek_v2.peek_picks` (peek_id PK→`peek_documents.id`, jsonb `picks`, `recipient_note`) | yes | **0** | What `picks.ts` writes. **No `committed_cents`, no beg/fulfillment, single-row-per-peek.** |
| `peek_v2.picks` (rich: `card_id`, `beg_message`, `beg_approved_at`, `fulfilled_at`, `fulfillment_notes`, FK→`peeks.id` UUID) | yes | **0** | The *legacy* rich pick table. **vNext code does NOT write it.** Two pick representations; the rich one is orphaned. |
| `peek_v2.peeks` (legacy relational, has **`budget_cents int`**) | yes | 50 | The only place a budget column exists — and the vNext path never touches this table. |
| `peek_v2.webhook_log` (`id`, `source`, `payload`, `success`, `received_at` — **NO `event_id`, NO unique key**) | yes | **0** | vNext webhook writes nothing here. Can't dedup on event id even if it tried. |
| `public.webhook_events` (`event_id` PK) | yes | 56 | Legacy idempotency store (the off-repo Vite app). Not used by vNext. |

**Confirmed:** `peek_picks` is the table the notify path *would* read, and it is the table `/api/pick` writes — they agree. But it is **0 rows** because nothing ever reaches it (§C). The brief's "`peek_picks` vs `picks`" question: **both exist, both empty; vNext uses `peek_picks` (jsonb), the rich `picks` table is dead.** `budget_cents` exists only on the legacy `peeks` table, unreachable from vNext.

---

## B. THE engine + caps (server budget enforcement)

`packages/core/src/picks/engine.ts` — `decidePick(doc, current, action, caps?)` is **correct and complete**: hard cap → `INVARIANT` error (`engine.ts:63-70`), soft cap → `overSoftCap` flag (`:72`), taunt/lock blocked (`:29-30`), pick_one/pick_all/pick_any handled (`:38-52`), deterministic sorted output (`:73`). Unit-tested (`packages/core/tests/picks.test.ts:60-70`). **The engine is not the problem.**

**`/api/pick/route.ts:22`** calls:
```ts
const r = decidePick(doc, current, { type: "toggle", cardId: body.cardId });
```
**No 4th arg. `caps` is `undefined`.** So `caps?.hardCents` and `caps?.softCents` are both nullish → the hard-cap branch and soft-cap branch never fire. **Server budget enforcement is DEAD**, exactly as the brief suspected. `overSoftCap` is always `false`.

**Why it can't be trivially fixed in 3 lines:** there is *nowhere to read caps from*. `PeekIR.Peek` (`contract.ts:166-190`) has **no budget field**. `extractSpine` computes `budgetCents` (`extract.ts:110,313`) but `buildDraftDocument` destructures only `{ cards, variant_groups }` (`draft.ts:25`) — **budget is dropped on the floor before save**. So even passing `caps` to `decidePick` would pass `{}`. The cap pass requires *first* persisting the budget (schema + contract change), then reading it in the route.

---

## C. THE structural loop-breaker — picks never persist on a published page

This is the headline. `/api/pick` is reachable in exactly one render path, and that path is never used for a real peek.

- **`app/g/[slug]/page.tsx:27-38`** — if `doc.presentation?.html` exists (i.e. an authored peek, which is *every* real peek), it renders the HTML in `<iframe sandbox="allow-scripts" …>` via `frameDoc(html, "recipient")`. **No `allow-same-origin`.**
- **`lib/curator/page-html.ts:12`** — `frameDoc` injects only `window.__PEEK__={mode:"recipient"}` + `/peek-runtime.js`. **It sets no `onAction` callback.**
- **`public/peek-runtime.js`** — has **zero network calls** (grep: no `fetch`, no `XMLHttpRequest`, no `/api/`, no `postMessage`). The pick CTA handler `doAction(type)` (`peek-runtime.js:178-183`):
  ```js
  if (typeof cfg.onAction === "function") cfg.onAction(type, summary);
  else if (cfg.mode !== "recipient") { console.log("[peek] action:", …); }
  ```
  In recipient mode with no `onAction`, **neither branch runs — it silently no-ops.** Tapping cards toggles a CSS class (`:50` `chosen-on`) and updates the tab meter locally; "Send my picks" (`:161-162`) does nothing.
- **`app/g/[slug]/page.tsx:40-41`** — the only caller of `/api/pick` is the React `RecipientView`, rendered **only when `presentation.html` is absent**. `components/recipient-view.tsx:18` is the sole `fetch("/api/pick")` in the app. For any authored peek this component never mounts.

**Net:** recipient taps on a live published page persist nothing → `peek_picks` stays empty → notify (if it existed) has nothing to read. This is why `peek_picks=0` live. The loop is physically open here regardless of caps/notify.

---

## D. Notify / email (Resend) — ABSENT (loop-blocker)

- `grep -rilE "resend|notif|sendEmail|fulfill" apps/web` → **no source files** (one match is `tsconfig.tsbuildinfo`, a build cache).
- `app/api/pick/route.ts` — persists picks, returns JSON, **no email.**
- `app/api/stripe/webhook/route.ts:23-32` — on payment, calls `markPeekPublished` only. **No creator email.**
- `EmailPort` is defined (`ports/ports.ts:151-153`) but **no adapter implements it** and **nothing imports it.**
- `RESEND_API_KEY` + `NOTIFICATIONS_FROM` are in `.env.example:24-26` (keyed live per ops notes) but **never read in code.**

**Verdict: there is NO notify code on pick or publish or webhook.** This is a hard loop-blocker — the "creator notified to fulfill" milestone (the entire point of Tier-1 Studio) is not implemented.

---

## E. Publish route + Stripe webhook

### `app/api/publish/route.ts`
- Guards `paymentConfigured()` (`:7`), loads doc by id (`:18`), builds checkout (`:22`), returns `{ clientSecret }` (`:24`). Mechanically fine **as an endpoint**.
- **But nothing calls it.** `app/studio/page.tsx` only fetches `/api/upload` and `/api/curator` — **no publish/checkout UI, no EmbeddedCheckout mount, no `@stripe/stripe-js` dependency** (grep empty). The "$12 money button" does not exist in the client. The `return_url` points at `/studio?published=…` but no studio code reads that param.

### `app/api/stripe/webhook/route.ts`
- **Signature verification: good** — `constructEventAsync` (`:18`), rejects missing sig (`:13`) and bad sig (`:19-21`).
- **Idempotency: FAIL-OPEN / absent.** No dedup at all. `markPeekPublished` is self-idempotent on status (`store.ts:73` short-circuits if already published/claimed), so a duplicate event won't double-publish *today*. **But** the moment a side-effect (notify/fulfillment) is added, Stripe's at-least-once delivery double-fires it. There is no guard.
- **`webhook_log`: NOT written.** The table exists live (0 rows) but the route inserts nothing. No audit trail, no event-id dedup key.
- **Flips peek to published: yes**, via `markPeekPublished` (`store.ts:67-90`) on `checkout.session.completed` or `payment_intent.succeeded`, keyed on `obj.metadata.peek_id`. Note `payment_intent.succeeded`'s object also reads `obj.metadata?.peek_id` — Checkout-created PaymentIntents only carry that metadata if `payment_intent_data.metadata` was set, which `createPublishCheckout` does **not** set (it sets session-level metadata only). So the PI branch will usually find no `peekId` and no-op; publish relies on the session branch. Works, but the PI branch is effectively dead.
- **`share_url` built correctly: yes-ish** — `store.ts:84` sets `share_url: /g/${slug}` (relative path). It's a valid internal route but not an absolute shareable URL; `APP_URL` is available and not used here. Minor.

---

## F. `lib/payment/stripe.ts` — i18n Checkout Session

**Real, not a stub — and genuinely well-built for i18n.** `createPublishCheckout` (`stripe.ts:16-41`) creates an **embedded** session (`ui_mode:"embedded"`, `:26`), `mode:"payment"`, one `STRIPE_PRICE_ID` line item, with the full international kit: `automatic_tax` (`:31`), `tax_id_collection` (`:32`), `billing_address_collection:"auto"` (`:33`), `customer_creation:"always"` (`:34`), `adaptive_pricing` (`:35`, multi-currency), `allow_promotion_codes` (`:36`). Returns `client_secret`. Metadata carries `peek_id` + `curator_id` (`:30`) → matches what the webhook reads. **This is the most complete piece in the audit.** Caveats: the params object is force-cast `as unknown as SessionCreateParams` (`:37`) bypassing type-checking (a typo'd field would compile and fail at runtime), no `metadata` on `payment_intent_data` (see §E), no explicit `locale`. But the session itself is real and would produce a working $12 i18n checkout — it just has no UI mounting it (§E).

---

## G. Persistence round-trip

`store.ts` save (`:23-42`) writes `{id, slug, curator_id, status, doc, updated_at}` upsert on `id`; load (`:44-51`) selects `doc`, validates via `validatePeekDocument`. **The full `doc` jsonb round-trips losslessly** — `PeekDocumentSchema` is `.passthrough()` at every level (`document/schema.ts`), so anything in the doc survives save→load. `markPeekPublished` (`:67-90`) is a load→mutate→save round-trip and is correct.

**What is lost is upstream of persistence, not in it:**
- **`budget_cents` is discarded at draft-build time** (`draft.ts:25` — extracted then dropped). It never enters `doc`, so there is nothing for round-trip to lose, and nothing for caps to read. **The red-team claim is correct.**
- `peek_picks` jsonb stores only a card-id array — **`committedCents`, beg state, fulfillment, recipient identity are not persisted** (the route returns `committedCents` to the client but never stores it). The rich `peek_v2.picks` table that *has* those columns is never written.
- `recipient_note` column on `peek_picks` exists but `savePicks` (`picks.ts:23-30`) never writes it.

`storage.ts` / `upload/route.ts`: solid. Service-role client, type/size guards (`upload/route.ts:6-7,26,30`), random key, public URL. KEEP.

---

## H. Ports — stubs / honest-fakes / dice-rolls

- **`lib/ports/card-resolver.ts`** — `retailer_api` tier: dead (no `productSource.search` defined → `makeCardResolver` `continue`s past it, `ports.ts:82`). `url_scrape`: **real** — direct `fetch` + JSON-LD/OG/`<title>` parse (`card-resolver.ts:117-174`), with ZenRows JS-render fallback gated on `ZENROWS_API_KEY` (`:164-170`). Honest behavior when keyless. `research` tier: **hard stub** — `resolveFromDescription` always returns `{ok:false, error:"research tier … not wired yet"}` (`:176-180`). So a plain text description with no URL resolves nothing. Not a dice-roll, but a 2-of-3 cascade with one real leg.
- **`lib/ports/image.ts`** — `generateHero` is **real** (fal flux/schnell, `:25`), stores to Supabase with graceful fallback to the fal URL (`:42-51`). Honest `{ok:false}` when `FAL_KEY` absent (`:20`). `enable_safety_checker:false` (`:33`) — ships unmoderated AI images (ModerationPort exists but isn't called here). KEEP with a moderation note.
- **`lib/ports/*`** — only `card-resolver` and `image` adapters exist. **`PersistencePort`, `PaymentPort`, `AuthPort`, `EmailPort`, `AnalyticsPort`, `ModerationPort`, `StoragePort`, `BotGatePort`, `LLMPort` are declared in `ports/ports.ts` but have no adapter objects** — the app calls concrete modules (`store.ts`, `stripe.ts`) directly, bypassing the port abstraction. Not a bug for the loop, but the "13 ports + stubs" architecture is aspirational, not wired.

---

## PER-FILE VERDICT

| File | Verdict | Why |
|---|---|---|
| `packages/core/src/picks/engine.ts` | **KEEP** | Correct, tested, pure. The one thing fully right. |
| `packages/core/src/ports/ports.ts` | **KEEP** | Interfaces are fine; just mostly unimplemented. |
| `packages/core/src/document/contract.ts` | **FIX** | Add a budget field to `Peek` (e.g. `budget_cents`/`soft_cap_cents`) so caps can persist. |
| `packages/core/src/document/schema.ts` | **FIX** | Mirror the new budget field (passthrough already tolerates it, but make it first-class). |
| `packages/core/src/commands/decide.ts` + `apply.ts` | **KEEP** | Sound event-sourcing; not on the critical path. |
| `apps/web/lib/persistence/store.ts` | **KEEP** (minor: absolute `share_url`) | Lossless round-trip; idempotent publish. |
| `apps/web/lib/persistence/picks.ts` | **FIX** | Persists only a card-id array; no committed_cents/recipient_note. OK for v1 close-the-loop; widen later. |
| `apps/web/lib/persistence/storage.ts` | **KEEP** | Clean. |
| `apps/web/app/api/pick/route.ts` | **FIX** | Pass `caps` to `decidePick`; (and it must become *reachable* — see runtime). |
| `apps/web/app/api/publish/route.ts` | **KEEP** (endpoint) — **FIX** the missing client wiring | Endpoint fine; no UI calls it. |
| `apps/web/app/api/stripe/webhook/route.ts` | **FIX** | Add `webhook_log` insert + fail-CLOSED dedup before any side-effect; fire notify here. |
| `apps/web/app/api/upload/route.ts` | **KEEP** | Solid. |
| `apps/web/lib/payment/stripe.ts` | **KEEP** | Real, complete i18n embedded checkout. Drop the `as unknown` cast when convenient. |
| `apps/web/lib/ports/card-resolver.ts` | **FIX** | url_scrape real; research tier is a stub; retailer_api dead. Acceptable for loop; flag research. |
| `apps/web/lib/ports/image.ts` | **KEEP** (note: `enable_safety_checker:false`) | Real fal adapter. |
| `apps/web/public/peek-runtime.js` | **REWRITE-CLEAN** (the critical break) | Recipient mode must POST picks to `/api/pick` (or `postMessage` to the parent). Today it no-ops. |
| `apps/web/lib/curator/page-html.ts` (`frameDoc`) | **FIX** | Must allow the recipient runtime to talk to the host (provide an `onAction` bridge + a sandbox that permits the network/parent message). |
| `apps/web/lib/curator/draft.ts` | **FIX** | Stop discarding `budgetCents`; thread it into `peek.budget_cents`. |
| `apps/web/components/recipient-view.tsx` | **KEEP** | Correct — but only used on the dead non-HTML path. |

---

## ORDERED PUNCH LIST — minimal set to make ONE create→publish→$12→pick(within caps)→notify run go green

**1. Make recipient picks actually leave the published page.** *(the loop is open here first)*
   - In `peek-runtime.js`, on card toggle and on "Send my picks", `POST /api/pick {slug, cardId}` (or `postMessage` to the parent which forwards it). Today `doAction` no-ops in recipient mode (`peek-runtime.js:178-183`).
   - In `frameDoc` (`page-html.ts:12`) pass the slug into `__PEEK__` and either widen the iframe sandbox to permit the fetch or wire a `postMessage`→host→`/api/pick` bridge in `g/[slug]/page.tsx`. Until this lands, *nothing else in the list matters* — `peek_picks` stays 0.

**2. Persist the budget so caps exist.**
   - Add `budget_cents: number | null` (and optional `soft_cap_cents`) to `Peek` in `contract.ts:166` + `schema.ts` `PeekSchema`.
   - In `draft.ts:25`, capture `budgetCents` from `extractSpine` and set `peek.budget_cents`.
   - (Migration optional: the value lives in the `doc` jsonb; a top-level column on `peek_documents` is only needed if you want to index/query it.)

**3. Pass caps to the engine.** `/api/pick/route.ts:22`:
   ```ts
   const caps = { hardCents: doc.peek.budget_cents ?? undefined, softCents: doc.peek.soft_cap_cents ?? undefined };
   const r = decidePick(doc, current, { type: "toggle", cardId: body.cardId }, caps);
   ```
   Now hard-cap blocks (409) and `overSoftCap` warns — both already handled by `recipient-view.tsx` and need handling in the new runtime path from step 1.

**4. Wire the studio publish CTA → $12.** In `app/studio/page.tsx`: add a Publish button → `POST /api/publish {peekId}` → mount Stripe embedded checkout with the returned `clientSecret` (add `@stripe/stripe-js` + `@stripe/react-stripe-js`). The endpoint and session (`stripe.ts`) are already real. Without this the $12 never gets collected from the product.

**5. Make the webhook fail-CLOSED + log.** In `stripe/webhook/route.ts`, before side-effects: insert into `peek_v2.webhook_log` (add a unique key on the Stripe `event.id` — the live table lacks one, so a tiny migration is needed) and skip if already present. Only then run `markPeekPublished` + the notify in step 6.

**6. Add the creator notify (Resend) — the missing leg.** Implement an `EmailPort` Resend adapter (keys already in env). Fire it from the webhook after a successful, deduped publish-with-picks (and/or on pick-finalize), to the curator with what was selected. This is genuinely net-new code — nothing exists today.

**Gate to call the milestone green:** one test-mode run where create→author→publish ($12, embedded checkout)→recipient taps within a hard cap on the *published* page→`peek_picks` gains a row (over-cap blocked, soft-cap warned)→`webhook_log` gains exactly one row→creator receives one email. Today: `peek_picks=0`, `webhook_log=0`, no email path — **0 of those happen.**
