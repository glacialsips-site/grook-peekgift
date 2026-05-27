# Packet 15 — Stripe checkout: publish gate + webhook + payment-success flow

- **Worker:** cc-on-web | webchat-opus
- **Branch:** `claude/packet-15-checkout`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** `@/lib/env`, `@/lib/supabase/service`, `@/lib/auth/server`, `db/schema/*`
- **Validation:** `cd atelier && npm install && npm run typecheck` (cross-packet imports)
- **Target paths:** `atelier/app/api/checkout/**`, `atelier/app/api/stripe/webhook/**`, `atelier/app/build/[peekId]/publish/**`, `atelier/lib/stripe/**`

## Context

A draft Peek is free to build. To **publish** (move `peeks.status` from `draft` to `published` and mint the shareable URL) the curator pays $12 via Stripe. Live mode. The `STRIPE_PRICE_ID` already exists in env (`price_1TapZICEKPUsVee1ddG4n14M`). Stripe Adaptive Pricing is already on. Apple Pay / Google Pay / Link enabled by default in Payment Element.

Flow:
1. Curator hits the "publish" CTA in the build UI (packet 12). It calls `POST /api/checkout` with `{ peekId }`.
2. Server validates curator owns the peek, creates a Stripe Checkout Session in **mode: 'payment'** with the configured price, success URL `/build/[peekId]/publish?session_id={CHECKOUT_SESSION_ID}`, cancel URL back to `/build/[peekId]`, metadata `{ peek_id, curator_id }`.
3. Stripe checkout collects payment; Adaptive Pricing handles currency; Tax handles tax. (Tax requires a Stripe Tax registration — if not yet configured, the worker omits `automatic_tax: { enabled: true }` and notes it in NOTES.md for orchestrator follow-up.)
4. Stripe sends `checkout.session.completed` webhook to `/api/stripe/webhook`. Webhook verifies signature, finds peek via metadata, sets `peeks.status = 'published'`, `peeks.published_at = now()`, `peeks.stripe_checkout_session_id = session.id`, `peeks.stripe_payment_intent_id = session.payment_intent`, and `peeks.share_url = '${APP_URL}/g/${slug}'`. Writes an `events` row.
5. Curator is redirected to `/build/[peekId]/publish?session_id=...`. Page polls (or subscribes via Realtime to `peeks`) until status flips to `published`, then renders the share screen (handoff to packet 16).

`PAY_MODE=mock` env var (already wired in production) bypasses Stripe — when `mock`, the checkout endpoint returns a fake session URL that immediately marks the peek `published` server-side (no real charge). Useful for development. Production sets `PAY_MODE=live`.

## Inputs

None.

## Deliver

### `atelier/lib/stripe/client.ts`

```ts
import 'server-only';
import Stripe from 'stripe';
import { env } from '@/lib/env';

let _client: Stripe | null = null;

export function getStripe(): Stripe {
  if (_client) return _client;
  if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set');
  _client = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-05-28.basil' });
  return _client;
}

export const PAY_MODE = env.PAY_MODE ?? 'mock';
```

(Pin the apiVersion to whatever current Stripe major is at install time — the worker resolves to the latest stable. The string above is illustrative.)

### `atelier/app/api/checkout/route.ts`

POST handler. Validates input via Zod (`{ peekId: z.string().uuid() }`). Requires Clerk auth (call `requireUserId()` from `@/lib/auth/server`). Look up the peek; assert `curator_id === userId` (otherwise 403). Reject if already published.

If `PAY_MODE === 'mock'`: directly set `status = 'published'`, generate `share_url`, return `{ mock: true, redirect_url: '/build/[peekId]/publish?mock=1' }`.

If `PAY_MODE === 'live'`: create Stripe Checkout Session:

```ts
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card', 'link'],     // Apple Pay & Google Pay are auto via card
  line_items: [{ price: env.STRIPE_PRICE_ID!, quantity: 1 }],
  success_url: `${env.APP_URL}/build/${peekId}/publish?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${env.APP_URL}/build/${peekId}`,
  metadata: { peek_id: peekId, curator_id: userId },
  // automatic_tax: { enabled: true },   // enable when Stripe Tax registration is set up
});
return Response.json({ url: session.url });
```

### `atelier/app/api/stripe/webhook/route.ts`

POST handler with `runtime = 'nodejs'`. Reads raw body via `req.text()` (required for signature verification — do NOT use `req.json()`).

```ts
const sig = req.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(rawBody, sig!, env.STRIPE_WEBHOOK_SECRET!);
```

Handle `checkout.session.completed`: extract `peek_id` from metadata, update `peeks` row, write `events` row `kind: 'publish'`. Return 200 quickly (Stripe times out after a few seconds). Other event types: log + return 200.

If signature verification fails: 400.

### `atelier/app/build/[peekId]/publish/page.tsx`

Server component. Reads peek by id. If `status === 'published'`, render the share-ready screen (handed off to packet 16 — for now, render a minimal "published! share at {share_url}" with a copy-link button). If `status === 'draft'`, render a "processing payment…" placeholder that re-renders when Realtime fires (handle via a small client child component that subscribes to the peek row).

### `atelier/components/build/publish-cta.tsx`

`'use client'`. The button shown in the build UI when the chat tool `mark_ready_for_publish` has fired. Hits `POST /api/checkout`, redirects to the returned URL.

## Constraints

- TS strict. No `any`.
- Stripe webhook must verify signature before doing anything else.
- Service-role Supabase client for all writes (webhook is unauthenticated by Clerk).
- `STRIPE_PRICE_ID` is already wired in env; do NOT hardcode.
- `PAY_MODE` toggle is critical for dev/test — do not bypass it.
- Do not modify any file outside the target paths.
- No narrative comments. Log any to `_packets/COMMENTS.md`.

## Reply format

Branch `claude/packet-15-checkout`, commit `packet 15: checkout + publish gate`, push. NOTES.md for deviations (especially around Stripe Tax / Adaptive Pricing if API differs).

Worker briefing (always apply): workspace check, code only, ambiguities in NOTES.md, minimal reply.
