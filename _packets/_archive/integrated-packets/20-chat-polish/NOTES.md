# Packet 20 — integration notes

## Migration chain fix (necessary side-effect)

The existing repo had `db/migrations/meta/0001_snapshot.json` and `0002_snapshot.json` with **identical `id` and `prevId`** values (0002 was a hand-rolled `schema_exposure` GRANT migration with no schema delta, so it inherited 0001's snapshot). This broke `drizzle-kit generate` with a collision error.

Fix applied: bumped `0002_snapshot.json`'s `id` to a fresh uuid (`ee4208ff-…`) and set its `prevId` to 0001's `id`, restoring the chain `0000 → 0001 → 0002 → 0003`. Snapshot content (the schema state) is unchanged. 0003 is the real new migration for `chat_messages`.

## Migration not auto-applied

`db/migrations/0003_normal_frank_castle.sql` ships in the diff but is **not applied to the live `peek_v2` DB** by this packet. Orchestrator must apply it via Supabase MCP after merge, the same way prior migrations were applied. Without it, `loadChatHistory` will throw at runtime (chat will still work — errors are caught and logged — but history won't persist).

## Persistence cadence

- User message is persisted before `chatTurn` starts (one row per turn).
- Each tool_result is persisted inside `onToolResult` (one row per tool call).
- Assistant messages are persisted after `chatTurn` resolves, by slicing the final returned history and inserting one row per **assistant turn** the agent produced this call (multi-iteration tool-use turns get multiple rows). This matches the agent loop's natural boundary; in practice it's almost always one assistant row per user turn unless the agent does tool_use → assistant text → tool_use → final.
- Persistence errors are caught & logged, never raised — so a DB outage doesn't break the stream.

## History hydration on subsequent turns

When the client sends `history: []` (e.g. after a hard refresh), the route now hydrates from `loadChatHistory` so the agent has full prior context. The client also receives `initialHistory` server-side via `BuildPeekPage` so the UI re-renders past turns immediately. We track `apiHistoryRef` in chat-pane so subsequent in-session sends ship the growing prior history (server still re-hydrates on its end if needed — defense in depth).

`tool_result` rows are filtered out of the API-history payload (the assistant's persisted content blocks already include `tool_use` references; the next agent iteration will produce fresh tool_result blocks).

## Image upload contract

- POST `/api/upload?peekId=<uuid>` with multipart `file=<File>`
- Server-side validates MIME (`image/jpeg|png|webp|gif|heic|heif`) and ≤8MB
- Stores at `chat-uploads/{peekId}/{uuid}.{ext}` in `peek-v2-assets` bucket
- Returns `{ url, path, contentType, sizeBytes }`
- The `events` row is `kind: 'upload'` with `{ path, contentType, sizeBytes }` payload
- Anonymous sessions are gated through `assertPeekAccess` — same access check as `/api/chat`. No turn cap on uploads themselves (per packet brief).

## Mobile preview sheet (UX choice)

Built from `framer-motion`'s `motion.aside` with three snap points (closed peek of 84px at the header, half ≈ 55% viewport, full ≈ 92% viewport). Tap the header to cycle through snaps; drag y to manually position. Respects `prefers-reduced-motion`. Desktop (`min-width: 768px`) renders `<PreviewPane>` inline as the right column — same component, no sheet wrapper.

No `vaul` dependency was added (per packet "do not modify package.json"). The DIY framer-motion sheet covers the same affordance.

## Publish-cta wiring

The chat pane renders `<PublishCta>` inline under any assistant bubble whose `toolCalls[]` includes a completed `mark_ready_for_publish`. The button label is `Send it — $12`. Clicking it follows the existing `/api/checkout` flow (mock or live). When `mark_ready_for_publish` fires on a re-hydrated history (after refresh), the CTA still appears because tool-use blocks are extracted from persisted assistant content with status `'done'`.

## `publish-cta.tsx` location

Moved from `app/build/[peekId]/publish/publish-cta.tsx` to `components/build/publish-cta.tsx`. The old file is deleted. Nothing else in the codebase imported it (verified via grep), so no other import paths needed updating.

## Files touched

- `atelier/db/schema/chat_history.ts` (new)
- `atelier/db/schema/index.ts` (added re-export)
- `atelier/db/migrations/0003_normal_frank_castle.sql` (new, drizzle-generated)
- `atelier/db/migrations/meta/0002_snapshot.json` (id/prevId fix only — no schema change)
- `atelier/db/migrations/meta/0003_snapshot.json` (new)
- `atelier/db/migrations/meta/_journal.json` (new entry)
- `atelier/lib/chat/persistence.ts` (new)
- `atelier/app/api/upload/route.ts` (new)
- `atelier/app/api/chat/route.ts` (modified — persistence + history hydration)
- `atelier/app/build/[peekId]/page.tsx` (modified — pass `initialHistory`)
- `atelier/components/build/build-surface.tsx` (modified — media-query layout)
- `atelier/components/build/chat-pane.tsx` (modified — file-picker + history hydration + publish-cta)
- `atelier/components/build/file-picker.tsx` (new)
- `atelier/components/build/preview-sheet.tsx` (new — framer-motion sheet)
- `atelier/components/build/publish-cta.tsx` (relocated)
- `atelier/components/build/index.ts` (new barrel)
- `atelier/components/use-media-query.ts` (new)

## Build status

`cd atelier && npm install && APP_URL=http://localhost:3000 npm run build` — green, all 17 routes compile (was 16 → added `/api/upload`).
