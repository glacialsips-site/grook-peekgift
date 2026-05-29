# BRIEF 16 — Meter implementation (extends `lib/usage`)

**Source of need:** Frank's operating principle is "all valves wide open at launch, throttle from cost-per-conversion data per cohort." The concierge research sub produced a spec at `_packets/LIEUTENANT/_research/meter-spec/` (lost to worktree churn but the design is preserved here). This brief implements it.

**Read first:**
1. `_packets/SPINE/STACK-LOCK.md` — meter row.
2. `_packets/MEMORY.md` §0 rule 8 ("Never set arbitrary caps without real usage data") + the meter design implications.
3. `atelier/lib/usage/*` — existing partial impl (read for context; extend, don't replace).
4. `atelier/db/schema/` — for `usage_ledger` + `tier_config` existing tables (per MEMORY §1.10).

## DELIVERABLES

### 1. Schema additions

`atelier/db/migrations/0017_meter_throttle.sql` (or next available number):

- `usage_ledger` (extend existing — add nullable columns; old rows stay null):
  - `tier text null` — snapshot of curator's tier at event time.
  - `capability text null` — which gate (`chat_turn`, `image_gen`, `scrape`, `web_read`, `publish`, `voice_min`, `email_send`).
  - `session_type text null` — `'guest' | 'authenticated' | 'paying' | 'returning'`.
- `conversion_events` (new) — funnel milestones:
  - `id text primary key` — ulid.
  - `clerk_user_id text` / `anon_session_id text` — one of.
  - `peek_id uuid references peeks(id) on delete cascade`.
  - `event_type text not null` — 8 milestones: `landing_visit`, `guest_started`, `chat_turn1`, `peek_ready_for_publish`, `publish_modal_opened`, `payment_attempted`, `payment_succeeded`, `recipient_picked_first_card`.
  - `count int not null default 1` — re-hit increments.
  - `first_at timestamptz not null default now()`.
  - `last_at timestamptz not null default now()`.
  - `metadata jsonb`.
  - UNIQUE `(clerk_user_id, event_type, peek_id) WITH NULLS NOT DISTINCT` (or split anon_session unique separately if Postgres version lacks NULLS NOT DISTINCT).
- `cohort_overrides` (new) — the throttle-from-data lever:
  - `id text primary key`.
  - `predicate jsonb not null` — `{ tier?, signup_before?, signup_after?, user_ids? }`.
  - `limit_patch jsonb not null` — partial `TierLimitV2` overlay.
  - `priority int not null default 100`.
  - `active boolean not null default true`.
  - `expires_at timestamptz`.
  - `created_at timestamptz default now()`.
  - `created_by text`.
  - `rationale text`.
- Read-only views:
  - `v_cost_per_conversion` — joins `usage_ledger` (cost) with `conversion_events` (paid), grouped by cohort.
  - `v_unconverted_burn` — sum cost for users who never hit `payment_succeeded`.
  - `v_margin_by_tier` — `payment_succeeded` revenue minus `usage_ledger` cost, by tier.
- RLS: default-deny on all new tables (service-role only).

### 2. Code

`atelier/lib/meter/`:
- `tiers.ts` — `TierLimitV2` type extending `TierLimit` with `caps: Partial<Record<CapabilityKey, CapLimit>>`. `DEFAULT_CONFIG_V2` with `max_count: -1` (wide open) for every capability at every tier.
- `entitlements.ts` — `canDo(db, redis, { userId, anonSessionId, capability })` returning `{ allowed: true } | { allowed: false, reason, retry_after_ms? }`. Tier resolution → cohort override merge → dollar ceiling (existing path) AND count gate (Upstash INCR with EXPIREAT) → optimistic decrement on overshoot.
- `cohort-resolver.ts` — given a curator, returns the merged `TierLimitV2` after applying `cohort_overrides` (priority order, first-match-wins).
- `conversion.ts` — `recordConversionFireAndForget({ userId/anon, peekId, eventType, metadata? })` via the PG function `record_conversion_event()`. Never throws (fire-and-forget).
- `cost.ts` — `recordCost({ userId/anon, capability, costCents, tier, sessionType })` writes to `usage_ledger`. Wraps the existing function from `lib/usage/`; preserves the existing dollar-ceiling check.

### 3. Wire into the chat route + tool handlers

Every entry-point gates through `canDo()`:
- Chat turn (`/api/chat` POST) → `canDo({ capability: 'chat_turn' })`. If denied: SSE event `{ type: 'denied', reason, retry_after_ms }`.
- `generate_hero_image` / image-gen tools → `canDo({ capability: 'image_gen' })`.
- Scrape calls inside `add_card` → `canDo({ capability: 'scrape' })`.
- Publish action → `canDo({ capability: 'publish' })`.

Every cost-incurring action records cost via `recordCost()` post-success (so denials don't get logged as costs).

Every funnel milestone records via `recordConversionFireAndForget()`.

### 4. Admin endpoint

`atelier/app/api/admin/cohort-override/route.ts` (Node, auth-gated by admin Clerk user id) — POST creates/updates a `cohort_overrides` row. Admin Frank can tighten a specific cohort's valves without a deploy.

### 5. Tests

- `canDo` allows when wide open; denies when count exceeded; denies when dollar ceiling exceeded.
- Cohort override tightens only the matching cohort (priority resolution test).
- `recordConversionFireAndForget` is idempotent on `(user, event_type, peek_id)`.
- `v_cost_per_conversion` query returns sensible results on fixture data.

## HARD RULES

- **DEFAULT_CONFIG_V2 = all max_count: -1 (wide open) at launch.** Frank's directive.
- **Throttle = DB upsert.** No code deploys to dial a valve.
- **Edge-safe** for the `canDo` path called from the chat loop. Use `lib/db-edge` (BRIEF 03) + Upstash REST.
- **Upstash unkeyed → fall-OPEN** (existing pattern; count gate skips silently, dollar ceiling still enforced via Postgres).
- **Branch:** `lt/meter-implementation` off `claude/bold-ride-Li5zK`. Push.

## VERIFICATION

- typecheck/test/build green.
- Migration applies cleanly.
- `v_cost_per_conversion` query runs against fixture data.

## RETURN.md

Sections: schema migration number; all gated entry points; cohort-override admin endpoint (Frank-verifiable); example `cohort_overrides` row that would tighten guest tier; example queries Frank can run for cost-per-conversion analysis. Honesty section.

Per PROTOCOL.md: push `lt/meter-implementation`, write RETURN.md.
