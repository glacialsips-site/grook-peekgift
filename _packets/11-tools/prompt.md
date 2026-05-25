# Packet 11 — Tool implementations (the verbs Peek uses to build the page)

- **Worker:** cc-on-web | webchat-opus
- **Branch:** `claude/packet-11-tools`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** `@/lib/anthropic/tools`, `@/lib/supabase/service`, `@/lib/env`, `db/schema/*`
- **Validation:** `cd atelier && npm install && npm run typecheck` (cross-packet imports)
- **Target paths:** `atelier/lib/anthropic/tools/*.ts` (new files), `atelier/lib/anthropic/tools/bootstrap.ts` (extend)

## Context

These are the verbs Peek calls to mutate the in-flight `Peek` document as the curator chats. Each tool is a typed function registered via `registerTool({ name, description, input_schema, handler })` from packet 03's registry. The schema defines what Claude sees; the handler is server-side code that writes to the DB.

Schema is already defined in packet 02 — review `atelier/db/schema/peeks.ts`, `cards.ts`, `relationships.ts`, etc. Use Drizzle for writes (`db.insert(...).values(...)`, `db.update(...).set(...).where(...)`), and the typed schema objects.

The `ToolContext` passed by the chat route is `{ peekId, userId, sessionId }`. Tools enforce access: peek must exist; user must be curator (or anonymous session-owner). All writes must update `peeks.updated_at = now()`.

**Progressive vibe principle**: the `set_vibe` tool is for the *first* setting; `update_vibe` is for **partial merges** as new signals arrive (hero image color extraction, card category drift, note tone). Both write to `peeks.vibe` jsonb. The system prompt (packet 03) already tells Peek to call `update_vibe` continuously as the conversation evolves — this packet just wires the verb.

## Inputs

You'll be operating against the schema in `atelier/db/schema/`. Read it. Drizzle objects to use:

- `peeks` (table) — has `id, slug, curator_id, recipient_name, relationship, occasion, vibe (jsonb), hero_image_url, hero_image_source, hero_prompt, note_md, status, metadata, updated_at`
- `cards` — `id, peek_id, variant_group_id, position, type, title, description, image_url, source_url, source_retailer, affiliate_url, affiliate_network, commission_pct, value_cents, reveal_value, is_taunt, taunt_text, is_locked, unlock_rule (jsonb), proposed_date, location_hint, added_by_user_id, metadata`
- `variant_groups` — `id, peek_id, title, selection, position`

## Deliver

Each tool is its own file under `atelier/lib/anthropic/tools/`. All files end with a `registerTool({ ... })` call (side-effect). Add an import line to `bootstrap.ts` for each new tool.

### `set_recipient.ts`
Input: `{ recipient_name: string, relationship?: string, occasion?: string }`. Updates `peeks` row. Idempotent.

### `set_vibe.ts`
Input: `{ preset?: 'playful'|'romantic'|'dry'|'unhinged'|'tender', tone?: string, palette?: { bg, surface, ink, accent, accent2? }, mood_words?: string[], motion?: 'still'|'soft'|'lively', font_pairing?: { display: string, body: string } }`. **Replaces** the entire `vibe` object (use for the first-shot setting). Includes a tiny `VIBE_PRESETS` map of 5 default presets defined inline. Returns `{ vibe: <stored> }`.

### `update_vibe.ts`
Input: same shape as `set_vibe`, but **merges** with the existing `peeks.vibe`. Each provided field overwrites; absent fields preserve. Use for progressive evolution: "hero image came back gold-and-teal → update accent", "cards skewed playful → soften the motion to lively", etc. Returns the merged vibe.

### `set_hero_image.ts`
Input: `{ image_url: string, source: 'user_upload'|'unsplash'|'ai_generated'|'external' }`. Updates `peeks.hero_image_url` and `peeks.hero_image_source`. After update, fires a background task to extract a palette from the image and call `update_vibe` with the result (use `palette-extract` placeholder — implementation in a future packet; for now, log a TODO event via `recordEvent` and skip palette extraction. Just update the image.).

### `generate_hero_image.ts`
Input: `{ prompt: string, aspect?: '16:9'|'4:3'|'1:1'|'9:16' }`. Calls fal.ai Flux (stub for now — call `fetch('https://fal.run/...')` with `env.FAL_KEY`, return image url). If `FAL_KEY` missing, return `{ ok: false, error: 'image_gen_not_configured' }` — don't throw. Persist image to Supabase Storage via `uploadAsset` from `@/lib/supabase/storage` (download from fal.ai → re-host). Update `peeks.hero_image_url`, `hero_image_source = 'ai_generated'`, `hero_prompt = prompt`. Returns `{ image_url }`.

### `set_note.ts`
Input: `{ note_md: string }`. Updates `peeks.note_md`. Idempotent.

### `add_variant_group.ts`
Input: `{ title: string, selection: 'pick_one'|'pick_any'|'pick_all' }`. Inserts a row in `variant_groups`. Returns `{ variant_group_id }`.

### `add_card.ts`
Input: full card shape per packet 02 schema (type, title required; description, image_url, source_url, source_retailer, value_cents, reveal_value, variant_group_id, proposed_date, location_hint, is_taunt, taunt_text, is_locked, unlock_rule). Auto-computes `position` as `max(position)+1` per peek. Sets `added_by_user_id = ctx.userId`. Returns `{ card_id }`.

### `remove_card.ts`
Input: `{ card_id: string }`. Deletes row. Returns `{ ok: true }`.

### `reorder_cards.ts`
Input: `{ card_ids: string[] }`. Updates `position` per array index.

### `scrape_url.ts`
Input: `{ url: string }`. Calls a separate `/api/scrape` endpoint (will be a future packet — for now, return `{ ok: false, error: 'scrape_pending_implementation' }` and log the URL). When the scrape endpoint exists, this tool just forwards. Output should be `{ image_url?, title?, description?, value_cents?, source_retailer? }` so Claude can `add_card` with the result.

### `mark_ready_for_publish.ts`
Input: `{}`. Inserts an `events` row of kind `mark_ready`. Returns `{ next_step: 'paywall' }`.

### `bootstrap.ts` (extend the existing file)

Add `import` lines for every new tool, in alphabetical order:

```ts
import './add_card';
import './add_variant_group';
import './generate_hero_image';
import './mark_ready_for_publish';
import './ping';
import './remove_card';
import './reorder_cards';
import './scrape_url';
import './set_hero_image';
import './set_note';
import './set_recipient';
import './set_vibe';
import './update_vibe';
```

## Constraints

- TS strict. No `any`. Use Zod inside each tool to validate input at runtime even though Anthropic enforces the input_schema (defense in depth). Cast `input` to a Zod-parsed type before using.
- Drizzle ORM for all DB writes. Pull `db` from `atelier/db/client.ts` (created in packet 02).
- Service-role Supabase client only when crossing schema boundaries (storage). DB queries use Drizzle.
- Every tool that mutates a peek must set `updated_at = new Date()`.
- No narrative comments. Log any to `_packets/COMMENTS.md`.

## Reply format

Branch `claude/packet-11-tools`, commit `packet 11: tool implementations`, push. NOTES.md for any deviations (especially the fal.ai integration shape if the API differs from what's expected).

Worker briefing (always apply): workspace check, code only, ambiguities in NOTES.md, minimal reply.
