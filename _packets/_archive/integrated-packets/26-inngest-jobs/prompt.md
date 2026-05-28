# Packet 26 — Inngest jobs (relationship nudges + scrape queue + retries)

- **Worker:** cc-on-web
- **Branch:** `claude/packet-26-inngest-jobs`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** `@/lib/env`, `@/lib/supabase/service`, `@/db/schema/*`, `@/lib/email/send` (from packet 16), `@/lib/scrape/*` (from packet 22 if merged — else stub the import and surface in NOTES)
- **Validation:** `cd atelier && npm install && npm run typecheck`
- **Target paths:** `atelier/app/api/inngest/route.ts` (new), `atelier/lib/jobs/**` (new), `atelier/lib/inngest/**` (new client setup)

## Context

Inngest is the durable background-job layer. Three workflows ship in this packet:

1. **Birthday / anniversary nudges** — daily cron walks `relationships` table; for each recipient with `birthday` or `anniversary` 14 days out, sends the curator an email "Anna's birthday is in 2 weeks. Last year you built her a Peek. Want to start the next one?". Idempotent — only fires once per (relationship, year).
2. **Async scrape queue** — when a chat tool calls `scrape_url`, the scrape can take 5-20s. Today we block the user; ship an async path where the tool emits an Inngest event, returns immediately with a "scraping…" placeholder card, and the worker upserts the card when scrape resolves. Realtime pushes the update to the build UI.
3. **Webhook retry policies** — Stripe and Skimlinks webhooks already retry on non-2xx. But our `peek_v2.events` table is a great place to *also* log every webhook attempt for forensics. Add an Inngest function that listens for `webhook.received` events from our routes (we publish them) and writes them to a dedicated `webhook_log` table.

Inngest signs every function invocation with HMAC-SHA256; verify via `INNGEST_SIGNING_KEY` env var.

## Inputs

`db/schema/relationships.ts` already exists from packet 02 (user_id, recipient_name, relationship, birthday, anniversary, last_peek_id, notes). `db/schema/events.ts` already exists.

## Deliver

### `atelier/lib/inngest/client.ts` (new)

```ts
import 'server-only';
import { Inngest } from 'inngest';
import { env } from '@/lib/env';

export const inngest = new Inngest({
  id: 'peek-gift-vnext',
  eventKey: env.INNGEST_EVENT_KEY,
  // signingKey set at function-serve time
});

export type PeekEvents = {
  'peek/scrape.requested': { data: { peekId: string; url: string; placeholderCardId: string } };
  'peek/nudge.daily': { data: {} };               // cron-fired
  'peek/webhook.received': { data: { source: string; payload: Record<string, unknown>; success: boolean } };
};
```

### `atelier/db/schema/webhook_log.ts` (new)

```ts
import { sql } from 'drizzle-orm';
import { boolean, index, jsonb, text, timestamp, bigserial } from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';

export const webhookLog = peekV2.table(
  'webhook_log',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    source: text('source').notNull(),                 // 'stripe' | 'clerk' | 'skimlinks' | 'inngest'
    payload: jsonb('payload').$type<unknown>().notNull(),
    success: boolean('success').notNull(),
    received_at: timestamp('received_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('webhook_log_source_idx').on(t.source),
    index('webhook_log_received_at_idx').on(t.received_at),
  ],
);
```

Add re-export to `db/schema/index.ts`. Run `npx drizzle-kit generate` and commit the new SQL.

### `atelier/lib/jobs/nudge-relationships.ts` (new)

```ts
import { inngest } from '@/lib/inngest/client';
import { db } from '@/db/client';
import { relationships, peeks } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/send';
import { track } from '@/lib/analytics/facade';

export const dailyNudgeFn = inngest.createFunction(
  { id: 'daily-nudge', name: 'Daily relationship nudge sweep' },
  { cron: '0 14 * * *' },          // 14:00 UTC daily; tune per business hours later
  async ({ step }) => {
    const fourteenDaysOut = await step.run('find-nudges', async () => {
      const rows = await db.execute(sql`
        SELECT r.id, r.user_id, r.recipient_name, r.relationship,
               GREATEST(r.birthday, r.anniversary) AS upcoming,
               r.last_peek_id
        FROM peek_v2.relationships r
        WHERE (
          (r.birthday IS NOT NULL AND (date_trunc('day', r.birthday + interval '1 year') = date_trunc('day', now() + interval '14 days')))
          OR (r.anniversary IS NOT NULL AND (date_trunc('day', r.anniversary + interval '1 year') = date_trunc('day', now() + interval '14 days')))
        )
      `);
      return rows.rows ?? [];
    });

    for (const r of fourteenDaysOut as any[]) {
      await step.run(`nudge-${r.id}`, async () => {
        // dedupe: check events table for kind='nudge_sent' on this relationship this year
        // send email via sendEmail with the curator's address
        // track({ name: 'nudge_sent', ... })
      });
    }
  },
);
```

