# BRIEF 12 — Checkout bolt-on (Stripe Payment Element custom UI)

**Source of need:** the spine-thread's publish action just flips status `draft → published` with no money. Production needs a custom-branded Stripe Payment Element handling every country/currency/method. Engine = Stripe; face = ours.

**Frank's call (durable):** "that checkout works but im not about to vouch for it i would say ur better off looking at it for info then just doing one urself itls just wired in from stripe how bad can it be." **Use legacy peek.gift as info-source for HOW Stripe is wired (the shape: Payment Element → Checkout Session → webhook handler → status flip), NOT as a code-port.** Build fresh ourselves.

**Read first:**
1. `_packets/SPINE/STACK-LOCK.md` — checkout row.
2. `_packets/MEMORY.md` §1.4 — Stripe price ID, webhook ID, Tax + Adaptive Pricing flags.
3. `atelier/app/api/spine/publish/route.ts` — current free publish flow (replace this with paid).
4. Stripe Payment Element docs (use WebSearch — verify current API; Stripe ships fast).
5. Root `app/api/publish/route.ts` + `app/api/stripe-webhook/route.ts` — the earlier vNext root attempt; clean reference for shape (uses Checkout Session, not Payment Element — Payment Element is a step up).
6. **Legacy peek.gift Vite repo (not in this repo)** — Frank or the lieutenant pulls. INFO-SOURCE for: Payment Element instantiation, which Stripe API version, webhook event subscriptions, how status flip is gated, how the `peek_v2.peeks` row is updated. NOT a code-port.

## DELIVERABLES

### 1. Custom Stripe Payment Element UI

`atelier/components/checkout/`:
- `publish-paywall.tsx` — full-screen mobile modal mounted by BUILD UI after `mark_ready_to_publish` returns `paywall`. Live peek preview at top (renders via `<SlugRenderer>` — one-renderer invariant); Payment Element below; "publish" CTA. No Stripe branding visible.
- `payment-element.tsx` — wraps `@stripe/react-stripe-js` `<Elements>` + `<PaymentElement>`. Theme tokens map to `--vibe-*`. Layout: tabs or accordion (try tabs first; per research Frank wants slick).
- `apple-pay-button.tsx` / `google-pay-button.tsx` — wallet shortcuts above Payment Element when supported.

### 2. Server-side

- `atelier/app/api/checkout/intent/route.ts` (Node, NOT edge — Stripe SDK is Node-only) — `POST` creates a Stripe `PaymentIntent` for the peek's publish price. Server-validates the peek is `ready_for_publish` AND owned by `curator_id` (or has the anon-session claim token for guest publish). Returns `clientSecret`.
- `atelier/app/api/stripe/webhook/route.ts` — verify signature against `STRIPE_WEBHOOK_SECRET`. Handle:
  - `payment_intent.succeeded` → flip `peek.status: published`, set `published_at`, mint `share_url`, schedule recipient notification email via Resend.
  - `payment_intent.payment_failed` → log; UI polls and surfaces user-friendly retry.
  - `payment_intent.processing` (async methods like ACH/Klarna) → set intermediate state; UI shows "processing — we'll email you when it clears."
  - `checkout.session.async_payment_succeeded` / `_failed` (if using Checkout Session fallback) — same handling.
- All webhook actions idempotent (use Upstash Redis if keyed, otherwise rely on Stripe's event ID + a DB unique index).

### 3. Payment-method enablement

Don't try to enable methods server-side (they're configured in Stripe Dashboard — concierge handles). DO ensure the Payment Element loads all enabled methods automatically (`automatic_payment_methods.enabled: true`).

### 4. Adaptive Pricing

Env flag `STRIPE_ADAPTIVE_PRICING=on` is set. Verify Payment Intent creation passes the flag through (Stripe-side: it just works if account-level is on). Show the localized price in the paywall UI by reading the PI's `currency` + `amount`.

### 5. Tax

Tax is ACTIVE, NJ origin registered. Tax code currently `txcd_10000000`; Frank-todo to switch to `txcd_10103001` (Digital) — concierge handles. Pass `automatic_tax: { enabled: true }` in PI creation. Display the tax line in the paywall as "Tax (calculated at checkout)".

### 6. Recipient notification

After `payment_intent.succeeded`:
- Emit `system: 'published'` event into Peek's chat transcript (so Peek congratulates the curator).
- If recipient email captured (curator may have set it), schedule Resend transactional email with the share URL.
- Otherwise, surface a "send the link" share sheet (native Web Share API + copy-to-clipboard fallback).

### 7. Tests

- Custom UI renders no Stripe-branded text/logos.
- Payment Intent created with correct amount/currency for a `ready_for_publish` peek.
- Server rejects PI creation for unauthorized curator OR non-ready peek.
- Webhook verifies signature, rejects unsigned.
- Idempotent webhook (handle same event twice — peek.status flips once, share_url stable).
- Adaptive Pricing localized amount surfaces correctly in UI.

## HARD RULES

- **NO Stripe branding visible.** Payment Element comes themed; theme it to disappear. Inspect the rendered iframe for any "Powered by Stripe" — if Stripe forces it, document but raise with Frank.
- **NO Tailwind.** CSS Modules + `--vibe-*` tokens.
- **Don't touch legacy webhook** `we_1TRbB2CEKPUsVee1Qh084LCz` (legacy peek.gift). Only `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` (vNext) is ours.
- **Test in test mode FIRST**, then live mode. Test mode = `STRIPE_PRICE_ID` mapped to test-mode price; toggle via env, not code.
- **`PAY_MODE=mock` short-circuit** — keep the mock path for local dev (publish flips status without Stripe). Live = real Stripe.
- **Edge-incompatible: this route is Node runtime.** Stripe SDK doesn't run on Deno/Edge. That's fine — only the chat loop needs edge; checkout is a one-shot.
- **Branch:** `lt/checkout-bolt-on` off `claude/bold-ride-Li5zK`. Push.

## VERIFICATION

- `npm --prefix atelier run typecheck` — 0.
- `npm --prefix atelier run test` — pass + new checkout tests.
- `npm --prefix atelier run build` — clean.
- Smoke-test (lieutenant runs locally OR flags Frank-verify): mock-mode publish flips status; live-mode test (small charge with `THISISTHEONE` coupon = $0.50) succeeds end-to-end and `peek.status = published`.

## RETURN.md

Sections: what you built; visible-Stripe-branding audit (grep + iframe inspection); event subscription list (must include `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.processing`, `charge.refunded`, `charge.dispute.created`); webhook idempotency proof; how you handled the legacy info-source extraction (what you learned, what you discarded); a Frank-verifiable test charge plan. Honesty section.

Per PROTOCOL.md: push `lt/checkout-bolt-on`, write RETURN.md.
