# Packet 02 — DB schema (Drizzle + Supabase `peek_v2`)

- **Worker:** cc-on-web (preferred) | webchat-opus
- **Branch:** `claude/packet-02-schema`
- **Depends on:** packet 01 merged
- **Estimated tokens:** ~40k
- **Target paths:** `atelier/db/**`, `atelier/drizzle.config.ts`

## Context

Peek is a gift-page builder. Curator chats with Claude to assemble a `Peek`: a typed document containing recipient info, vibe (theming), hero image, personal note, and a deck of `Card`s (product/activity/aspirational/digital). Cards can group into `VariantGroup`s ("pick one of these"), be locked (`unlock_rule.kind: 'beg'|'date_after'`), or be jokes (`is_taunt`). Recipients return to the published Peek, make `Pick`s, optionally leave `recipient_note` / voice. Curator gets fulfillment notification, handles purchase out-of-band in T1. All actions log to `events` for analytics + replay. Group co-curation = multiple `peek_collaborators` per Peek.

Schema lives in Postgres schema `peek_v2` on Supabase. This packet sets up Drizzle ORM, defines all tables, generates the initial migration SQL.

## Inputs

None — table shape is defined inline below.

## Deliver

### `atelier/drizzle.config.ts`

```ts
import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ['peek_v2'],
  strict: true,
  verbose: true,
} satisfies Config;
```

### `atelier/db/schema/index.ts`

Barrel that re-exports everything from the per-table files below. Also defines and exports `peekV2 = pgSchema('peek_v2')` and have every table use `peekV2.table(...)`.

### `atelier/db/schema/users.ts`

Mirror of Clerk users — populated by Clerk webhook. Columns: `clerk_user_id` (text PK), `email` (text), `display_name` (text nullable), `avatar_url` (text nullable), `created_at` (timestamptz default now()), `updated_at` (timestamptz default now()).

### `atelier/db/schema/peeks.ts`

```
peek_status enum: 'draft' | 'published' | 'claimed' | 'archived'

peeks table:
  id           uuid PK default gen_random_uuid()
  slug         text unique not null
  curator_id   text not null references users.clerk_user_id
  recipient_name      text
  relationship        text
  occasion            text
  vibe                jsonb default '{}'  -- { tone, palette, mood_words, motion, font_pairing }
  hero_image_url      text
  hero_image_source   text   -- 'user_upload' | 'unsplash' | 'ai_generated' | 'external'
  hero_prompt         text
  note_md             text
  status              peek_status default 'draft'
  stripe_payment_intent_id   text
  stripe_checkout_session_id text
  published_at        timestamptz
  expires_at          timestamptz
  share_url           text
  created_at          timestamptz default now()
  updated_at          timestamptz default now()
  index on (curator_id), (slug), (status)
```

### `atelier/db/schema/cards.ts`

```
card_type enum: 'product' | 'activity' | 'aspirational' | 'digital'
variant_selection enum: 'pick_one' | 'pick_any' | 'pick_all'

variant_groups table:
  id        uuid PK
  peek_id   uuid not null references peeks.id on delete cascade
  title     text not null
  selection variant_selection not null
  position  integer default 0

cards table:
  id                uuid PK
  peek_id           uuid not null references peeks.id on delete cascade
  variant_group_id  uuid references variant_groups.id on delete set null
  position          integer not null default 0
  type              card_type not null
  title             text not null
  description       text
  image_url         text
  source_url        text         -- hidden from recipient
  source_retailer   text         -- hidden from recipient
  affiliate_url     text         -- computed at scrape time
  affiliate_network text         -- 'skimlinks' | 'sovrn' | 'amazon_associates' | 'direct'
  commission_pct    numeric(5,2)
  value_cents       integer
  reveal_value      boolean default false
  is_taunt          boolean default false
  taunt_text        text
  is_locked         boolean default false
  unlock_rule       jsonb default '{}'  -- { kind: 'beg' | 'date_after' | 'event', beg_prompt?, unlock_after? }
  proposed_date     timestamptz
  location_hint     text
  added_by_user_id  text references users.clerk_user_id  -- which contributor added it (for group peeks)
  metadata          jsonb default '{}'
  index on (peek_id), (variant_group_id)
```

