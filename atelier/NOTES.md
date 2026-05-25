# Packet 26 — Inngest jobs

## Deferred wiring

- **`@/lib/scrape/*` (packet 22)** does not exist on `atelier-integration` base. `lib/jobs/scrape-worker.ts` calls `${env.APP_URL}/api/scrape` over fetch (same indirection the packet body shows), so no direct import of `lib/scrape/*` is needed — the scrape implementation lands behind `/api/scrape` in packet 22. **No inline stub**. Worker function will runtime-error on `peek/scrape.requested` events until that route exists; Inngest's built-in 3-retry policy will exhaust and the placeholder card title stays at "Scraping…". `lib/anthropic/tools/scrape_url.ts` still inserts the placeholder and fires the event regardless — orchestrator should accept retries-to-fail until packet 22 merges, or temporarily disable the function in the Inngest dashboard.
- **`@/lib/analytics/facade` (packet 25)** does not exist either. The packet 26 prompt imported `track(...)` in the nudge function but only inside a comment. I omitted the import entirely; nudge dedupe + result tracking is done via the existing `peek_v2.events` table. When packet 25 lands, the orchestrator can layer `track()` calls into `nudge-relationships.ts` alongside the existing `events` insert.
- **`app/api/webhooks/skimlinks/route.ts`** (packet 24) does not exist. Not modified.

## API choices vs packet body

- **Inngest 4.x API drift.** The prompt body used Inngest 3-style `createFunction(opts, trigger, handler)` and a `signingKey` prop on `serve()`. v4 (`inngest@4.4.0`, installed) uses `createFunction({ ..., triggers: [...] }, handler)` and reads `signingKey` from the client constructor. Implementation follows v4. Triggers built via `eventType(name, { schema: staticSchema<T>() })` + `cron('...')` so the event-data is typed inside handlers (no `any` outside the SQL row cast).
- **Cron trigger** declared via `cron('0 14 * * *')` inside the function options, replacing the `{ cron: '...' }` literal in the prompt.
- **Inngest client `signingKey`** is wired at construction time, not in serve options. `env.INNGEST_SIGNING_KEY` was already declared in `lib/env.ts`.

## Files written

- `atelier/lib/inngest/client.ts` — Inngest 4 client + three typed `eventType` exports (`scrapeRequestedEvent`, `nudgeDailyEvent`, `webhookReceivedEvent`). `signingKey` on client.
- `atelier/db/schema/webhook_log.ts` — new table; re-exported from `db/schema/index.ts`.
- `atelier/lib/jobs/nudge-relationships.ts` — daily cron (14:00 UTC); finds birthdays/anniversaries exactly 14 days out using `date_part('year', age(...))` to compute the next anniversary regardless of stored year; dedupes via `events` table by `(relationshipId, kind, year)` (year-of-`ts` window); sends via `sendEmail` with new template.
- `atelier/lib/email/templates/relationship-nudge.tsx` — Resend-compatible inline-style React email; tone matches existing `peek-published.tsx`.
- `atelier/lib/jobs/scrape-worker.ts` — listens for `peek/scrape.requested`; retries 3x; updates placeholder card.
- `atelier/lib/jobs/webhook-logger.ts` — listens for `peek/webhook.received`; inserts into `webhook_log`.
- `atelier/app/api/inngest/route.ts` — `serve(...)` exporting GET/POST/PUT.
- `atelier/proxy.ts` — added `/api/inngest(.*)` to public-routes list.
- `atelier/lib/anthropic/tools/scrape_url.ts` — now inserts placeholder card immediately, fires `peek/scrape.requested`, returns `{ ok: true, card_id, pending: true }`. Dispatch failures are logged to `events` so the placeholder isn't orphaned silently.
- `atelier/app/api/stripe/webhook/route.ts` — wrapped in try/finally that fires `peek/webhook.received` (source `stripe`); inngest.send errors swallowed so they can't block the webhook response.
- `atelier/app/api/webhooks/clerk/route.ts` — same try/finally pattern (source `clerk`).

## Migration

`drizzle-kit generate` was **not** run by this worker — would require a `DATABASE_URL` to read the existing schema diff cleanly, and the migration metadata snapshots are tightly coupled to other packets' commits. The orchestrator should run `npx drizzle-kit generate` after merge so the journal/snapshot is consistent with the trunk's evolution.

The required SQL is straightforward:

```sql
CREATE TABLE "peek_v2"."webhook_log" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "source" text NOT NULL,
  "payload" jsonb NOT NULL,
  "success" boolean NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "webhook_log_source_idx" ON "peek_v2"."webhook_log" ("source");
CREATE INDEX "webhook_log_received_at_idx" ON "peek_v2"."webhook_log" ("received_at");
```

## Validation

`cd atelier && npm install && APP_URL=http://localhost:3000 npm run typecheck` — green.
