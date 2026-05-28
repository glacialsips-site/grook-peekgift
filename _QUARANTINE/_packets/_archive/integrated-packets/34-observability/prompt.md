# Packet 34 — Observability + caching (Sentry, OG cache, internal scrape call, client share events)

- **Worker:** cc-on-web
- **Branch:** `claude/packet-34-observability`
- **Depends on (sequencing):** `atelier-integration`. Light dependency on packet 33 (uses `lib/logger` if landed; works without).
- **Imports from siblings:** none new
- **Validation:** `cd atelier && npm install && npm run build` green. Manual: trigger a real error in dev → see it in Sentry. Hit an OG endpoint twice → second is cached. Click a share button → PostHog event fires client-side.
- **Target paths:** `atelier/instrumentation.ts` (modify — Sentry init), `atelier/instrumentation-client.ts` (modify — Sentry client init); new `atelier/sentry.server.config.ts`, `atelier/sentry.client.config.ts`, `atelier/sentry.edge.config.ts`; `atelier/next.config.mjs` (Sentry wrapper); `atelier/app/g/[slug]/opengraph-image.tsx` (cache headers + signed cache key); `atelier/lib/jobs/scrape-worker.ts` (internal call); `atelier/components/build/share-sheet.tsx` (client share tracking); `atelier/lib/anthropic/observability.ts` (per-turn aggregation).

## Context

Four observability/perf gaps:

1. **No Sentry.** Was ripped out pre-batch-1 to debug deploys. Production traffic now and we have zero error visibility. Packet 08 deferred this; we want it now.
2. **OG image regenerates every fetch.** `/g/[slug]/opengraph-image` calls Supabase + `@vercel/og` on every social-platform unfurl. Twitter, Meta, Slack, iMessage all prefetch — that's 4+ regenerations per share. Cache.
3. **Inngest scrape-worker self-calls `/api/scrape` via HTTP.** Wasteful + brittle (auth headers, redirect handling, fetch timeouts). Should call the scrape pipeline function directly in-process.
4. **Client-side share events not firing.** Worker noted in packet 25: only `sms` + `email` server-side share send fires `share_initiated`. Copy/native/twitter/facebook/imessage/whatsapp button clicks don't. We're flying blind on which channels drive picks.

Plus: LLM observability captures per-iteration in the chat loop, not per user-turn. Aggregate.

## Deliver

### Sentry

Use the Sentry Next.js wizard's manual config (don't run the wizard CLI — too noisy, conflicts with our setup). Install pattern:

`atelier/sentry.server.config.ts`:
```ts
import * as Sentry from '@sentry/nextjs';
import { env } from '@/lib/env';

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 0,
    sendDefaultPii: false,
  });
}
```

`atelier/sentry.client.config.ts`:
```ts
import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,        // off by default; PostHog session replay covers the everyday case
    integrations: [Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false })],
    sendDefaultPii: false,
  });
}
```

`atelier/sentry.edge.config.ts`: same pattern, edge variant.

`atelier/instrumentation.ts` (modify):
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export { onRequestError } from '@sentry/nextjs';
```

`atelier/instrumentation-client.ts` (modify): add Sentry init alongside the existing PostHog init. Both run.

`atelier/next.config.mjs` (modify): wrap export with `withSentryConfig`:
```js
import { withSentryConfig } from '@sentry/nextjs';
// ... existing nextConfig ...
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  tunnelRoute: '/monitoring',     // bypass ad-blockers
}, {
  // standard buildtime options
});
```

Add `/monitoring(.*)` to `proxy.ts` public routes.

Error boundaries from packet 33 should call `Sentry.captureException(error)` in their componentDidCatch hooks. Add it.

Env vars to add to Netlify (orchestrator does via MCP after merge): `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`. Surface required in NOTES.md.

### OG image caching

`atelier/app/g/[slug]/opengraph-image.tsx` (modify):

Cache the rendered PNG in Supabase Storage (`og-images/<slug>-<peek.updated_at-fingerprint>.png`), serve from storage when present, regenerate only when fingerprint mismatch.

```ts
import { ImageResponse } from 'next/og';
import { getSupabaseService } from '@/lib/supabase/service';
import { uploadAsset, getPublicUrl } from '@/lib/supabase/storage';
// ...

