# Packet 34 — integration notes

## Env vars orchestrator must add (Netlify, via MCP)

Sentry suite (all optional — code degrades gracefully when missing, `silent: !CI` keeps dev/build quiet):

- `SENTRY_DSN` — server-side init (`sentry.server.config.ts`, `sentry.edge.config.ts`)
- `NEXT_PUBLIC_SENTRY_DSN` — client-side init (`instrumentation-client.ts`)
- `SENTRY_AUTH_TOKEN` — sourcemap upload on Netlify production/CI builds
- `SENTRY_ORG` — Sentry org slug
- `SENTRY_PROJECT` — Sentry project slug

Build is green WITHOUT these — `withSentryConfig` swallows missing creds when `silent: !process.env.CI` (set on dev) and only warns. PostHog session replay remains the everyday capture path; Sentry is for error + transaction visibility.

## Files changed

- `atelier/instrumentation.ts` — Sentry 10 renamed export: `onRequestError` doesn't exist anymore; aliased from `captureRequestError`. Build was failing on import-not-found before this fix.
- `atelier/lib/anthropic/observability.ts` — added `beginTurnCapture(ctx)` that returns per-iteration handles plus a `flush()` that emits ONE aggregated PostHog `$ai_generation` event per user turn. Existing `tracedCreate` (non-streaming) still emits a single event per call. The legacy `makeStreamCaptureHandle` is gone (only internal call-site was `chat.ts`).
- `atelier/lib/anthropic/chat.ts` — switched from `makeStreamCaptureHandle` per-iteration to `beginTurnCapture` for the whole `for` loop; `try { ... } finally { turnCapture.flush(); }` guarantees the rollup fires even on early `return` from error or stream end.
- `atelier/lib/jobs/scrape-worker.ts` — replaced `fetch(${env.APP_URL}/api/scrape, ...)` with direct `scrapePipeline(url)` import. Pipeline returns `{ ok, product, provider } | { ok:false, error }`; worker throws on `!ok` so Inngest retries kick in. No HTTP self-call.
- `atelier/app/g/[slug]/opengraph-image.tsx` — switched from `edge` runtime to `nodejs` (storage SDK isn't edge-clean). Selects `updated_at` alongside the OG fields, derives a fingerprint (base-36 timestamp), tries `og-cache/<slug>-<fingerprint>.png` via `getPublicUrl` + `fetch`. On hit, returns bytes with `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800`. On miss, renders via `ImageResponse`, returns synchronously, kicks an async storage upload (`upsert: true` so concurrent renders don't 409). Bucket: `peek-v2-assets`. Stale fingerprints accumulate in storage — follow-up packet should add an Inngest cleanup job.
- `atelier/lib/supabase/storage.ts` — added optional `upsert?: boolean` to `uploadAsset()` so the OG cache can safely retry the same path. Default still `false`.
- `atelier/components/build/share-sheet.tsx` — imported `posthog-js`, added `trackShare(peekId, channel)` for `copy | native | imessage | whatsapp | twitter | facebook | email` channels. Each `<a>` and button onClick fires `posthog.capture('share_initiated', { peek_id, channel })`. The "send for me" form fires an additional `share_form_submitted` client-side event before the `/api/share/send` POST so we can measure form-completion funnel separately from the server-side `share_send` event.

## What's no longer there

- `makeStreamCaptureHandle` removed from `lib/anthropic/observability.ts`. The only call-site in `lib/anthropic/chat.ts` was migrated. No external consumers.

## Validation

- `APP_URL=http://localhost:3000 npm run build` → green, 22 routes, no Turbopack errors.
- `APP_URL=http://localhost:3000 npm run typecheck` → green.
- Sentry build wrapper warns once about deprecated `disableLogger` (Turbopack path — Next.js 16); harmless, can be replaced with `webpack.treeshake.removeDebugLogging` in a follow-up once Sentry + Turbopack ship a non-deprecated migration path.

## Observability behavioural change

Before: every inner loop iteration in `chatTurn` emitted a `$ai_generation` event. A multi-tool turn (e.g. set_recipient → set_vibe → add_card → assistant text) produced 4-5 PostHog events per user turn.

After: one aggregated `$ai_generation` event per user turn with `tool_iterations`, `tool_calls_total`, `tool_calls_summary` (per-tool counts), plus the standard `$ai_input_tokens` / `$ai_output_tokens` / `$ai_cache_read_input_tokens` / `$ai_cache_creation_input_tokens` sums and `$ai_latency` (turn total ms). The `events.kind = 'llm_call'` insert in our own table also aggregates now (one row per turn, not per iteration) — PostHog dashboards keyed on `$ai_generation` count will drop ~3-5x. Expected.

## Scrape-worker validation

`lib/jobs/scrape-worker.ts` now imports `scrapePipeline` from `@/lib/scrape/pipeline`. No HTTP self-call. `app/api/scrape/route.ts` still exists for any inline tool invocations; the Inngest path no longer touches it. Pipeline runs in-process with the same Browserbase → ZenRows fallback. Removes ~150ms-1500ms cold-start tax per scrape.

## OG cache verification

Cache key: `og-cache/<slug>-<base36(updated_at.epochMs)>.png`. On a peek update (any `peeks.updated_at` change) the fingerprint flips → next fetch is a cache miss → fresh render → fresh upload. Stale entries linger.

Manual smoke (post-deploy):
1. Publish a Peek → hit `/g/<slug>/opengraph-image` twice → second response should be served from storage (faster, no `ImageResponse` JSX render).
2. Run a chat turn that bumps `updated_at` → fetch again → cache miss → regenerate.

## Risk / known issues

- `posthog-js` import: `posthog.capture()` is a no-op silent-fail when `posthog.init` hasn't run (no DSN/key). The try/catch is defensive belt-and-suspenders.
- Sentry `disableLogger` deprecation warning on every build — needs a future Sentry config refresh once they document the Turbopack-compatible replacement.
- The OG cache path assumes the bucket is publicly readable (matches existing `getPublicUrl` usage). Confirm bucket `peek-v2-assets` is public on Supabase or the cached fetch will always 403 → miss → regenerate (still works, just no cache hits).
