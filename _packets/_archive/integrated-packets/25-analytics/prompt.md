# Packet 25 — Analytics instrumentation (PostHog server+client + LLM observability + events writer)

- **Worker:** cc-on-web
- **Branch:** `claude/packet-25-analytics`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** `@/lib/env`, `@/lib/supabase/service`, `@/lib/auth/server`, `@/db/schema/events`, `@/lib/anthropic/client`
- **Validation:** `cd atelier && npm install && npm run typecheck`
- **Target paths:** `atelier/lib/analytics/**` (new), `atelier/lib/anthropic/observability.ts` (new), `atelier/instrumentation.ts` (new), `atelier/instrumentation-client.ts` (new), `atelier/app/api/posthog/**` (new — reverse proxy for ad-blocker resilience), `atelier/lib/anthropic/client.ts` (modify — wrap with LLM observability), `atelier/components/providers.tsx` (modify — add PostHog provider)

## Context

We need three layers of analytics, all routed through one facade so we instrument once:

1. **PostHog client + server** for product analytics (events, autocapture, session replay, feature flags, A/B). Use the official `posthog-js` (browser) and `posthog-node` (server) SDKs.
2. **LLM observability** wrapping every Anthropic call: prompt, response, model, tokens in/out/cached, latency, cost, tool calls. Emit as PostHog events + write to our `events` table (kind: `llm_call`) so we can query owned data.
3. **Owned events table** is already populated by chat / picks / publish / share — but inconsistently. Standardize the schema via a typed facade.

PostHog has a built-in LLM Observability dashboard that ingests OpenAI/Anthropic events automatically — we just need to call `posthog.capture('$ai_generation', ...)` with the right schema. Reuse it.

## Inputs

`db/schema/events.ts` already has the `events` table.

## Deliver

### `atelier/lib/analytics/facade.ts` (new)

Single typed API for emitting events. Routes to PostHog (server-side) + writes to our `events` table. Idempotent + non-blocking (errors are logged, not thrown).

```ts
import 'server-only';
import { PostHog } from 'posthog-node';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';

let _client: PostHog | null = null;

function client(): PostHog | null {
  if (_client) return _client;
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  _client = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    flushAt: 1,           // realtime — we're not high-volume yet
    flushInterval: 0,
  });
  return _client;
}

export type AnalyticsEvent =
  | { name: 'peek_created'; peekId: string; userId: string | null; payload?: Record<string, unknown> }
  | { name: 'chat_turn'; peekId: string; userId: string | null; sessionId: string; payload: { tokensIn: number; tokensOut: number; cacheReadIn?: number; cacheCreationIn?: number; toolCalls: number; latencyMs: number; model: string } }
  | { name: 'card_added'; peekId: string; userId: string | null; payload: { cardType: string; isVariant: boolean } }
  | { name: 'vibe_evolved'; peekId: string; userId: string | null; payload: { source: string; patch: Record<string, unknown> } }
  | { name: 'pick'; peekId: string; userId: null; payload: { cardId: string; isVariant: boolean } }
  | { name: 'publish'; peekId: string; userId: string; payload: { mock: boolean; amountCents?: number } }
  | { name: 'share_initiated'; peekId: string; userId: string; payload: { channel: 'copy' | 'sms' | 'email' | 'native' | 'twitter' | 'facebook' | 'whatsapp' } }
  | { name: 'upload'; peekId: string; userId: string | null; payload: { contentType: string; sizeBytes: number } }
  | { name: 'scrape_complete'; peekId: string; userId: string; payload: { source: string; ok: boolean; latencyMs: number } }
  | { name: 'affiliate_revenue'; peekId: string; userId: null; payload: { commissionCents: number; network: string } };

export async function track(evt: AnalyticsEvent): Promise<void> {
  // 1. PostHog capture (fire-and-forget)
  const ph = client();
  if (ph) {
    try {
      ph.capture({
        distinctId: evt.userId ?? `anon-${(evt as any).sessionId ?? evt.peekId}`,
        event: evt.name,
        properties: { peek_id: evt.peekId, ...(evt as any).payload },
      });
    } catch {}
  }
  // 2. Owned events table (await but swallow errors)
  try {
    const sb = getSupabaseService();
    await sb.from('events').insert({
      user_id: evt.userId,
      session_id: (evt as any).sessionId ?? null,
      peek_id: evt.peekId,
      kind: evt.name,
      payload: (evt as any).payload ?? {},
    });
  } catch {}
}
```

### `atelier/lib/anthropic/observability.ts` (new)

Wraps the `anthropic` client so every `messages.create` / `messages.stream` call logs to PostHog (in the `$ai_generation` event schema PostHog expects) + to our `events` table.

