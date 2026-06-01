# Packet 13 — Schema fix (unblock anonymous draft flow + align Vibe type)

- **Worker:** cc-on-web | webchat-opus
- **Branch:** `claude/packet-13-schema-fix`
- **Depends on (sequencing):** `atelier-integration` (batch 2A merged)
- **Imports from siblings:** none
- **Validation:** `cd atelier && npm install && npm run build` (full build — no cross-packet imports introduced)
- **Target paths:** `atelier/db/schema/peeks.ts`, `atelier/db/migrations/**` (newly generated SQL file)

## Context

Three gaps in `db/schema/peeks.ts` (caught by packets 10, 11, 12 workers and noted in `STATE.md`) block the anonymous-curator flow and force ugly type casts. Fix in one migration so the trunk is internally consistent before more product packets land.

1. `peeks.curator_id` is `NOT NULL` → anonymous users can't create a draft. The chat API (packet 10) and build entry (packet 12) both want to write a Peek before Clerk sign-in. Make nullable.
2. `peeks.metadata` jsonb column doesn't exist, but packets 10 and 12 already use `metadata->>'anonymous_session_id'` to gate anonymous access. Add as `jsonb default '{}' not null`.
3. `peeks.vibe` is typed as `{ palette: string[], font_pairing: string }` in the Drizzle schema, but packet 05's `<PeekVibeProvider>`, packet 11's `set_vibe` / `update_vibe` tools, and packet 12's preview pane all use the richer shape `{ tone?, palette?: { bg, surface, ink, accent, accent2? }, mood_words?, motion?, font_pairing?: { display, body } }`. The DB jsonb is permissive at the SQL level — we just need the TS type to match reality.

This packet is a Drizzle schema edit + a generated migration. Migration runs at deploy via `db:migrate` (not in this packet — just commit the SQL).

## Deliver

### `atelier/db/schema/peeks.ts`

Apply three changes:

1. Drop `.notNull()` from `curatorId`:
   ```ts
   curatorId: text('curator_id').references(() => users.clerkUserId),
   ```

2. Replace the `Vibe` type with the richer shape (export from this file so other modules can import a single source of truth):
   ```ts
   export type Vibe = {
     tone?: string;
     palette?: {
       bg: string;
       surface: string;
       ink: string;
       accent: string;
       accent2?: string;
     };
     mood_words?: string[];
     motion?: 'still' | 'soft' | 'lively';
     font_pairing?: { display: string; body: string };
   };
   ```

3. Add the `metadata` column right after `shareUrl`:
   ```ts
   metadata: jsonb('metadata')
     .$type<Record<string, unknown>>()
     .notNull()
     .default(sql`'{}'::jsonb`),
   ```

Leave everything else unchanged — indexes, defaults, timestamps stay.

### Migration generation

Run `npx drizzle-kit generate` from `atelier/`. It will produce a new SQL file in `atelier/db/migrations/` (auto-named, sequential). The migration must:

- `ALTER TABLE peek_v2.peeks ALTER COLUMN curator_id DROP NOT NULL`
- `ALTER TABLE peek_v2.peeks ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb`
- (No SQL change for the Vibe type — jsonb is permissive; the TS edit is the entire fix.)

Commit BOTH the schema file AND the new migration SQL. Do NOT run `db:migrate` (orchestrator applies via Supabase MCP at integration time).

### Type-cast cleanup (optional, leave for follow-up if it expands scope)

Packet 11 has an `as unknown as Vibe` cast in `set_vibe.ts` / `update_vibe.ts` to bridge the type mismatch. After this packet lands those casts can be deleted — but doing so means editing files in packet 11's territory. **Skip the cleanup in this packet.** Note the locations in NOTES.md and a follow-up packet will remove them.

## Constraints

- Do not modify any file outside `atelier/db/schema/peeks.ts` and `atelier/db/migrations/`.
- Do not run migrations against the live Supabase project.
- TS strict; no `any`.
- The generated migration must be reviewable — if `drizzle-kit generate` produces extra noise (e.g. recreating unrelated indexes), capture it in NOTES.md and trim by hand.
- No narrative comments. Log any to `_packets/COMMENTS.md`.

## Reply format

Branch `claude/packet-13-schema-fix`, commit `packet 13: schema fix (nullable curator + metadata + Vibe type)`, push. NOTES.md if any deviation or unexpected migration content.

Worker briefing (always apply): workspace check (`pwd` in `.claude/worktrees/agent-*/`), code only, ambiguities in NOTES.md, minimal reply.
