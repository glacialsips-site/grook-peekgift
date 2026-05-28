# Packet 15 — integration notes

## Stripe apiVersion

Installed `stripe@22.1.1`. `node_modules/stripe/cjs/apiVersion.d.ts` declares
`ApiVersion = "2026-04-22.dahlia"`. `LatestApiVersion` is the only type accepted
by the `Stripe` constructor's `apiVersion` option. Pinned to
`'2026-04-22.dahlia'` in `lib/stripe/client.ts`.

## automatic_tax

Skipped per packet prompt — Stripe Tax registration not yet set up. Stripe
Adaptive Pricing is already on at the account level, so currency localization
works without an `automatic_tax` block. Re-enable in
`app/api/checkout/route.ts` when tax registration lands.

## payment_method_types

Set to `['card', 'link']`. Apple Pay / Google Pay surface automatically through
the `card` rail in Stripe Checkout. No `excluded_payment_method_types` set.

## File placement deviation

Packet listed `atelier/components/build/publish-cta.tsx` as a deliverable, but
the orchestrator's per-worker instructions narrowed target paths to
`atelier/app/api/checkout/**`, `atelier/app/api/stripe/webhook/**`,
`atelier/app/build/[peekId]/publish/**`, `atelier/lib/stripe/**`. To stay
strictly within target paths the CTA is placed at
`app/build/[peekId]/publish/publish-cta.tsx`. Move to `components/build/` at
integration if the chat pane needs to import it; nothing references it yet.

## publish/page.tsx structure

Server component reads peek + ownership check, then renders the client child
`publish-status.tsx`, which subscribes to Realtime on the `peeks` row and
polls every 2.5s (60s timeout) as a fallback. When `status` flips to
`published`/`claimed`, renders the share-ready placeholder (copy-link button
+ link to `./share`) — packet 16 will replace `./share` with a real subroute,
which 404s standalone (expected).

## Share placeholder link

The "Share" button links to `./share` which packet 16 will fill in
(`atelier/app/build/[peekId]/publish/share/page.tsx`). Until then it 404s on
that subroute — orchestrator merges packet 16 to resolve.

## Webhook idempotency

Webhook short-circuits if peek is already `published`/`claimed` (returns 200,
no double-publish, no duplicate event row). Stripe retries on non-2xx are
safe.

## Tables / columns referenced

- `peeks`: id, slug, curator_id, status, share_url, published_at,
  stripe_checkout_session_id, stripe_payment_intent_id, updated_at
- `events`: user_id, peek_id, kind ('publish'), payload (jsonb)

All columns exist in `db/schema/peeks.ts` + `db/schema/events.ts` from
packet 02. No schema changes required.

## PAY_MODE mock path

Server-side: updates `peeks` row directly + writes `events` row with
`payload.mock = true`. Returns `{ mock: true, redirect_url: ... }`. Client
publish-cta does `router.push` on mock and `window.location.href` on live.

## Already-published guard

Both checkout route and webhook reject/early-return if `status` already in
`('published', 'claimed')`. 409 from POST /api/checkout; 200 from webhook
(idempotent).

## DB writes routed through Supabase service client

Used `getSupabaseService()` (schema-scoped to `peek_v2`) for all writes
rather than Drizzle, to match the existing pattern in
`app/api/webhooks/clerk/route.ts` and `app/build/[peekId]/page.tsx`. Webhook
endpoint is unauthenticated by Clerk, so service-role is required.