```ts
import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { anthropic } from './client';
import { track } from '@/lib/analytics/facade';
import { PostHog } from 'posthog-node';
import { env } from '@/lib/env';

let _ph: PostHog | null = null;
function ph(): PostHog | null { /* same lazy singleton */ }

export async function tracedCreate(opts: {
  params: Anthropic.MessageCreateParamsNonStreaming;
  ctx: { peekId: string; userId: string | null; sessionId: string };
}): Promise<Anthropic.Message> {
  const start = Date.now();
  const res = await anthropic.messages.create(opts.params);
  const latencyMs = Date.now() - start;

  // PostHog $ai_generation schema
  const phc = ph();
  if (phc) {
    phc.capture({
      distinctId: opts.ctx.userId ?? `anon-${opts.ctx.sessionId}`,
      event: '$ai_generation',
      properties: {
        $ai_provider: 'anthropic',
        $ai_model: res.model,
        $ai_input_tokens: res.usage.input_tokens,
        $ai_output_tokens: res.usage.output_tokens,
        $ai_cache_read_input_tokens: res.usage.cache_read_input_tokens,
        $ai_cache_creation_input_tokens: res.usage.cache_creation_input_tokens,
        $ai_latency: latencyMs,
        $ai_input: opts.params.messages,
        $ai_output_choices: res.content,
        $ai_tools: opts.params.tools,
        peek_id: opts.ctx.peekId,
      },
    });
  }
  return res;
}

// Same shape for streaming — wrap MessageStream events, accumulate usage + content, emit at finalMessage.
export function tracedStream(opts: {
  params: Anthropic.MessageCreateParamsStreaming;
  ctx: { peekId: string; userId: string | null; sessionId: string };
}) {
  const start = Date.now();
  const stream = anthropic.messages.stream(opts.params);
  stream.on('finalMessage', (msg) => {
    const latencyMs = Date.now() - start;
    // ... same capture as above
  });
  return stream;
}
```

### `atelier/app/api/chat/route.ts` (modify)

Replace direct `anthropic.messages.create` and `anthropic.messages.stream` with `tracedCreate` / `tracedStream`. (If packet 17's refactor already routes through `chatTurn`, modify `chatTurn` instead so the tracing wraps the whole loop.)

### `atelier/lib/anthropic/chat.ts` (modify)

Inside `chatTurn`, before/after each loop iteration: call `track({ name: 'chat_turn', ... })` with the iteration's usage. Sum across iterations for the user-visible total.

### `atelier/instrumentation.ts` (new)

Next.js convention. Loaded once on cold start, server + edge.

```ts
import { env } from '@/lib/env';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // initialize PostHog node singleton (lazy init in facade is fine — this is mostly a hook for future Sentry/etc.)
  }
}
```

### `atelier/instrumentation-client.ts` (new — Next 15+ client instrumentation file)

```ts
import posthog from 'posthog-js';

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: '/api/posthog',  // reverse proxy
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    disable_session_recording: false,
    autocapture: true,
  });
}
```

### `atelier/app/api/posthog/[...path]/route.ts` (new — reverse proxy)

Bounces PostHog ingest through our domain so ad-blockers don't kill it.

```ts
import { NextRequest } from 'next/server';

const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = `${PH_HOST}/${path.join('/')}${req.nextUrl.search}`;
  const body = await req.text();
  const res = await fetch(target, { method: 'POST', headers: { 'content-type': req.headers.get('content-type') ?? 'application/json' }, body });
  return new Response(await res.text(), { status: res.status, headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' } });
}

export const GET = POST;
```

Add `/api/posthog/(.*)` to `proxy.ts` public routes.

### `atelier/components/providers.tsx` (modify)

Add `PostHogProvider` from `posthog-js/react` wrapping children inside the existing `<QueryClientProvider>`. Pull config from the `instrumentation-client.ts` shared init.

### `atelier/lib/env.ts` (modify)

`NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` are already `.optional()`. No change.

### Tool handlers (instrument them inline):

- `add_card` → `track({ name: 'card_added', ... })` after insert
- `update_vibe` / `set_vibe` → `track({ name: 'vibe_evolved', ... })`
- `mark_ready_for_publish` → `track({ name: 'peek_marked_ready', ... })` (extend AnalyticsEvent if needed)

### `/api/pick` route → `track({ name: 'pick', ... })` after successful insert
### `/api/stripe/webhook` → `track({ name: 'publish', ... })` after status flip
### `/api/share/send` → `track({ name: 'share_initiated', channel: body.channel, ... })`
### `/api/upload` → `track({ name: 'upload', ... })` (replaces the existing inline `recordEvent`)

## Constraints

- TS strict. No `any` except in PostHog event extras where the SDK accepts loose objects (annotate why).
- `track()` calls are fire-and-forget — must never block.
- Owned `events` table writes are best-effort — log on error, don't throw.
- Reverse-proxy route must NOT add latency (no transformation, just proxy).
- Do not modify `package.json` (`posthog-js` + `posthog-node` already installed in packet 01).
- No narrative comments.

## Reply format

Branch `claude/packet-25-analytics`, commit `packet 25: analytics + LLM observability`, push. NOTES.md.

Worker briefing (always apply): workspace check, code only, ambiguities in NOTES.md, minimal reply.
