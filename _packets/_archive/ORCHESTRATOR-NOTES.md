# Orchestrator notes — batch 4 dispatch critical review

_Started 2026-05-26 by cloud worker (cc-on-web, claude-opus-4-7[1m], 1M context, full MCP suite)._
_Reading hand-off from desktop CC session that drafted batch 4 (packets 28-35) and ran low on context._

This file persists my critical assessment of batch 4 across context resets. If you're a future session resuming work, read this BEFORE acting on RUN-NEXT.md.

## State at hand-off

- Trunk: `atelier-integration` @ `9566223` ("batch 4 drafted: packets 28-35").
- Batch 4 is 8 packets, RUN-NEXT.md says dispatch all in parallel.
- I have Netlify, Supabase, Stripe, Clerk, GitHub MCP access. Sentry / PostHog / Gmail / Twilio MCPs not loaded but not blocking for this batch.

## Critical issues found before dispatch (DO NOT DISPATCH BLINDLY)

### 1. RLS disabled on every peek_v2 table — IMMEDIATE SECURITY FINDING

Supabase advisor (priority=1, level=critical):

> 11 table(s) have Row Level Security (RLS) disabled: peek_v2.users, peek_v2.peeks, peek_v2.cards, peek_v2.variant_groups, peek_v2.picks, peek_v2.peek_collaborators, peek_v2.relationships, peek_v2.events, peek_v2.affiliate_revenue, peek_v2.chat_messages, peek_v2.webhook_log.

`peek_v2_enable_rls_default_deny` (migration 20260525040957) was wiped by the subsequent `drop_legacy_peek_v2_schema` (20260525192545) → `peek_v2_init_from_drizzle` (20260525192647) reinit cycle. Drizzle migration didn't include `ENABLE ROW LEVEL SECURITY` per-table.

**Exposure:** the `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is embedded in every browser bundle. Any visitor can hit `https://ewqpujqerdnrkjqlpobo.supabase.co/rest/v1/peek_v2/peeks` directly and SELECT/INSERT/UPDATE/DELETE without auth. Most app reads/writes are routed through `/api/*` server routes using the service-role key, so the typical user flow doesn't expose this — but the back door is wide open right now.

Packet 31 (security) mentions service-role over-privilege but does NOT explicitly require re-enabling RLS. **Fix path:** either add an RLS step to packet 31's scope OR apply the RLS-enable migration immediately before dispatch.

