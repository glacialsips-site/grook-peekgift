# Packet 24 — integration notes

## Known conflict with packet 22 (scrape_url real implementation)

Both this packet and packet 22 modify `atelier/lib/anthropic/tools/scrape_url.ts`. At dispatch time the file on `atelier-integration` is a stub that logs the request and returns `{ ok: false, error: 'scrape_pending_implementation' }`.

This packet's edits to scrape_url.ts:

- Add import of `wrapAffiliateLink` + `buildClickCustomId` from `@/lib/affiliate/wrap`.
- Call `wrapAffiliateLink(parsed.url, buildClickCustomId(ctx.peekId))` before the events insert and log the wrapped URL into the event payload.
- Extend the `Output` type with optional `affiliate_url` + `affiliate_network` so packet 22 can populate them once the real scrape lands.
- Update the tool description to mention the affiliate-wrapped URL is returned alongside scraped fields.

Integration guidance for the orchestrator after both packets land:

1. Take packet 22's real scrape body.
2. Inject the `wrapAffiliateLink(parsed.url, buildClickCustomId(ctx.peekId))` call after a successful scrape.
3. On success, include `affiliate_url: wrapped.wrappedUrl, affiliate_network: wrapped.network` in the returned object so Claude can pass them through to `add_card`.
4. Keep the `events` insert (either packet's variant) — the affiliate fields should land in `payload` so observability includes the wrapped URL.

No other files in packet 24 collide with packet 22.

## Click-tracking customId encoding

- `wrapAffiliateLink(url, customId)` is the public surface; `buildClickCustomId(peekId, cardId?)` builds the string.
- `add_card`: the affiliate wrap happens BEFORE the card row insert, so the customId only carries `peekId` at that point. After insert we re-wrap with `peekId:cardId` and `UPDATE` the row if the wrapped URL actually changed. This avoids needing a separate "issue card id" call but does an extra round-trip when affiliate wrapping is active (no-op when no network configured).
- `scrape_url`: only `peekId` is in scope (cards don't exist yet), so just that.
- Webhook resolves `peekId:cardId` back to a pick by selecting the most recent pick on that card. Skimlinks doesn't pass per-pick state — this is best-effort attribution.

## Webhook signature header name

Skimlinks doesn't publicly document the precise webhook signature header. Packet prompt named it `x-skimlinks-signature` with HMAC-SHA256(body, secret) → hex; route uses that. If Skimlinks's actual implementation differs (e.g., `x-skimlinks-hmac`, base64-encoded, or a different signing payload like `{timestamp}.{body}`), this is a one-line fix in the route handler.

## proxy.ts public routes

Already covers `/api/webhooks/(.*)` (added in packet 18 deploy fix), so the new `/api/webhooks/skimlinks` route inherits public access automatically — no proxy.ts edit needed.

## Commission percent storage

`cards.commissionPct` is a `numeric(5,2)` Drizzle column. Drizzle's `numeric()` type emits strings on read and accepts strings on write. We pass `wrapped.commissionPctEstimate.toString()` so the value persists cleanly without TS friction.

## Validation

`cd atelier && npm install && APP_URL=http://localhost:3000 npm run typecheck` — see commit.
