# RETURN 08 — Mutation log schema

Branch: `lt/mutation-log-schema` (off `claude/bold-ride-Li5zK`). Pushed.

## What I built

A complete, edge-safe mutation-log subsystem — the `peek_mutation_log` table that
BRIEF 04 (mutation tools) writes through and BRIEF 06 (depth-layer UI) reads from.

**Schema + migration**
- `atelier/db/schema/peek-mutation-log.ts` — `peekMutationLog` in house style
  (`peekV2.table(...)`, array index return). String-literal column types
  (`verb`/`subject_kind`/`chip_color`/`inverse`) imported from the lib so schema
  and helpers share one source of truth.
- `atelier/db/migrations/0015_peek_mutation_log.sql` — raw SQL matching the
  hand-authored 0007–0014 style: table + FK (`ON DELETE cascade`) + the two
  indices + RLS (`ENABLE` + `FORCE`) + default-deny + service-role append-only +
  `NOTIFY pgrst`. Journal entry idx 15 appended. **No snapshot file** — 0007–0014
  have none either; the `postgres-js` migrator reads `_journal.json` + the `.sql`,
  and snapshots only feed `drizzle-kit generate` (which this repo does not use for
  hand-authored migrations).
- Exported from `atelier/db/schema/index.ts`.

**Helpers — `atelier/lib/mutation-log/`** (all edge-safe; zero `node:` imports)
- `types.ts` — the 21-verb `MutationVerb` union, `SubjectKind`, `ChipColor`,
  `MutationLogEntry`, and `VERB_META` (verb → `{subjectKind, chipColor}`, a
  `Record<MutationVerb,…>` so the compiler rejects a missing verb).
- `ulid.ts` — dependency-free **monotonic ULID** on `globalThis.crypto`
  (the only entropy primitive guaranteed on Netlify Edge / Deno). Sorts
  lexicographically by emit time. Plus `ulidAt(time)` (non-monotonic, exact time)
  for backfill/replay and deterministic tests.
- `wire.ts` — pure `entryToRow`/`rowToEntry` (camel↔snake). The round-trippable
  core; tested for all 21 verbs with zero DB.
- `summary.ts` — `summarize(verb, subject, toolInput, toolOutput)` → the
  diff-mark sentence (spec §6 voice: `Peek added "Wool Throw" to The Drop`).
  Per-verb, defensive (degrades to a true generic line instead of throwing).
- `inverse.ts` — `inverseOf(verb, toolInput, toolOutput)` → undo descriptor or
  `null`. Covers all reversible verbs; `null` for the payment-crossing case.
- `write.ts` — `buildMutationLogEntry(params)` (assembles + derives
  summary/inverse/chip/subjectKind/id/emittedAt), `writeMutationLog(entry)`
  (service-role insert via `lib/db-edge`), and `recordMutation(params)` (build +
  write, returns the entry so dispatch can SSE it). **This is the BRIEF 04 entry point.**
- `read.ts` — `readMutationLogForPeek(peekId, {limit?, since?})` →
  chronological `MutationLogEntry[]`. **This is the BRIEF 06 entry point.**
- `index.ts` — barrel.

**Tests** — `atelier/tests/unit/mutation-log.test.ts`, 19 cases:
ULID (length/charset/monotonicity/sortability/`decodeTime` round-trip), verb-meta
coverage (exactly 21, `get_page_summary` excluded), summaries (spec example +
10 representative + all-21 non-empty), inverses (all 21 reversible + the precise
restore shapes + payment-crossing null + missing-metadata null), wire round-trip
for all 21, and write/read through a faithful in-memory fake of the Supabase edge
client (persist+read-back all 21, table targeting, chronological order, `since`
cursor, `limit`, peek-id scoping).

## Final migration number: 0015

Latest committed migration is `0014`. BRIEF 04 (`_packets/LIEUTENANT/04-mutation-tools/`)
has only a BRIEF.md — no RETURN.md, nothing past 0014 — so per the brief's
tiebreaker ("if this ships first, claim 0015") I claimed **0015**.

**Fallback for the orchestrator:** if BRIEF 04 lands first or simultaneously and
also claims 0015, renumber THIS to 0016 — rename the file `0015_→0016_peek_mutation_log.sql`
and change journal entry idx 15's `tag` to `0016_peek_mutation_log` (bump `when`
above 0014's curator-tools migration). Nothing else references the number.

## Verification (all run, all green)