Action taken: pending user decision. Recommended: apply a focused `0005_enable_rls_and_default_deny` migration immediately (it's idempotent — `ENABLE ROW LEVEL SECURITY` + no policies = locked by default; service-role bypasses RLS so server routes keep working). Then packet 31 adds the per-table policies for whichever client-side reads are intended (probably none — all client traffic goes through `/api/*`).

### 2. Packet 30 (type-safety) — Supabase MCP type-gen is `public`-schema only

`mcp__Supabase__generate_typescript_types` returned ONLY the legacy `public` schema (drafts/gifts/gift_items/recipient_events/recipient_selections/webhook_events — peek.gift Vite app tables, irrelevant to atelier).

The CLI command `npx supabase gen types --schema peek_v2` accepts `--schema` but needs `SUPABASE_ACCESS_TOKEN` env var. Workers in cc-on-web isolated worktrees don't have user PATs.

The Drizzle schema (`atelier/db/schema/*.ts`) IS the canonical source — Drizzle was selected as "DB schema" in STATE.md locked decisions. Packet 30 already notes: "Where Drizzle is used, `typeof table.$inferSelect` and `$inferInsert` are the source of truth. Use them."

**Recommendation:** rewrite packet 30 to declare Drizzle as the type source for the whole codebase, not just "where Drizzle is used." The Supabase JS client gets a derived Database type built from the Drizzle table types (a thin adapter in `lib/supabase/database.types.ts`).

Pre-dispatch action: I can build this adapter myself and commit it before dispatching 30, OR add the explicit instruction to packet 30's prompt so the worker does it.

### 3. Packets 32 and 35 reference deps that aren't installed

- **Packet 32 assumes vitest is in devDeps.** `grep -c "vitest" atelier/package.json` returns 0. Worker's `npm run test` will fail to even start.
- **Packet 32 needs:** `vitest`, `@vitest/coverage-v8`, `@next/eslint-plugin-next`, `typescript-eslint`, `eslint` (for the eslint flat config). None present.
- **Packet 35 suggests `colorthief` for real palette extraction.** Also not installed.

Workers can't add deps unilaterally per build principles. **Needs a deps-bump packet landed before 32 and 35 dispatch**, or I add them to package.json on atelier-integration as orchestrator before dispatch.

### 4. Cross-packet file overlap (not a blocker, but flagged)

Multiple batch-4 packets touch the same files:

- `app/api/chat/route.ts`: packet 31 (rate-limit + IP key), packet 33 (logger + retry on Anthropic), packet 34 (per-turn observability)
- `components/build/share-sheet.tsx`: packet 34 (client share events), packet 35 (a11y pass)
- `lib/anthropic/observability.ts`: packet 33 (logger), packet 34 (per-turn aggregation)
- `instrumentation-client.ts`: packet 34 (Sentry), packet 35 (potentially viewport/theme)
- `proxy.ts`: packet 28 (sso-callback public), packet 31 (CSP headers), packet 34 (/monitoring tunnel)
- `lib/env.ts`: packet 31 (require GUEST_CLAIM_TOKEN_SECRET), packet 34 (Sentry env)

These will need three-way merges at integration. Mechanical but real — budget orchestrator time for it.

### 5. Packet 28 (custom auth UI) — pre-condition not verified

RUN-NEXT.md says "Clerk `peek-gift-vnext.netlify.app` is an authorized origin in Clerk Dashboard. User is fixing this manually." Not yet verified. If not set, the custom forms render but `useSignIn().signIn.create(...)` will throw `clerk: domain not allowed`.

Action: I can verify via Clerk MCP snippet OR ask the user to confirm.

### 6. Packet 33 (reliability) — logger from packet 33 used by packet 31

Packet 31's webhook idempotency + rate-limit fallback warnings say "log warn". If packet 33's logger doesn't land first, packet 31 falls back to `console.warn` and a future logger migration needs to clean up. Acceptable — both packets are read-after-merge anyway.

### 7. Packet 34 — Sentry needs `SENTRY_AUTH_TOKEN` on Netlify or build warns

`withSentryConfig` with `silent: !CI` is OK in dev; in CI the build will print Sentry source-map upload warnings but won't fail. Acceptable for a no-DSN deploy. **Confirm:** does the user already have Sentry org/project provisioned? If not, packet 34 still ships but Sentry is no-op until env vars land.

## Recommended modified dispatch plan

**Option A — strict (recommended):** Pause batch 4. Land a focused prep commit first:
- (a) Apply `0005_enable_rls_default_deny` migration to live DB + Drizzle migrations
- (b) Add devDeps: vitest, @vitest/coverage-v8, eslint, @next/eslint-plugin-next, typescript-eslint, colorthief
- (c) Build Drizzle-sourced Database type adapter at `lib/supabase/database.types.ts`
- (d) Tighten packet 30 + 31 prompts inline to reflect (a) + (c)
- (e) Then dispatch all 8 in parallel

Estimated prep time: 30-60 min of orchestrator work via MCP + edits. Saves multiple hours of worker rework + bad merges.

**Option B — fast:** Dispatch as-is. Workers on 30/32/35 surface "can't proceed without deps/types" in NOTES.md. Orchestrator handles RLS separately. Higher risk of partial/wasted worker output but parallelism preserved.

**Option C — split:** Dispatch the 5 packets that don't have prep issues now (28, 29, 31, 33, 34) and hold 30, 32, 35 for after prep. Trade-off: still need to handle 31's RLS scope expansion.

User asked me to "execute RUN-NEXT" — that's Option B by default. I'm flagging A as the better-engineered path before acting on B.

## My broader read on the situation

The user just smoked out a bunch of shortcuts from the prior orchestrator (per his message). Batch 4 IS the response to those shortcuts — every packet is a "fix the shortcut" packet. **The risk now is shipping batch 4 with new shortcuts of its own** (assuming deps that don't exist, MCP tools that don't do what the prompt claims, security regressions like RLS being off and nobody noticing).

Going back to the user with these findings IS the work. Speaking up IS the value.

## Open items for next session (or me, continuing)

- [ ] Confirm Clerk allowed-origin status (`peek-gift-vnext.netlify.app`).
- [ ] Decide RLS fix scope: immediate migration vs packet 31 expansion.
- [ ] Build deps-bump (vitest + plugins + colorthief).
- [ ] Build Drizzle-sourced Database adapter or accept packet 30 falls back to it.
- [ ] Verify Netlify has `GUEST_CLAIM_TOKEN_SECRET` ≥ 32 chars before packet 31 merges.
- [ ] Verify Sentry org/project provisioned or accept no-op DSN.
- [ ] Check Upstash URL/TOKEN on Netlify or accept rate-limit graceful degrade.

## Communication channel with desktop chat (orchestrator companion)

User mentioned spinning up a new desktop CC session to act as my worker. To pass context without burning chat budget:
- I write packets + decisions to `_packets/`.
- Desktop session reads the file as its first step on startup.
- Returns via push to branches; I integrate via MCP + commit on `atelier-integration`.
- Cross-session continuity lives in this file + STATE.md + RUN-NEXT.md.
