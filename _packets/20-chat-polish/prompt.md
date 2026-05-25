# Packet 20 — Chat polish (image upload + chat history persistence + mobile slide-up preview + publish-cta wiring)

- **Worker:** cc-on-web
- **Branch:** `claude/packet-20-chat-polish`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** `@/components/ui/*`, `@/lib/supabase/service`, `@/lib/supabase/storage`, `@/lib/auth/server`, `@/lib/peek/types`, `@/lib/chat/sse-types`, `db/schema/*`
- **Validation:** `cd atelier && npm install && npm run build` then hit `https://peek-gift-vnext.netlify.app/build` after merge to smoke-test
- **Target paths:** `atelier/app/api/upload/**`, `atelier/components/build/**` (including relocating publish-cta), `atelier/app/build/[peekId]/page.tsx` (modify), `atelier/db/schema/chat_history.ts` (new), `atelier/db/migrations/**` (generated)

## Context

Three things were cut from packet 12 for scope; this packet ships them. They're what turns the current "chat works in dev" into "users can actually use this." Plus the `mark_ready_for_publish` tool's output wires into a real publish button.

1. **Image upload** — curator drops a photo into the chat, it gets persisted to Supabase Storage (`peek-v2-assets` bucket), Claude sees it as a vision-input content block and can call `set_hero_image` with the resulting public URL.
2. **Chat history persistence** — currently chat history lives only in React state; refresh = lose conversation. Persist to a new `chat_messages` table keyed on `peek_id`, hydrate on mount so users can reload mid-build.
3. **Mobile slide-up preview** — current layout shows a binary chat/preview toggle pill on mobile. Replace with a slide-up sheet (Radix Dialog with `vaul`-like drag affordance built from Framer Motion) so users see the preview building live without losing context.
4. **Publish CTA wiring** — when Claude calls `mark_ready_for_publish` (already implemented in packet 11), the chat pane shows a "Send it" button that opens `/build/[peekId]/publish`. Relocate `publish-cta.tsx` from `app/build/[peekId]/publish/` to `components/build/` so the chat pane can import it.

## Inputs

None — operating against existing types in `lib/peek/types.ts` + the SSE event union in `lib/chat/sse-types.ts`.

## Deliver

### `atelier/db/schema/chat_history.ts` (new)

```ts
import { sql } from 'drizzle-orm';
import { index, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';
import { peeks } from './peeks';

export const chatMessages = peekV2.table(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    peekId: uuid('peek_id').notNull().references(() => peeks.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant', 'tool_result'] }).notNull(),
    content: jsonb('content').$type<unknown>().notNull(),         // Anthropic.MessageParam['content'] OR a tool_result block
    tool_call_id: text('tool_call_id'),                            // present for tool_result rows
    created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('chat_messages_peek_id_idx').on(t.peekId),
    index('chat_messages_created_at_idx').on(t.createdAt),
  ],
);

export type ChatMessage = typeof chatMessages.$inferSelect;
```

Add `chatMessages` re-export to `db/schema/index.ts`. Run `npx drizzle-kit generate` and commit the new SQL.

### `atelier/app/api/upload/route.ts` (new)

POST handler. Accepts `multipart/form-data` with field `file`. Validates: image MIME type, ≤8MB (matches `next.config.mjs` server-action body limit), curator owns the `peekId` query param (or has an anonymous-session match).

Uploads via `@/lib/supabase/storage` `uploadAsset()` to path `chat-uploads/{peekId}/{uuid}.{ext}`. Returns `{ url, path, contentType, sizeBytes }`. Writes an `events` row `kind: 'upload'`.

```ts
import { NextRequest } from 'next/server';
import { uploadAsset } from '@/lib/supabase/storage';
import { getUserId } from '@/lib/auth/server';
import { getSupabaseService } from '@/lib/supabase/service';
import { recordEvent } from '@/lib/chat/session';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

export async function POST(req: NextRequest) {
  const peekId = req.nextUrl.searchParams.get('peekId');
  if (!peekId) return Response.json({ error: 'peekId required' }, { status: 400 });

  const userId = await getUserId();
  // access check: curator owns peek OR anon sessionId matches metadata.anonymous_session_id
  // ... (mirror the assertPeekAccess pattern from lib/chat/session.ts)

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return Response.json({ error: 'file field required' }, { status: 400 });
  if (file.size > MAX_SIZE) return Response.json({ error: 'too_large' }, { status: 413 });
  if (!ALLOWED.includes(file.type)) return Response.json({ error: 'unsupported_type', type: file.type }, { status: 415 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.type.split('/')[1] ?? 'bin';
  const path = `chat-uploads/${peekId}/${crypto.randomUUID()}.${ext}`;

  const result = await uploadAsset({ path, data: buf, contentType: file.type });
  await recordEvent({ peekId, userId, sessionId: req.cookies.get('peek-anon-session')?.value ?? '', kind: 'upload', payload: { path: result.path, contentType: file.type, sizeBytes: file.size } });

  return Response.json({ url: result.publicUrl, path: result.path, contentType: file.type, sizeBytes: file.size });
}
```