### `atelier/db/schema/picks.ts`

```
picks table:
  id                  uuid PK
  peek_id             uuid not null references peeks.id on delete cascade
  card_id             uuid not null references cards.id on delete cascade
  picked_at           timestamptz default now()
  recipient_signature text         -- hashed session id or claim token
  recipient_note      text
  beg_message         text         -- if locked card required a beg
  beg_approved_at     timestamptz
  fulfilled_at        timestamptz
  fulfillment_notes   text
  index on (peek_id), (card_id)
```

### `atelier/db/schema/collaborators.ts`

```
collaborator_role enum: 'organizer' | 'co_organizer' | 'contributor'

peek_collaborators table:
  id              uuid PK
  peek_id         uuid not null references peeks.id on delete cascade
  user_id         text references users.clerk_user_id
  invited_email   text     -- for pre-signup invites
  role            collaborator_role not null
  invite_token    text unique
  accepted_at     timestamptz
  created_at      timestamptz default now()
  unique (peek_id, user_id)
```

### `atelier/db/schema/relationships.ts`

```
relationships table:        -- the relationship graph for recurring nudges
  id                 uuid PK
  user_id            text not null references users.clerk_user_id
  recipient_name     text not null
  relationship       text       -- 'mom', 'girlfriend', 'best friend'
  birthday           date
  anniversary        date
  last_peek_id       uuid references peeks.id
  notes              text
  created_at         timestamptz default now()
  index on (user_id)
```

### `atelier/db/schema/events.ts`

```
events table:               -- single source of truth for analytics
  id            bigserial PK
  ts            timestamptz default now()
  user_id       text references users.clerk_user_id  -- null for anon
  session_id    text                                  -- for anon tracking
  peek_id       uuid references peeks.id on delete set null
  kind          text not null  -- 'chat_turn', 'card_added', 'pick', 'share', 'publish', etc.
  payload       jsonb default '{}'
  index on (ts), (user_id), (peek_id), (kind)
```

### `atelier/db/schema/affiliate_revenue.ts`

```
affiliate_revenue table:    -- webhook-fed from Skimlinks/Sovrn
  id                uuid PK
  network           text not null
  external_txn_id   text unique
  card_id           uuid references cards.id
  pick_id           uuid references picks.id
  peek_id           uuid references peeks.id
  reported_at       timestamptz
  amount_cents      integer
  commission_cents  integer
  currency          text default 'USD'
  status            text   -- 'pending' | 'confirmed' | 'reversed'
  raw_payload       jsonb
  created_at        timestamptz default now()
```

### `atelier/db/client.ts`

```ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const queryClient = postgres(process.env.DATABASE_URL!, {
  prepare: false,                // pgbouncer / supabase pooler compatibility
  max: 10,
});

export const db = drizzle(queryClient, { schema });
export type DB = typeof db;
```

### `atelier/db/migrate.ts`

```ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: './db/migrations', migrationsSchema: 'peek_v2_drizzle' });
await sql.end();
console.log('migrations applied');
```

### `atelier/db/migrations/`

Run `npx drizzle-kit generate` after defining the schema files above. Commit the generated SQL files. They will be applied later — do not run `db:migrate` in this packet (the schema may already exist on the remote project).

## Constraints

- All tables in schema `peek_v2`. Verify `pgSchema('peek_v2')` is used.
- Do not modify `package.json`, `tsconfig.json`, `next.config.mjs`, or anything outside `atelier/db/` and `atelier/drizzle.config.ts`.
- TS strict.
- Use `uuid` with `defaultRandom()` (pgcrypto required — assume extension is enabled).
- Booleans default to `false`, not `null`.

## Validation

```bash
cd atelier
npx drizzle-kit check     # verify schema is internally consistent
npm run typecheck
```

## Reply format

cc-on-web: branch `claude/packet-02-schema`, commit `packet 02: schema`, push. Reply with branch + 2 sentences.
webchat-opus: zip `02-schema-deliverable.zip` with files at paths relative to `atelier/`. `NOTES.md` for deviations.

Keep your text reply minimal.
