# Packet 24 — Outbound affiliate link layer (Skimlinks/Sovrn wrap + revenue webhook)

- **Worker:** cc-on-web
- **Branch:** `claude/packet-24-affiliate`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** `@/lib/env`, `@/lib/supabase/service`, `@/db/schema/cards`, `@/db/schema/affiliate_revenue`
- **Validation:** `cd atelier && npm install && npm run typecheck`
- **Target paths:** `atelier/lib/affiliate/**` (new), `atelier/app/api/webhooks/skimlinks/route.ts` (new), `atelier/lib/anthropic/tools/add_card.ts` (modify — call link wrapper before insert), `atelier/lib/anthropic/tools/scrape_url.ts` (modify — same)

## Context

Every product card has a `source_url` that gets shown to the giver (recipient sees the card retailer-anonymous). When the giver buys, we want commission. Skimlinks/Sovrn each give us a single integration that auto-wraps any merchant URL into an affiliate-tracked one — we don't need to maintain per-retailer adapters. Start with **Skimlinks** since it has broader retailer coverage (25k+ merchants); leave Sovrn wired as a fallback.

The `affiliate_revenue` table (already in schema) collects webhook events from the network. At reporting time we join `affiliate_revenue` ↔ `picks` ↔ `cards` ↔ `peeks` to see which Peeks/cards drove revenue.

## Inputs

`db/schema/cards.ts` already has `affiliate_url`, `affiliate_network`, `commission_pct` columns from packet 02. `db/schema/affiliate_revenue.ts` already has the full webhook-fed shape from packet 02.

## Deliver

### `atelier/lib/affiliate/skimlinks.ts` (new)

Skimlinks wraps URLs via a deterministic prefix: `https://go.skimresources.com/?id={publisher_id}&url={encoded_url}`. Simple, no API call needed for wrap.

```ts
import { env } from '@/lib/env';

export function wrapSkimlinks(originalUrl: string): { wrappedUrl: string; network: 'skimlinks' } | null {
  if (!env.SKIMLINKS_PUBLISHER_ID) return null;
  const wrapped = `https://go.skimresources.com/?id=${encodeURIComponent(env.SKIMLINKS_PUBLISHER_ID)}&url=${encodeURIComponent(originalUrl)}`;
  return { wrappedUrl: wrapped, network: 'skimlinks' };
}
```

### `atelier/lib/affiliate/sovrn.ts` (new)

Sovrn Commerce uses a similar wrapping pattern: `https://redirect.viglink.com/?key={key}&u={encoded_url}`. (Sovrn acquired VigLink — the redirect host is `redirect.viglink.com` for backwards compat.)

```ts
import { env } from '@/lib/env';

export function wrapSovrn(originalUrl: string): { wrappedUrl: string; network: 'sovrn' } | null {
  if (!env.SOVRN_API_KEY) return null;
  const wrapped = `https://redirect.viglink.com/?key=${encodeURIComponent(env.SOVRN_API_KEY)}&u=${encodeURIComponent(originalUrl)}`;
  return { wrappedUrl: wrapped, network: 'sovrn' };
}
```

Add `SOVRN_API_KEY` to `lib/env.ts` schema as `.optional()`.

### `atelier/lib/affiliate/wrap.ts` (new)

Unified wrapper. Tries Skimlinks first, falls back to Sovrn, finally returns the original URL marked as `direct` if neither network is configured.

```ts
import { wrapSkimlinks } from './skimlinks';
import { wrapSovrn } from './sovrn';

export interface WrappedLink {
  wrappedUrl: string;
  network: 'skimlinks' | 'sovrn' | 'direct';
  commissionPctEstimate: number | null;
}

const COMMISSION_DEFAULTS: Record<string, number> = {
  skimlinks: 5,    // illustrative — actual varies per retailer 3-12%
  sovrn: 4,
  direct: 0,
};

export function wrapAffiliateLink(originalUrl: string): WrappedLink {
  const s = wrapSkimlinks(originalUrl);
  if (s) return { ...s, commissionPctEstimate: COMMISSION_DEFAULTS.skimlinks };
  const v = wrapSovrn(originalUrl);
  if (v) return { ...v, commissionPctEstimate: COMMISSION_DEFAULTS.sovrn };
  return { wrappedUrl: originalUrl, network: 'direct', commissionPctEstimate: null };
}
```

### `atelier/lib/anthropic/tools/add_card.ts` (modify)

Before inserting a card row, if `source_url` is present, call `wrapAffiliateLink(source_url)`. Persist `affiliate_url`, `affiliate_network`, `commission_pct` to the new card row. The recipient-facing UI uses `affiliate_url` when present; falls back to `source_url`. Giver-facing fulfillment email also uses `affiliate_url`.

### `atelier/lib/anthropic/tools/scrape_url.ts` (modify)

After successful scrape, run `wrapAffiliateLink` on the URL and return the wrapped one alongside the scraped product data (so Claude has the wrapped link when it composes `add_card`).

### `atelier/app/api/webhooks/skimlinks/route.ts` (new)

Skimlinks ships transaction reports as a daily callback OR via their API. For real-time, they expose a webhook that POSTs JSON when a tracked click converts.

```ts
import { NextRequest } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';
import { env } from '@/lib/env';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Skimlinks signs payloads with HMAC-SHA256 in `x-skimlinks-signature` header.
  const sig = req.headers.get('x-skimlinks-signature');
  const body = await req.text();
  if (!env.SKIMLINKS_WEBHOOK_SECRET || !sig) return new Response('not configured', { status: 500 });
  const expected = crypto.createHmac('sha256', env.SKIMLINKS_WEBHOOK_SECRET).update(body).digest('hex');
  if (sig !== expected) return new Response('invalid signature', { status: 401 });

  const evt = JSON.parse(body) as {
    transaction_id: string;
    click_id?: string;            // we'll set this to peekId:cardId when wrapping
    sale_amount: number;          // dollars
    commission_amount: number;    // dollars
    currency: string;
    status: 'pending' | 'confirmed' | 'reversed';
    merchant_name: string;
    timestamp: string;
  };

  const sb = getSupabaseService();
  // upsert affiliate_revenue by external_txn_id
  // resolve click_id back to card_id / peek_id if present
  // ...
}
```

Add `SKIMLINKS_WEBHOOK_SECRET` to `lib/env.ts`.

Also add `/api/webhooks/skimlinks` to `proxy.ts` public routes (webhook is signature-authed, not Clerk).

### `atelier/lib/env.ts` (modify)

Add:
```ts
SKIMLINKS_PUBLISHER_ID: z.string().optional(),
SKIMLINKS_WEBHOOK_SECRET: z.string().optional(),
SOVRN_API_KEY: z.string().optional(),
```

### `atelier/.env.example` (modify)

Add the new keys under `# --- Affiliates ---`. Update `SKIMLINKS_PUBLISHER_ID` (already there) and add new ones.

## Constraints

- TS strict. No `any`.
- Wrappers are pure functions when configured; gracefully no-op when keys missing.
- Click-tracking: encode `peekId:cardId` into the wrapped URL via `xs` (Skimlinks custom subID) or `cid` (Sovrn) param so revenue can be attributed back. Add `customId` parameter to `wrapAffiliateLink` for this.
- Webhook is idempotent (upsert on `external_txn_id`).
- Do not modify `package.json` (no new deps needed).
- No narrative comments.

## Reply format

Branch `claude/packet-24-affiliate`, commit `packet 24: outbound affiliate (skimlinks + sovrn + revenue webhook)`, push. NOTES.md.

Worker briefing (always apply): workspace check, code only, ambiguities in NOTES.md, minimal reply.