### `atelier/lib/chat/persistence.ts` (new)

Server helpers for chat history. Wraps Drizzle.

```ts
import 'server-only';
import { db } from '@/db/client';
import { chatMessages, type ChatMessage } from '@/db/schema/chat_history';
import { asc, eq } from 'drizzle-orm';

export async function loadChatHistory(peekId: string): Promise<ChatMessage[]> {
  return db.select().from(chatMessages).where(eq(chatMessages.peekId, peekId)).orderBy(asc(chatMessages.createdAt));
}

export async function appendChatMessage(input: {
  peekId: string;
  role: 'user' | 'assistant' | 'tool_result';
  content: unknown;
  toolCallId?: string;
}): Promise<void> {
  await db.insert(chatMessages).values({
    peekId: input.peekId,
    role: input.role,
    content: input.content,
    tool_call_id: input.toolCallId ?? null,
  });
}
```

### `atelier/app/api/chat/route.ts` (modify)

After each turn finishes (in the SSE generator), persist:
- The user's message (`appendChatMessage({ peekId, role: 'user', content: userMessage })`)
- The assistant's response (after final loop iteration; serialize the final assistant message content)
- Each tool_use call → tool_result (one row per, with toolCallId)

Hydrate `history` from DB if the client doesn't send it: if `history` array is empty AND there are persisted messages, load them and pass to `chatTurn`.

### `atelier/components/build/file-picker.tsx` (new)

`'use client'`. A button that opens the system file picker, uploads via `POST /api/upload?peekId=<id>`, returns a `{ url, contentType }` promise. Used by `chat-pane.tsx`. Has loading + error states.

### `atelier/components/build/chat-pane.tsx` (modify)

- Add a paperclip icon button next to the send button. Clicking opens `<FilePicker />` flow. On upload success, append to the next user message as a content block:
  ```ts
  userMessage = [
    { type: 'image', source: { type: 'url', url } },
    { type: 'text', text: messageText },
  ];
  ```
- When `tool_call` SSE event has `name === 'mark_ready_for_publish'`, render the `<PublishCta peekId={peekId} />` button inline as the last assistant content. Imported from new path `@/components/build/publish-cta`.
- Hydrate chat history from server-side prop on mount (passed in from page.tsx).

### `atelier/components/build/publish-cta.tsx` (MOVED — was at `app/build/[peekId]/publish/publish-cta.tsx`)

Same component, moved to `components/build/publish-cta.tsx`. Update the export path. Delete the original at the old path.

### `atelier/components/build/preview-sheet.tsx` (new — mobile slide-up)

`'use client'`. Wraps `<PreviewPane>` in a draggable bottom sheet built from `framer-motion`'s `motion.div` with `drag="y"` constrained to `[0, viewportHeight]`. Three snap points: closed (peeking at the top sliver), half-open (50% height), fully open. Tap the header strip to toggle; drag to manually position; respects `prefers-reduced-motion`. Uses `<ScrollArea>` for the content.

On desktop (≥md breakpoint via Tailwind v4 `@media` query, or feature-detect at mount), render `<PreviewPane>` inline as the right column instead of as a sheet. Decision lives in `<BuildSurface>`.

### `atelier/components/build/build-surface.tsx` (modify)

Use a media-query hook (`useMediaQuery('(min-width: 768px)')` — vanilla in `components/use-media-query.ts` if you want) to pick layout:
- Desktop: 40% chat / 60% preview side-by-side (existing).
- Mobile: chat full-screen, `<PreviewSheet>` overlay.

Remove the previous binary chat/preview toggle pill.

### `atelier/app/build/[peekId]/page.tsx` (modify)

Load chat history server-side via `loadChatHistory(peekId)`, pass to `<BuildSurface initialDraft={...} initialHistory={...} peekId={...} />`.

### `atelier/components/build/index.ts` (new barrel)

Re-export `BuildSurface`, `ChatPane`, `PreviewPane`, `PreviewSheet`, `FilePicker`, `PublishCta`.

## Constraints

- TS strict. No `any` (cast through `unknown` if SDK types are loose).
- Mobile-first: every layout starts from small viewport and progressively enhances.
- Image-upload route validates server-side (size + MIME); never trust client.
- Anonymous metering still applies to chat turns even when an image is attached — image upload itself has no metering for now (low abuse risk + nice UX).
- Do not modify `package.json`, `lib/env.ts`, anything outside the target paths.
- No narrative comments. Log any necessary ones in `_packets/COMMENTS.md`.

## Reply format

Branch `claude/packet-20-chat-polish`, commit `packet 20: chat polish — image upload + history + mobile sheet + publish cta`, push. NOTES.md if deviations.

Worker briefing (always apply): workspace check (`pwd` in `.claude/worktrees/agent-*/`), code only, ambiguities in NOTES.md, minimal reply.