- `npm --prefix atelier run typecheck` → **0 errors**.
- `npm --prefix atelier run test` → **413 passed (32 files)**, including the 19 new.
- `npm --prefix atelier run build` → **clean (exit 0)**. ⚠️ The build REQUIRES
  `APP_URL` set to a valid URL (e.g. `APP_URL=http://localhost:3000`) — otherwise
  `lib/env.ts` (a pre-existing Zod env gate) throws during page-data collection on
  an unrelated route. This is the repo's standard build-env requirement, not a
  consequence of this change; with `APP_URL` set it is fully clean.
- **Migration applied to a fresh local DB** — replayed `0000 → 0015` on a
  throwaway **PostgreSQL 16** cluster (live DB is 17.6; this migration uses only
  core features, so 16 is a faithful proxy). Applied via `psql -f` per file (the
  `--> statement-breakpoint` markers are inert `--` comments) — this is the same
  raw-SQL path Supabase MCP `apply_migration` uses. Verified on the live DB:
  - 18 columns with the exact types/nullability of the schema;
  - 3 indexes (pkey + `peek_emitted_idx` + `turn_idx`);
  - FK `confdeltype = 'c'` (cascade);
  - RLS `relrowsecurity = t`, `relforcerowsecurity = t`;
  - grant matrix: `service_role` SELECT+INSERT only (UPDATE/DELETE = false),
    `anon`/`authenticated` = false on everything;
  - functional: `service_role` insert+select works; its UPDATE and DELETE both
    raise *permission denied* (append-only); `authenticated` SELECT raises
    *permission denied*; deleting the parent peek cascade-wipes the log to 0
    (cascade runs as table owner and is RI-exempt from the grant revoke + RLS).

  Replaying the chain on vanilla PG first required creating the Supabase-managed
  objects that pre-exist on the real project: roles `anon`, `authenticated`,
  `service_role` (BYPASSRLS), `authenticator`, and an empty `supabase_realtime`
  publication (for 0010). On the real DB these already exist; nothing in 0015
  depends on them beyond `service_role`/`anon`/`authenticated`.

## Integration notes — BRIEF 04 (the dispatch wrapper)

On each **successful** tool call, call one of:
```ts
const entry = await recordMutation({
  peekId, turnId, verb,            // verb: MutationVerb (NOT get_page_summary)
  subjectId,                       // card/group id; omit for singletons
  subjectTitleSnapshot,            // card/group title now; survives renames
  toolInput, toolOutput,
  changedIds,                      // node ids the renderer should chip
  scrapeCostCents, imageGenCostCents, llmInputTokens, llmOutputTokens,
});
// entry is the full row; stream it to the client as a diff-mark.
```
`subjectKind`, `chipColor`, `summary`, `inverse`, `id` (ulid), `emittedAt` are all
**derived** — don't pass them. Use `buildMutationLogEntry` + `writeMutationLog`
separately only if you need the entry before persisting.

**LOAD-BEARING CONTRACT — `inverse` depends on it.** For undoable verbs the tool
handler must put prior state on `toolOutput.before` and created ids on
`toolOutput`. Exact shapes are in the `inverse.ts` header; the essentials:
- `update_card` → `before = { ...patched fields' prior values }`
- `remove_card` → `before = { card: <full prior Card> }`
- `reorder_cards` → `before = { card_ids: <prior order> }`
- `set_recipient` / `set_spend_caps` → `before = { ...prior fields }`
- `set_recipient_profile` → `before = { profile: <FULL prior profile> }`
- `set_note` → `before = { note_md: <prior | null> }`
- **all 6 vibe verbs** → `before = { vibe: <FULL prior Vibe doc> }` (not just the
  patched dimension — see subtleties)
- `set_hero_image` / `generate_hero_image` → `before = { image_url, source }` (prior, may be null)
- `set_publish_meta` → `before = { slug, expires_at }` (prior)
- creates expose ids: `id`/`card_id` (one), `card_ids: string[]` (batch), `id`/`group_id` (group)

If `before`/ids are missing the entry still writes fine — `inverse` is just `null`
(undo unavailable), so this degrades safe, but you lose undo for that mutation.

`get_page_summary` (F1) is read-only — do **not** log it.

## Integration notes — BRIEF 06 (depth-layer UI / undo)

`readMutationLogForPeek(peekId, { limit?, since? })` → `MutationLogEntry[]`,
chronological (oldest→newest). `since` = a ULID cursor (returns entries strictly
after it — for poll/resume). `limit` default 200, hard-capped 500.

**SECURITY:** the reader uses the service-role client and does **not** authorize.
Call it only from an authenticated server action that has already confirmed the
caller owns the peek (scope by `curator_id`). There is intentionally no
curator-facing RLS read policy.

