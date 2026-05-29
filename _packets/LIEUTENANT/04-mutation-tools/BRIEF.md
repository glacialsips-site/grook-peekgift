# BRIEF 04 — Curator-Sonnet mutation tools (production)

**Source of need:** the spine-thread shipped 5 mutation tools as a thin proof; the canonical curator-Sonnet needs **22 tools** across 7 categories per `_packets/LIEUTENANT/_research/curator-tools/REPORT.md`. This brief implements them edge-safe, with dispatch wrapper, mutation log, and error contract.

**Read first (must):**
1. `_packets/LIEUTENANT/_research/curator-tools/REPORT.md` — the canonical spec (22 tools, card model, mutation log shape, error contract, anti-tools). Your blueprint.
2. `_packets/SPINE/STACK-LOCK.md` — Edge runtime constraints (≤200 items/tool_result; flush headers).
3. `_packets/LIEUTENANT/01-spine-thread/RETURN.md` — what the spine implemented + the inline-edge-supabase pattern + pitfall #1 (Node libs aren't edge-safe).
4. `atelier/app/api/spine/chat/route.ts` — the working edge pattern with 5 tools to extend.
5. `atelier/components/renderer/page-state.ts` — the shape the tools mutate.
6. `atelier/lib/vibe/grammar/engine.ts` — where `validatePageComposition` + `generateAndRepair` live (DO NOT duplicate; tools call these via dispatch).
7. **If BRIEF 03 (edge-plumbing) has merged before you start:** use `lib/anthropic-edge` + `lib/db-edge` instead of inline. If not, follow the spine route's inline pattern; the orchestrator refactors later.

## DELIVERABLES

### 1. Tool handlers (22, organized)

Under `atelier/lib/curator-tools/` (or your preferred path; coordinate with future edge-plumbing landing). One file per category (`meta.ts`, `vibe.ts`, `hero.ts`, `sections.ts`, `cards.ts`, `lifecycle.ts`, `inquiry.ts`) + an `index.ts` barrel. Each handler is async, edge-safe, returns the `ToolResult<T>` envelope from the spec.

Group must implement all 22 spec'd tools. The spine ships with 12 (per spec §9) — make sure the implementations are present even if the BASE_PROMPT only registers 12; the rest hide behind `defer_loading: true` and load on demand.

### 2. Dispatch wrapper

Under `atelier/lib/curator-tools/dispatch.ts`. Responsibilities:
- Single `dispatchTool({ peekId, turnId, toolName, input })` entry point.
- Routes to handler.
- Wraps every successful mutation in a `MutationLogEntry` (verb, subject, summary, changed_ids, inverse, costs) and writes to `peek_mutation_log` (see deliverable 4 — coordinate; if BRIEF 08 hasn't landed yet, fallback to `events` table with `kind='mutation'` and stash the log entry in `payload`).
- Generates summaries from input/output (spec §6 — keep handlers small; dispatch generates).
- Cap tool_result payloads to ≤200 items / ≤24KB JSON (spec §0.4, edge constraint).
- On failure, append the `[NOTE TO PEEK: ...]` meta-reminder per spec §7.

### 3. Schema additions

`atelier/db/migrations/0015_curator_tools.sql` + Drizzle schema updates:
- `peeks.recipient_hard_cap_cents int null`
- `peeks.recipient_soft_cap_cents int null`
- `peeks.cap_rationale text null`
- (Optional, only if you also build the mutation log here vs BRIEF 08) `peek_mutation_log` table with the shape in spec §6.

RLS policies preserved/extended for the new columns. Verify by running migration locally.

### 4. Tests

Under `atelier/tests/unit/curator-tools/` (one file per category) + an integration test in `atelier/tests/integration/`. Required coverage:
- Every tool's happy path returns the correct envelope shape.
- Every tool's failure path returns the correct `ErrorCode`.
- Idempotency: `set_*` called twice produces same state.
- `add_card_variants` parallelizes scrapes (mock the scrape pipeline; assert concurrent calls).
- Dispatch wrapper generates correct `MutationLogEntry.summary` for ≥5 representative verbs.
- Card kind → DB type mapping per spec §2.
- E1 `mark_ready_to_publish` happy path + every `preconditions_failed` variant.

### 5. Refactor the spine route

`atelier/app/api/spine/chat/route.ts` currently inlines 5 tools. Refactor to import from `lib/curator-tools/` (just the spine 12 — A1, A3, B1, B2, C1, D1, D2, D3, D4, D6, E1, F1). The spine continues to function exactly as it did; the route shrinks dramatically.

## HARD RULES

- **Edge-safe.** No `node:` imports anywhere in the tools or dispatch slice. If BRIEF 03 has landed, use `lib/anthropic-edge` + `lib/db-edge`; otherwise mirror the spine route's inline-supabase pattern. Tests should pass without postgres TCP.
- **Bracketed env access** — `process.env['X']`, never `process.env.X` (strict-mode flag).
- **Tools never validate grammar invariants.** Let `validatePageComposition` + `generateAndRepair` (engine.ts) do that on render. Tools mutate freely. (Spec §0.5.)
- **Tools never echo full page-state.** Tiny envelopes only. F1 `get_page_summary` is the inquiry tool; it returns a SUMMARY not the full state.
- **No conversational tools.** Spec §8 anti-tools list is sacred — do NOT add them.
- **`defer_loading: true`** on heavy schemas: D2 add_card, D3 add_card_variants, C2 generate_hero_image, B6 regenerate_vibe, D5 set_card_rules.
- **Branch:** `lt/mutation-tools` off `claude/bold-ride-Li5zK`. Push your branch. Do not merge.

## VERIFICATION (run + report real results)

- `npm --prefix atelier run typecheck` — 0 errors.
- `npm --prefix atelier run test` — all existing 212+ tests + your new ones pass.
- `APP_URL=https://vnext.peek.gift npm --prefix atelier run build` — clean; spine chat route still in `.next/server/middleware-manifest.json` under `functions` (edge).
- Migration applied locally (or via `mcp__supabase__apply_migration` if MCP available) without error.

## RETURN.md

Sections required: what you built (file inventory); verification (typecheck/test/build with exit codes; migration outcome); the **kind→DB type mapping** you implemented (per spec §2; flag if you chose to widen the enum vs keep mapping); how you handled mutation log vs `events` fallback (if BRIEF 08 hadn't landed); integration pitfalls; what you stubbed; bright ideas. Honesty section if anything untested.

Per PROTOCOL.md: push `lt/mutation-tools`, write RETURN.md, tell Frank "done — `lt/mutation-tools` pushed, RETURN.md written." Orchestrator reviews + merges.