export const revalidate = 3600;   // ISR fallback if storage path is missing
export const runtime = 'nodejs';   // edge can't do storage writes cleanly; nodejs runtime
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const sb = getSupabaseService();
  const { data: peek } = await sb.from('peeks').select('updated_at, recipient_name, occasion, hero_image_url, vibe').eq('slug', slug).maybeSingle();

  // fingerprint = updated_at timestamp encoded
  const fingerprint = peek?.updated_at ? new Date(peek.updated_at).getTime().toString(36) : 'na';
  const cachedPath = `og-cache/${slug}-${fingerprint}.png`;

  // try fetch from storage first; if present, redirect to its public URL
  // (ImageResponse can't return a redirect; instead we re-fetch the bytes and stream them)
  const cachedUrl = getPublicUrl(cachedPath);
  const cached = await fetch(cachedUrl).catch(() => null);
  if (cached?.ok) {
    return new Response(await cached.arrayBuffer(), {
      status: 200,
      headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' },
    });
  }

  // ... else render via ImageResponse, then upload + return
  const res = new ImageResponse(<OgCard peek={peek} />, size);
  const buf = Buffer.from(await res.arrayBuffer());
  await uploadAsset({ path: cachedPath, data: buf, contentType: 'image/png', cacheControl: '604800' }).catch(() => {});
  return new Response(buf, { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' } });
}

function OgCard({ peek }: { peek: any }) { /* same JSX as current implementation */ }
```

Note: when a Peek is updated (any `peeks.updated_at` change), the fingerprint flips and a fresh image gets generated on next request. Stale fingerprints accumulate in storage; add an Inngest cleanup job (defer to follow-up packet — note in NOTES.md).

### Scrape worker internal call

`atelier/lib/jobs/scrape-worker.ts` (modify):

Currently `await fetch(\`${env.APP_URL}/api/scrape\`, ...)`. Replace with a direct call into the scrape pipeline:

```ts
import { scrapePipeline } from '@/lib/scrape/pipeline';
// ...
const outcome = await scrapePipeline(event.data.url);
if (!outcome.ok) throw new Error(outcome.error);
const product = outcome.product;
// ... update card row
```

Removes the HTTP self-call, the auth handling, and the Netlify cold-start tax. Pipeline is already pure-server.

### Per-turn LLM observability aggregation

`atelier/lib/anthropic/observability.ts` (modify):

Currently captures `$ai_generation` event PER inner loop iteration. Buffer the loop's iterations in memory keyed on a `turnId`, emit ONE aggregated event at outermost loop boundary:

- `total_input_tokens`, `total_output_tokens`, `total_cache_read`, `total_cache_creation`
- `tool_iterations` count
- `tool_calls`: list of `{ name, duration_ms, ok }`
- `latency_ms` (turn total)
- `model`
- `final_stop_reason`

Single PostHog `$ai_generation` event with the rollup. The chat route already calls `track({ name: 'chat_turn', ... })` once per turn — keep that, but it's the consumer-facing aggregate, distinct from the LLM-spec PostHog event.

### Client-side share tracking

`atelier/components/build/share-sheet.tsx` (modify):

Each share button (copy, native, twitter, facebook, whatsapp, imessage/sms-direct, email-direct) — on click, fire:

```ts
import posthog from 'posthog-js';
// ...
const trackShare = (channel: ShareChannel) => {
  posthog.capture('share_initiated', { peek_id: peekId, channel });
};
```

Add `trackShare(channel)` to every button's onClick. For the in-app SMS/email form that POSTs to `/api/share/send`, the server-side already tracks; the client side ALSO fires `share_form_submitted` event for funnel completeness.

## Constraints

- TS strict.
- Sentry config must NOT spam dev logs (`silent: !CI`).
- OG cache key incorporates `updated_at` — never serve a stale image for a re-published Peek.
- Scrape worker internal call must not deadlock (no circular import — `scrape-worker.ts` imports `scrapePipeline`; `scrapePipeline` imports nothing from `lib/jobs/`).
- Per-turn observability: aggregated PostHog event must include `cost_usd_estimate` if model pricing is in scope; otherwise just leave tokens + caller computes.
- Don't modify `package.json` (`@sentry/nextjs` already installed).
- Use subagents: one for Sentry wiring across files, one for OG cache, one for scrape-worker + LLM aggregation, one for share-sheet client events.

## Reply format

Branch `claude/packet-34-observability`, commit `packet 34: observability + caching`, push. NOTES.md with: env vars orchestrator must add (Sentry suite), validation that scrape-worker no longer self-fetches, OG cache hit/miss path verified.