### `atelier/lib/jobs/scrape-worker.ts` (new)

```ts
import { inngest } from '@/lib/inngest/client';
import { db } from '@/db/client';
import { cards } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const scrapeWorkerFn = inngest.createFunction(
  { id: 'scrape-worker', name: 'Async product scrape', retries: 3 },
  { event: 'peek/scrape.requested' },
  async ({ event, step }) => {
    const { peekId, url, placeholderCardId } = event.data;

    const product = await step.run('scrape', async () => {
      // call internal scrape pipeline OR /api/scrape
      const res = await fetch(`${process.env.APP_URL}/api/scrape`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error(`scrape failed ${res.status}`);
      return await res.json();
    });

    await step.run('update-card', async () => {
      await db.update(cards).set({
        title: product.title ?? 'Scrape failed',
        description: product.description ?? null,
        image_url: product.imageUrl ?? null,
        value_cents: product.valueCents ?? null,
        source_retailer: product.sourceRetailer ?? null,
        // affiliate_url already set at insert time if applicable
      }).where(eq(cards.id, placeholderCardId));
    });
  },
);
```

### `atelier/lib/jobs/webhook-logger.ts` (new)

```ts
import { inngest } from '@/lib/inngest/client';
import { db } from '@/db/client';
import { webhookLog } from '@/db/schema';

export const webhookLoggerFn = inngest.createFunction(
  { id: 'webhook-logger', name: 'Log webhook events' },
  { event: 'peek/webhook.received' },
  async ({ event }) => {
    await db.insert(webhookLog).values({
      source: event.data.source,
      payload: event.data.payload,
      success: event.data.success,
    });
  },
);
```

### `atelier/app/api/inngest/route.ts` (new)

```ts
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { dailyNudgeFn } from '@/lib/jobs/nudge-relationships';
import { scrapeWorkerFn } from '@/lib/jobs/scrape-worker';
import { webhookLoggerFn } from '@/lib/jobs/webhook-logger';
import { env } from '@/lib/env';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [dailyNudgeFn, scrapeWorkerFn, webhookLoggerFn],
  signingKey: env.INNGEST_SIGNING_KEY,
});
```

Add `/api/inngest` to `proxy.ts` public routes — Inngest signs every invocation itself, no Clerk needed.

### `atelier/lib/anthropic/tools/scrape_url.ts` (modify)

Change the tool to:
1. Insert a placeholder card row immediately (`title: 'Scraping...', metadata: { pending: true }`).
2. Emit `await inngest.send({ name: 'peek/scrape.requested', data: { peekId, url, placeholderCardId } })`.
3. Return `{ ok: true, card_id, pending: true }` so Claude knows the card is in flight.

Realtime on the `cards` table (already subscribed by the preview pane) picks up the update when the scrape worker resolves.

### Webhook routes (modify):

- `app/api/webhooks/clerk/route.ts`: after processing, `await inngest.send({ name: 'peek/webhook.received', data: { source: 'clerk', payload: evt, success: true } })`.
- `app/api/stripe/webhook/route.ts`: same with `source: 'stripe'`.
- `app/api/webhooks/skimlinks/route.ts` (from packet 24 if merged): same with `source: 'skimlinks'`.

Wrap in try/finally so logging doesn't block the webhook response.

## Constraints

- TS strict. No `any` except where Inngest typed event payloads need help (then use the generic param).
- All `inngest.send` calls are fire-and-forget — never block the user-visible response.
- Use `step.run` for idempotency on retries.
- Do not modify `package.json` (`inngest` already installed).
- No narrative comments.

## Reply format

Branch `claude/packet-26-inngest-jobs`, commit `packet 26: inngest jobs (nudges + scrape queue + webhook log)`, push. NOTES.md.

Worker briefing (always apply): workspace check, code only, ambiguities in NOTES.md, minimal reply.
