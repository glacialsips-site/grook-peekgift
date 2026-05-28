# Packet 12 — integration notes

## Naming

- All TS types use **camelCase** (matches Drizzle `$inferSelect` and existing
  `Peek`, `Card`, `VariantGroup` types in `db/schema/*`).
- Drizzle/Supabase rows come back **snake_case**; conversion lives in two
  spots:
  - `lib/peek/realtime.ts` (`rowToPeek` / `rowToCard` / `rowToVariantGroup`)
    for realtime payloads.
  - `app/build/[peekId]/page.tsx` (`toPeek` / `toCard` / `toVariantGroup`)
    for the initial server-side load.
- A shared mapper would live in `lib/peek/mappers.ts` but creating one would
  drift out of packet scope (`db/schema/*`-adjacent). Recommend a follow-up
  packet that collapses the two copies once we have more callers.

## SSE parsing

- Manual `parseSseStream` in `chat-pane.tsx` — `EventSource` doesn't support
  POST + JSON body, so I went with `fetch` + `response.body.getReader()` per
  the packet contract. Frames are split on `\n\n`, each frame parses
  `event:` + (multi-line) `data:` per W3C SSE.
- The SSE event union mirrors `app/api/chat/schema.ts` from packet 10
  (`text` / `tool_call` / `tool_result` / `turn_end` / `error`). Defined in
  `lib/peek/types.ts` so the UI doesn't import packet-10 server code.

## Anonymous flow — DEVIATION

The packet says `/build/page.tsx` creates a row with `curator_id = null` and
`metadata.anonymous_session_id`. The current schema
(`db/schema/peeks.ts` + migration `0000_next_kylun.sql`) has:

```
curator_id text NOT NULL REFERENCES users(clerk_user_id)
```

So `INSERT … (curator_id) VALUES (NULL)` will violate NOT NULL.

Resolution for packet 12 (scope-safe):
- `/build` redirects to `/sign-in?returnTo=/build` if no Clerk session.
- `/build/[peekId]` still tolerates either ownership shape: signed-in curator
  OR null-curator + `metadata.anonymous_session_id`. So the moment the
  schema is relaxed (drop NOT NULL, add `metadata.anonymous_session_id`
  jsonb field) the existing loader / preview / chat path will just work.
- `chat-pane.tsx` still ships the anonymous session id in the POST body and
  handles the 401 + `signup_required` redirect — packet 10's contract.

Suggested follow-up packet (schema-fix):
1. `ALTER TABLE peek_v2.peeks ALTER COLUMN curator_id DROP NOT NULL;`
2. Update `db/schema/peeks.ts` to make `curatorId` nullable.
3. Update `db/schema/cards.ts` similarly if cards need anonymous adds.
4. Then remove the sign-in gate in `/build/page.tsx`.

## Vibe type bridge

`@/lib/peek/types#Vibe.palette` is an **object**
(`{ bg, surface, ink, accent, accent2? }`) — matches what
`@/components/peek-vibe-provider#Vibe.palette` expects. This intentionally
differs from `db/schema/peeks.ts#Vibe` whose draft type listed
`palette?: string[]`. The provider's shape wins because that's what the
runtime CSS variables expect; tools that write the vibe should write the
object form. Document this in packet 11's `set_vibe` / `update_vibe`.

`preview-pane.tsx#toProviderVibe` substitutes a default palette
(matches `globals.css :root` defaults) when the draft vibe is empty so the
hero gradient + card chrome render correctly from turn 0.

## UI affordances cut / deferred

- **File upload is a stub.** The image-picker pre-fills the textarea with
  `[attached image: <name>] (upload coming soon)` so Claude sees the intent.
  Real upload + vision content blocks need `/api/upload` (future packet).
- **No conversation persistence.** Chat history lives in component state
  only — refresh clears it. The Peek doc itself (cards/vibe/note) is the
  source of truth, so a refresh still shows the actual progress in the
  preview pane. A future packet can persist turn history per peek.
- **Mobile toggle is binary** (chat / preview pill at bottom). Spec
  suggested a slide-up sheet for the preview — kept it simpler so both
  panes render full-height when active, no nested scroll containers to
  reason about.
- **Tool-call pill text** uses a heuristic `humanizeToolName` (snake_case →
  Title Case, with verb fixups for `set_*` → "Setting…"). Good enough for
  the existing packet-11 tool registry; revisit if tool names change.

## Validation

- `npm install` clean (784 packages, 9 moderate audit warnings — typical).
- `npm run typecheck` clean.
- `npm run build` succeeds end-to-end with stubbed env vars. Both `/build`
  and `/build/[peekId]` register as dynamic routes.
- Next 16 still prints the `middleware → proxy` deprecation warning — out
  of scope here, covered by packet 07.

## Files touched

```
atelier/lib/peek/types.ts
atelier/lib/peek/realtime.ts
atelier/components/build/chat-pane.tsx
atelier/components/build/preview-pane.tsx
atelier/components/build/build-surface.tsx
atelier/app/build/page.tsx
atelier/app/build/[peekId]/page.tsx
```

No edits outside `atelier/lib/peek/**`, `atelier/components/build/**`,
`atelier/app/build/**`.
