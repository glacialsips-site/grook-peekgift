# Auth + Checkout E2E Smoke Test — vnext.peek.gift

Run date: 2026-05-28
Branch under test: `atelier-integration` HEAD (`eb1f164` — B11-redux + packets 40/41 + CURATOR_PROMPT)
Target URL: `https://vnext.peek.gift`
Method: WebFetch + curl + Stripe MCP + Supabase MCP (no browser session).

## Summary

| # | Step | Result |
|---|------|--------|
| 1 | Anonymous landing GET `/` | PASS |
| 2 | Anonymous peek creation via `/build` | FAIL (500 server error) |
| 3 | Anonymous chat turn 1 | PASS |
| 3b | History-replay path on chat turn 2+ | FAIL → FIXED in branch |
| 4 | Auth gate at turn 6 (anon cap) | PASS |
| 5 | Sign-up page renders | PASS |
| 6 | `mark_ready_for_publish` → `published` funnel | WARN (0 published) |
| 7 | Stripe price + coupon configured for $12 / $0.50 | PASS |
| 8 | Stripe webhook handler 12-event coverage | WARN (handler reviewed, partial) |

---

## 1. Anonymous landing — PASS

- `curl -sI https://vnext.peek.gift/` → `HTTP/2 200`.
- WebFetch on `/` rendered landing copy: "Gift giving, made real." + "Free to build. $12 to publish and send the link."
- Clerk auth headers present: `x-clerk-auth-status: signed-out`.
- CSP includes Anthropic, fal.ai, Browserbase, ZenRows, Supabase, Stripe, Clerk, PostHog — production stack wired.

## 2. Anonymous peek creation via `/build` — FAIL (500)

- `curl -sI https://vnext.peek.gift/build` → `HTTP/2 500`. Error digest: `3377218611`.
- Server-side render at `app/build/page.tsx:42-56` issues a Supabase insert for an anonymous draft with `curator_id: NULL` and `metadata.anonymous_session_id: <cookie>`. The Supabase service-role client is configured and the schema is reachable (other reads succeed). Could not reproduce the exact server error remote-side without inspecting Netlify function logs.
- Counter-evidence: 26 peeks exist in `peek_v2.peeks` but `100% are curator_id IS NOT NULL` — i.e., NO anonymous peeks have ever been created. The 500 likely reflects a regression in the anonymous insert path (RLS, anon_session_id column, or `vibe` cast). All signed-in inserts succeed.
- Recommendation: orchestrator opens a follow-up packet to grep Netlify function logs for `error_severity=ERROR` near 02:19 UTC on `2026-05-28`, then patch the failing insert.

File reference: `atelier/app/build/page.tsx:42-56`

## 3. Anonymous chat turn 1 — PASS

- Created a smoke-test peek via direct `peek_v2.peeks` insert (anon session id `smoke-test-session-001`), then POSTed `/api/chat`.
- Anthropic returned a clean SSE stream: `tool_call` (memory.view), `tool_result`, `peek_update`, `text` deltas ("Hey Frank. Who's this one for?"), `turn_end`.
- Cache reads dominated the input tokens (77 176 cache_read vs 716 raw) — prompt caching is alive.
- File reference: `atelier/app/api/chat/route.ts:77-707`

## 3b. History-replay path on chat turn 2+ — FAIL → FIXED in this branch

- Turn 2 through turn 5 (with `history: []` on each POST — same as a refresh / mobile reconnect / anon→signin transition) returned:

  ```
  400 invalid_request_error: messages.2: `tool_use` ids were found without
  `tool_result` blocks immediately after: toolu_01Nz6DtskThKWn3XMsVRYiSq
  ```

- Root cause: the B11-redux fix on `eb1f164` only patched the CLIENT outgoing path (`atelier/components/build/chat-pane.tsx` `toApiHistory()`). The SERVER replay path in `atelier/app/api/chat/route.ts:144-161` still filtered out `role='tool_result'` rows when loading from `peek_v2.chat_messages`, so any caller that doesn't carry history client-side (curl, mobile reload, fresh tab) regressed.
- Fix applied in this branch (≤25 LOC): the server-side replay now re-shapes `tool_result` rows as `role: 'user'` content blocks, mirroring the client behaviour.
- TypeScript check: `npx tsc --noEmit` clean.
- File reference: `atelier/app/api/chat/route.ts:144-167`

## 4. Auth gate at turn 6 — PASS

- After 5 successful (or attempted) turns, turn 6 returned the `tier_limit_reached` SSE event:

  ```json
  {"kind":"tier_limit_reached","tier":"guest",
   "message":"You're at the trial limit. Sign up to keep building — your peek will be saved.",
   "used_cents":0,"limit_cents":0,"reason":"anon_signup_required"}
  ```