**Undo applier** must understand the `inverse.verb` vocabulary:
- curator tools reused as-is: `remove_card`, `add_card`, `update_card`,
  `set_card_rules`, `reorder_cards`, `set_recipient`, `set_recipient_profile`,
  `set_note`, `set_spend_caps`, `set_hero_image`, `set_publish_meta`,
  `mark_ready_to_publish`;
- **undo-only primitives (NOT curator tools)**: `remove_card_group`, `set_vibe`
  (full-doc vibe restore) — if your applier is a `switch` over `MutationVerb`,
  add these two extra cases;
- input flags: `_replace: true` (profile — replace, don't merge),
  `_status_reset: 'draft'` (ready→draft).

Applying an inverse should itself emit a new forward log entry (spec §4 — undo is
a real decision, not a non-event). Diff-mark chip color = `entry.chipColor`
(`add|edit|remove|reorder|vibe`); highlight `entry.changedIds`.

## Subtleties on `inverse` (the "sneakily not-undoable")

1. **Vibe verbs → full-vibe restore.** All six invert to `set_vibe {vibe: prior}`.
   This is correct ONLY if the handler captured the entire prior `Vibe` doc, not
   just the dimension it touched. A handler that records only the changed
   dimension would make undo wipe the others. Documented; flagged here loudly.
2. **`set_recipient_profile` merges additively.** Its inverse carries
   `_replace: true` so the applier must REPLACE the profile with the prior
   snapshot, not merge it (a merge would leave the added items in place).
3. **State-undoable but cost-sunk.** `generate_hero_image` (fal spend) and
   `add_card` with a scrape (scrape spend) revert STATE cleanly but the cost is
   already incurred and stays recorded in `*_cost_cents`. Undo reverts state only
   — there is no API refund. Correct, but know it.
4. **Payment boundary.** `mark_ready_to_publish` pre-payment → status reset to
   draft (undoable). Once the peek is published/paid (`toolOutput.next_step ===
   'already_published'` / `status === 'published'` / `paid === true`) → `inverse
   = null`; refunds are human-in-loop dashboard actions (spec §4). NOTE: there are
   no `payment_*` verbs (spec §0.8/§8 forbid payment tools), so the only
   payment-crossing log entry IS a published `mark_ready_to_publish`. Mapping the
   brief's "payment_*-crossing" test to that is the only sensible reading.

## Honesty — what's stubbed / skipped / imperfect

- **21 verbs, not 22.** The brief says "all 22 verbs," but spec §6's `MutationVerb`
  enum is 21 — the 22nd tool, `get_page_summary` (F1), is read-only inquiry and
  produces no log entry, so it is correctly excluded. I implemented all 21
  mutation verbs. Calling this out so nobody thinks a verb went missing.
- **write/read tested against a fake, not live Supabase.** The test env has no real
  Supabase (the suite sets `test.supabase.co`), so write/read are exercised through
  a faithful in-memory fake of the schema-scoped client (JSON-clones in/out to mimic
  the jsonb round-trip). The row mapping itself is also tested purely
  (`entryToRow`/`rowToEntry`) for all 21 verbs. The DB-side correctness is covered
  by the real PG16 replay above.
- **PG16 replay, live DB is 17.6.** Only core features used, so this is faithful,
  but it is not the exact engine.
- **Pre-existing, out-of-scope bug found:** `npm run db:migrate` (`tsx
  db/migrate.ts`) fails in this container — `db/migrate.ts` uses top-level `await`
  and tsx transforms it to CJS (no `"type":"module"`), which can't do top-level
  await. Not my code and not how migrations reach the live DB (Supabase MCP runs
  raw SQL), so I verified via `psql` instead. Orchestrator may want to fix
  `migrate.ts` (rename to `.mts`, or force ESM) if local `db:migrate` is meant to work.
- **No curator-facing read RLS policy** — deliberate (brief §2). Reads go through an
  authed server action, not RLS. If you later want recipient/curator direct reads,
  that's a new policy.

## Bright ideas

- The `scrape_cost_cents` / `image_gen_cost_cents` / `llm_*_tokens` columns make
  this table a **per-mutation cost ledger** for free. Join to `peeks.status` and
  you get cost-per-peek and cost-per-conversion by cohort (the §1.6 meter metrics)
  with no extra table.
- `turn_id` is indexed → a "what did Peek do this turn" query is cheap; emit all
  entries sharing a `turn_id` as one SSE diff-mark batch.
- `ulidAt(time)` is in the public API specifically so we can backfill historical
  log entries (e.g. reconstruct from `chat_history`/`events`) at their true
  timestamps if we ever want to seed the diff-mark pane for pre-existing peeks.
