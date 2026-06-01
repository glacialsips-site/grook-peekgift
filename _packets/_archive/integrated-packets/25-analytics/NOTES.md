# Packet 25 — integration notes

## What landed

- `atelier/lib/analytics/facade.ts` — typed `AnalyticsEvent` union, `track()` (PostHog capture + owned `events` table insert, both swallow errors), `trackFireAndForget()`, `getPostHogServer()`, `shutdownAnalytics()`. Distinct-id falls back to `anon-<sessionId>` then `anon-<peekId>` for events with no user.
- `atelier/lib/anthropic/observability.ts` — `tracedCreate()` for non-streaming + `makeStreamCaptureHandle()` for streams. Both emit PostHog `$ai_generation` (PostHog LLM Observability schema: `$ai_provider/$ai_model/$ai_input_tokens/$ai_output_tokens/$ai_cache_read_input_tokens/$ai_cache_creation_input_tokens/$ai_latency/$ai_input/$ai_output_choices/$ai_tools/$ai_is_error/$ai_streaming/$ai_stop_reason`) AND emit an owned `llm_call` event into the `events` table via the facade. Streaming is wrapped from inside `chatTurn` (1 capture per iteration).
- `atelier/lib/anthropic/chat.ts` — added `makeStreamCaptureHandle` inside the iteration loop; `recordFinal` on `message_end`, `recordError` on `error`.
- `atelier/instrumentation.ts` — Next 16 server-side instrumentation hook; reserved (PostHog server-side init is lazy via the facade).
- `atelier/instrumentation-client.ts` — Next 16 client-side instrumentation file. Lazy-inits `posthog-js` against `/api/posthog` reverse proxy (autocapture + session recording on, `person_profiles: 'identified_only'`, `capture_pageview: 'history_change'` for Next App Router). Re-exports `posthog` for the provider.
- `atelier/app/api/posthog/[...path]/route.ts` — verbatim-passthrough reverse proxy (GET/POST/OPTIONS), preserves search string + content-type + cache-control. No body transform, no schema, no auth — matches PostHog's `api_host` proxy spec.
- `atelier/proxy.ts` — added `/api/posthog/(.*)` to `isPublicRoute` so Clerk doesn't 404 ingestion.
- `atelier/components/providers.tsx` — wraps `<ThemeProvider>` in `<PostHogProvider>` when the env key is set. If unset (dev without posthog), falls back to the original tree to keep build/dev green.
- Chat route (`app/api/chat/route.ts`): swapped `recordEvent({kind:'chat_turn'})` for `track({name:'chat_turn'})`, added `latency_ms`. The `anonymousTurnCount` query in `lib/chat/session.ts` still works because `kind: 'chat_turn'` is unchanged.
- Tool instrumentation:
  - `add_card` -> `card_added` (fire-and-forget)
  - `set_vibe` -> `vibe_evolved` source: 'set_vibe' (fire-and-forget)
  - `update_vibe` -> `vibe_evolved` source: 'update_vibe' (fire-and-forget)
  - `mark_ready_for_publish` -> `peek_marked_ready` (awaited, replaces the inline `db.insert(events)` of kind `mark_ready`)
  - `scrape_url` -> `scrape_url_requested` (fire-and-forget, replaces inline insert)
- API instrumentation:
  - `/api/pick` POST insert / update / delete -> `pick` events with `action: 'insert' | 'update' | 'delete'` (replaces the three inline `sb.from('events').insert(...)` calls).
  - `/api/stripe/webhook` -> `publish` with `mock: false` (replaces inline insert).
  - `/api/checkout` mock branch -> `publish` with `mock: true` (replaces inline insert).
  - `/api/share/send` -> `share_send` + `share_initiated` per outcome (replaces `recordShareSend` which used inline insert).

## Deviations / ambiguities

1. **`peek_marked_ready` event name.** Packet enumerated tool handler bullet as `peek_marked_ready` but the existing code wrote `kind: 'mark_ready'`. Switched to `peek_marked_ready` per the packet's "extend AnalyticsEvent if needed" instruction. UI listeners for `mark_ready` (if any) will need a follow-up — grep showed no consumer, only the SSE event stream which is independent.
2. **No `/api/upload` route exists** in `atelier-integration`. Packet bullet "/api/upload -> track({ name: 'upload', ... }) (replaces the existing inline recordEvent)" couldn't be applied. The `upload` event variant remains defined in `AnalyticsEvent` for when packet 20 lands the upload route.
3. **Tool `set_hero_image` writes `kind: 'todo_palette_extract'`** and is left untouched — it's a future-packet placeholder, not in the packet 25 enumerated list.
4. **`share_initiated` semantics.** Packet defines this for the curator-side share UI surface (copy/native/twitter/etc.). Without a client-side instrumentation in `share-sheet.tsx`, only the server-side sms/email path emits it. Other channels (copy/native/twitter/facebook/whatsapp) need a `posthog.capture('share_initiated', ...)` from the client when the user clicks — that's a follow-up since the packet's "modify the share-sheet" was not enumerated.
5. **`tracedCreate` is exported but currently unused** in `atelier-integration` (every Anthropic call goes through `chatTurn`). Kept for future non-streaming calls (e.g. summarizer / scrape-cleanup tools).
6. **Reverse proxy** uses `arrayBuffer()` round-trip to forward any content-type cleanly (posthog ingest sends `application/json` and `text/plain` for some events). No transformation, no Streams API gymnastics.
7. **`recordEvent` in `lib/chat/session.ts`** is dead code now (no callers) but left exported in case future callers want it. `anonymousTurnCount` still queries `events` with `kind: 'chat_turn'` — that contract is preserved because `track('chat_turn')` writes the same kind.
8. **`PostHogProvider` short-circuit.** When `NEXT_PUBLIC_POSTHOG_KEY` is unset, the component renders the inner tree directly instead of rendering `<PostHogProvider client={posthog}>` with an un-initialized client. Avoids a runtime crash inside `posthog-js/react` when `posthog.__loaded` is false.
9. **`db: { schema: 'peek_v2' }`** on the service client means `.from('events')` already targets `peek_v2.events` — no schema selector needed in `facade.ts`.
10. **No `package.json` changes.** `posthog-js` 1.376.0 + `posthog-node` 5.35.1 are already pinned from packet 01.

## Validation

`cd atelier && npm install && APP_URL=http://localhost:3000 npm run typecheck` — passes (per packet `Imports from siblings` rule, typecheck not full build).
