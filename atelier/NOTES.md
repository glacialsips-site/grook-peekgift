# Packet 33 — Reliability (boundaries + logger + retry)

## Tally

- **`console.error` calls migrated to `logger.error`**: 11 sites across 6 files
  (chat route ×6, build/page ×1, chat/session ×4, analytics/facade ×4, anthropic/observability ×2, upload route ×1).
  `console.warn` in `anthropic/client.ts` and `console.error` in `env.ts` left as-is — both are module-load warnings that run before the logger is reliably ready (logger imports `env` transitively).
- **External calls wrapped in `withRetry`**: 10 sites — `browserbase.session.create`, `browserbase.page`,
  `zenrows.scrape`, `anthropic.scrape.extract`, `fal.submit`, `fal.response`, `rehost.download`,
  `resend.send` (5 attempts), `twilio.send` (3 attempts, no 4xx retry),
  `supabase.storage.upload` + `supabase.storage.remove` (4 attempts each).
  Anthropic SDK retry count set via `new Anthropic({ maxRetries: 3 })` for streaming + non-streaming paths.
- **Empty catches re-justified**: 19 catches audited.
  - 4 logged: `stripe.webhook.logWebhook`, `clerk.webhook.logWebhook` (Inngest publish best-effort),
    `g/[slug]/page.generateMetadata` (lookup graceful), `g/[slug]/opengraph-image` (lookup graceful),
    plus `vibe/evolve` and `vibe/extract-palette` swallows now log at warn with context.
  - 8 left silent because the catch IS the action: request `req.json()` / `req.formData()` failures
    return 400 immediately (5 routes), `controller.close()` on closed stream, user-cancelled
    `navigator.share`, JSON parser fallthroughs to alternative parsing (3 in `scrape/extract`,
    1 in `vibe/classify-tone`, 1 in `chat-pane` SSE), clipboard fallback toast.
  - 4 documented in `_packets/COMMENTS.md`: browserbase session cleanup, anthropic/env module-load
    console warnings (kept by packet design), supabase/server cookie-set in SSR context, `generate_hero_image`
    `tryEvolveVibe` (already existed).
  - 3 silent fal-poll status fetches (continue to next attempt; the retry loop is the poll itself).

## Files created

- `atelier/lib/logger/index.ts` — JSON structured logger, level via `LOG_LEVEL` env, default `info` in prod.
  `logger.child({ component: '...' })` for scoped context. No deps.
- `atelier/lib/retry/withRetry.ts` — exponential backoff + jitter wrapper.
  Honors `Retry-After` header on 429 / 503. Defaults: 3 attempts, 250ms base, 5s cap.
  Tunable `attempts` per call: scrape/image-gen 3, storage 4, email 5.
- `atelier/lib/retry/index.ts` — barrel export.
- `atelier/app/global-error.tsx` — root error boundary (wraps `<html>`); inline styles only so it renders
  even when global CSS is broken. Logs `global_error` with `digest` ref.
- `atelier/app/error.tsx` — segment-level boundary; shows stack in dev, hides in prod.
- `atelier/app/g/[slug]/error.tsx` — recipient page boundary; tailored "couldn't open Peek" copy.
- `atelier/app/build/error.tsx` — build surface boundary; "session hiccup, draft saved" copy.
- `atelier/components/error-boundary.tsx` — generic class component for inline islands (used to wrap
  `<ChatPane>` and `<PreviewPane>` inside `BuildSurface` — chat stays alive if preview crashes
  and vice versa).

## Files modified

### Retry wrappers + logging
- `lib/scrape/browserbase.ts` — `timedFetchOk` throws `HttpError` with `status`; both session-create
  and page-fetch wrapped. Cleanup-DELETE swallow now logs at debug.
- `lib/scrape/zenrows.ts` — fetch wrapped; HttpError on non-ok.
- `lib/scrape/extract.ts` — Anthropic call wrapped.
- `lib/image-gen/fal.ts` — submit + final fetches wrapped (poll loop already retries naturally).
  Custom `retryOn` so 4xx errors don't retry. Warn-logs all upstream failures.
- `lib/image-gen/rehost.ts` — download fetch wrapped.
- `lib/supabase/storage.ts` — upload + remove wrapped.
- `lib/email/send.ts` — Resend call wrapped (5 attempts; surfaces error from response wrapped in
  thrown Error so `defaultRetryOn` can read `.status`).
- `lib/anthropic/client.ts` — added `maxRetries: 3` to constructor.
- `app/api/share/send/route.tsx` — Twilio `messages.create` wrapped with retryOn that skips 4xx.

### Logger migrations
- `app/api/chat/route.ts` — 6 `console.error` → `log.error`. Added classification of upstream 5xx
  vs other failures; on 5xx the SSE `error` event message is the friendly text
  ("We're having trouble connecting to the AI. Give it a moment and try again.") instead of the
  raw SDK message. The `stream_event.error` branch now does the same.
- `app/api/upload/route.ts` — 1 `console.error` → `log.error`.
- `app/build/[peekId]/page.tsx` — 1 `console.error` → `log.error`.
- `lib/chat/session.ts` — 4 `console.error` → `log.error`.
- `lib/analytics/facade.ts` — 4 `console.error` → `log.error`; `shutdownAnalytics` swallow now warns
  instead of pure `/* noop */`.
- `lib/anthropic/observability.ts` — 2 `console.error` → `log.error`.

### Webhook + page resilience
- `app/api/stripe/webhook/route.ts` — `inngest.send` failure now warn-logged (was `catch {}`).
- `app/api/webhooks/clerk/route.ts` — same.
- `app/g/[slug]/page.tsx` — `generateMetadata` lookup failure warn-logged.
- `app/g/[slug]/opengraph-image.tsx` — lookup failure warn-logged.

### Error boundaries integration
- `components/build/build-surface.tsx` — wraps `<ChatPane>` and `<PreviewPane>` / `<PreviewSheet>` in
  inline `<ErrorBoundary>` so a chat island crash doesn't kill the preview (and vice versa).

### Graceful fallbacks
- `lib/anthropic/tools/generate_hero_image.ts` — failure path now returns `{ ok: false, error,
  suggestion }` so the curator model has copy guidance ("Ask the user to describe the hero or pick a
  stock image instead") instead of just an opaque error.
- `app/api/scrape/route.ts` — 502 response now includes `friendly_message` so the UI can surface
  "couldn't pull this product, you can add details manually".
- `app/api/chat/route.ts` — Anthropic 5xx → friendly SSE error message (above).

## Constraints honored

- TS strict — `npm run build` green (validates type-checking).
- No new package.json deps.
- `withRetry` happy path overhead is a single `await` and an integer comparison, well under 200ms.
- Logger has zero runtime config besides `LOG_LEVEL`.

## Open / deferred

- `Retry-After: 30` header on chat SSE: Per packet, the chat route should set this header on
  upstream-5xx response. SSE responses send headers before the stream starts, so we can't
  conditionally add it after the failure. Instead we send the SSE `error` event with the friendly
  message in-stream. A separate non-streaming endpoint (or pre-flight check) would let us return
  a real 503+Retry-After; out of scope for this packet.
- Realtime reconnect: Supabase Realtime client retries by default. Did not add custom backoff —
  `publish-status.tsx` already polls every 2.5s for 60s as a UI-level fallback.
- Inngest SDK already retries 3x per function definition; no extra wrapping needed (verified in
  packet 26 NOTES).
- Edge runtime + logger: the logger module has no `'server-only'` directive and only uses
  `console.*`, so it works in edge routes (`opengraph-image.tsx`). Verified by build.