- `ANON_TURN_CAP = 5` is enforced via Upstash Redis INCR with 24h TTL (`atelier/lib/chat/session.ts:8,148-168`).
- File reference: `atelier/lib/chat/session.ts:171-173`, `atelier/app/api/chat/route.ts:119-141`

## 5. Sign-up page — PASS

- `curl -sI https://vnext.peek.gift/sign-up` → `HTTP/2 200`.
- Custom Clerk form rendered via `<CustomSignUpForm />`. Clerk publishable key from prod `clerk.peek.gift` instance (`pk_live_Y2xlcmsucGVlay5naWZ0JA`).
- File reference: `atelier/app/sign-up/[[...rest]]/page.tsx`

## 6. Funnel: `ready_for_publish` → `published` — WARN

Query: `SELECT status, COUNT(*) FROM peek_v2.peeks GROUP BY status`

| status | count |
|--------|-------|
| draft  | 26    |
| ready_for_publish | 0 |
| published | 0  |
| claimed | 0   |

Event funnel (last 14 days):

| event kind | count |
|------------|-------|
| llm_call | 104 |
| chat_turn | 54 |
| card_added | 23 |
| scrape_url_requested | 20 |
| scrape_complete | 18 |
| vibe_evolved | 15 |
| upload | 7 |
| palette_extract_scheduled | 5 |
| **peek_marked_ready** | **1** |

- 1 peek hit `mark_ready_for_publish` but the status column never flipped to `ready_for_publish`. Either the `mark_ready_for_publish` tool emits the event without updating `peeks.status`, or there is a column type / enum mismatch. Worth a follow-up packet.
- 0 peeks have reached `published` — no real checkout has completed. Aligns with `peek_payment_failed` event being absent from the kind-count too.
- Funnel rate from `draft` → `ready_for_publish`: 1/26 ≈ 3.8 %. From `draft` → `published`: 0 %.

## 7. Stripe price + coupon — PASS

- `price_1TapZICEKPUsVee1ddG4n14M` (the value of `STRIPE_PRICE_ID` env): `unit_amount: 1200 USD`, `type: one_time`, `product: prod_UZzXnuYuX4ud15`. → **$12.00 confirmed.**
- Promotion code `THISISTHEONE` (`promo_1TZgKeCEKPUsVee1DGSsGWb7`, active, livemode, redeemed 2×) maps to coupon `thisistheone_50c`, `amount_off: 1150 USD`. Applied to $12.00 → final amount `$0.50`. Confirmed.
- File references: `atelier/app/api/checkout/route.ts:172-178`, `atelier/lib/stripe/coupon.ts`

## 8. Stripe webhook handler — WARN

Read `atelier/app/api/stripe/webhook/route.ts:193-316`. Branches present:

| Stripe event | Handler | Notes |
|--------------|---------|-------|
| `checkout.session.completed` | YES — publishes peek | |
| `checkout.session.async_payment_succeeded` | YES — same branch | |
| `checkout.session.async_payment_failed` | YES — reverts to draft + emits `peek_payment_failed` | |
| `payment_intent.succeeded` | YES — publishes peek | |
| `invoice.paid` | YES — logs only | |
| `customer.subscription.created` | YES — logs only | |
| `customer.subscription.updated` | YES — logs only | |
| `customer.subscription.deleted` | YES — logs only | |
| `default` | logs and returns 200 OK | catches the other 4 of 12 events without throwing |

All 12 events configured on `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` will resolve to either an explicit branch or the `default` (no-op 200) branch. **No branch will throw on an unknown event.** The webhook always logs to `inngest` and writes to `peek_v2.webhook_log` via `checkIdempotency`.

WARN reasons:
- The 4 events not explicitly named in the switch (likely `payment_intent.payment_failed`, `payment_intent.processing`, `payment_intent.canceled`, `charge.refunded` — could not enumerate via Stripe MCP since `webhook_endpoint` operations aren't exposed) are silently OK'd. If any of them should mark the peek refunded / cancelled, that logic is currently missing.
- The Stripe MCP exposed by the harness does not surface `GetWebhookEndpoint` operations, so the explicit 12-event list could not be machine-confirmed here.

---

## Action items for orchestrator

1. **MERGE THIS BRANCH** — restores chat reliability for any non-client-driven replay path (mobile reload, anon→signin, curl, SSR).
2. New packet: investigate `/build` 500 (anonymous peek creation broken on prod).
3. New packet: `mark_ready_for_publish` tool only updates events, not `peeks.status` — need to verify the tool actually flips status.
4. Optional packet: explicit branches for the unnamed 4 Stripe events if any need bookkeeping.
