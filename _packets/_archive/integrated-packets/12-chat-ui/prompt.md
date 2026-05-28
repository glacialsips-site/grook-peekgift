# Packet 12 — Chat UI shell + live preview pane (mobile-first)

- **Worker:** cc-on-web | webchat-opus
- **Branch:** `claude/packet-12-chat-ui`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** `@/components/ui/*`, `@/components/peek-vibe-provider`, `@/lib/supabase/browser`, `@/lib/utils`
- **Validation:** `cd atelier && npm install && npm run typecheck` (cross-packet imports)
- **Target paths:** `atelier/app/build/page.tsx`, `atelier/app/build/[peekId]/page.tsx`, `atelier/components/build/**`

## Context

The build experience: mobile-first chat surface on the left (or top), live Peek preview on the right (or below). The Peek preview is a pure renderer that reads the current `Peek` document from Supabase Realtime + initial server load. As the user chats, the chat route (packet 10) streams Claude's response — text deltas render in the chat, and tool calls mutate the DB, which propagates to the preview via Realtime.

Two surfaces:
- `/build` — starts a new draft Peek. Anonymous-friendly: creates a row in `peeks` with `curator_id = null` and `metadata.anonymous_session_id = <sessionId>`, redirects to `/build/[peekId]`.
- `/build/[peekId]` — the actual builder. Loads the Peek + cards + variant_groups, renders the split view. Subscribes to Realtime for live updates from tool calls.

**Progressive UX principle**: NO forms. NO "fill these 5 fields." The chat is the only input. Every Peek field is hydrated via Claude's tool calls. The preview animates in cards and theme as they arrive. The user gives signal continuously and the page builds continuously.

## Deliver

### `atelier/lib/peek/types.ts`

Front-end facing types for the Peek doc (mirror of DB rows but with camelCase fields where it helps; or keep snake_case to match DB — worker chooses, just be consistent and document in NOTES.md).

Shape:
- `Peek` (id, slug, recipientName, relationship, occasion, vibe (with palette / motion / etc), heroImageUrl, noteMd, status, updatedAt)
- `Card` (id, peekId, variantGroupId, position, type, title, description, imageUrl, valueCents, revealValue, isTaunt, tauntText, isLocked, unlockRule, proposedDate, locationHint, addedByUserId)
- `VariantGroup` (id, peekId, title, selection, position)
- `PeekDraft` = { peek, cards, variantGroups }

### `atelier/lib/peek/realtime.ts`

Hook + helper for Realtime subscription:

```ts
'use client';
import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { PeekDraft } from './types';

export function usePeekDraft(peekId: string, initial: PeekDraft): PeekDraft {
  const [draft, setDraft] = useState(initial);
  useEffect(() => {
    const sb = getSupabaseBrowser();
    const channel = sb.channel(`peek:${peekId}`)
      .on('postgres_changes', { event: '*', schema: 'peek_v2', table: 'peeks', filter: `id=eq.${peekId}` }, ...)
      .on('postgres_changes', { event: '*', schema: 'peek_v2', table: 'cards', filter: `peek_id=eq.${peekId}` }, ...)
      .on('postgres_changes', { event: '*', schema: 'peek_v2', table: 'variant_groups', filter: `peek_id=eq.${peekId}` }, ...)
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [peekId]);
  return draft;
}
```

Worker fleshes out: on `INSERT` push to `cards[]`; on `UPDATE` patch by id; on `DELETE` filter out. Re-sort cards by `position`.

### `atelier/components/build/chat-pane.tsx`

`'use client'`. The chat surface.

- Scrollable conversation area (uses `<ScrollArea>` from `@/components/ui`).
- Each message: avatar + bubble. User messages right-aligned; assistant left.
- Streaming: when an assistant turn is in progress, render a "typing" cursor; append text deltas in real time.
- Tool calls render as a small inline pill: "Peek added the vintage tee" with the tool name humanized. The pill is muted-color, smaller font.
- Bottom: a textarea (auto-resize) + send button. Enter to send, Shift+Enter for newline.
- Below the input: file-upload affordance (image upload — calls `/api/upload` in a future packet; for now, stub a file-picker that doesn't actually upload, with a NOTE).
- On send: appends user message to local `history`, POSTs to `/api/chat` with `{ peekId, sessionId, history, userMessage }`, opens an `EventSource`-like SSE reader using `fetch` + `response.body.getReader()`, dispatches incoming SSE events to update the streaming assistant message + tool-call pills + finalize on `turn_end`.
- On 401 with `signup_required`: redirect to `/sign-in?returnTo=/build/[peekId]`.
- `sessionId`: `localStorage.getItem('peek-anon-session') || crypto.randomUUID()` (persist).

### `atelier/components/build/preview-pane.tsx`

`'use client'`. The live Peek preview.

- Wraps content in `<PeekVibeProvider vibe={draft.peek.vibe ?? defaultVibe}>` from packet 05.
- Hero section: `peek.heroImageUrl` as background. If empty, a placeholder gradient that pulses gently (Framer Motion).
- Recipient header: `peek.recipientName ?? "your person"` in display font.
- Occasion / relationship line: small muted text.
- Personal note: rendered via `react-markdown` + `remark-gfm`.
- Cards: rendered in `peek.position` order; group cards by `variantGroupId` (variant groups render as a labeled box with their title + selection rule). Each card animates in on mount (Framer Motion stagger). Card UI shows image + title + description; value only if `revealValue`. Locked cards render with a "🔒 ask first" overlay using the `unlockRule.beg_prompt` as label. Taunt cards render with `tauntText` overlaid in a fun font.
- Empty states for every section: "let's pick a recipient first" / "no cards yet" — but tucked tastefully into the preview, not as full-page messaging.

### `atelier/app/build/page.tsx`

Server component. Creates a new draft peek (via Supabase service client) for the current user (or anonymous session from a cookie), redirects to `/build/[peekId]`.

- Read or create a `peek-anon-session` cookie if user is anonymous.
- Insert `peeks` row with `curator_id = userId` (or null), `metadata = { anonymous_session_id }` if anon, `status = 'draft'`. Generate a slug (e.g. `nanoid(10)`).
- `redirect(/build/${newPeekId})`.

### `atelier/app/build/[peekId]/page.tsx`

Server component. Loads the peek + cards + variant_groups. Renders `<BuildSurface initialDraft={...} peekId={...} />` (a client component that contains both panes).

### `atelier/components/build/build-surface.tsx`

`'use client'`. The layout shell.

- Mobile: stacked — chat on top, preview slides up from bottom on tap of a "preview" toggle button. Or default: 60% chat / 40% preview (collapsible).
- Desktop: side-by-side, 40% chat / 60% preview, both scrollable.
- Holds the `usePeekDraft(peekId, initialDraft)` hook and passes the draft to `<PreviewPane>`.
- Holds the conversation state and passes to `<ChatPane>`.

## Constraints

- TS strict. Use the `cn()` helper from `@/lib/utils` for class composition.
- All client components properly marked `'use client'`.
- No narrative comments. Log any to `_packets/COMMENTS.md`.
- Do not touch `lib/anthropic/*`, `lib/supabase/*`, `db/schema/*`, `app/api/*`, `package.json`.
- Mobile-first: every layout starts from the small viewport and progressively enhances.
- Framer Motion for card-entry stagger and the empty-state pulse — keep durations short (150-300ms).

## Reply format

Branch `claude/packet-12-chat-ui`, commit `packet 12: chat UI shell`, push. NOTES.md for any spec ambiguities.

Worker briefing (always apply): workspace check, code only, ambiguities in NOTES.md, minimal reply.
