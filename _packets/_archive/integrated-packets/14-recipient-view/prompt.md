# Packet 14 — Recipient view `/g/[slug]` + cinematic reveal + picks API

- **Worker:** cc-on-web | webchat-opus
- **Branch:** `claude/packet-14-recipient-view`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** `@/components/ui/*`, `@/components/peek-vibe-provider`, `@/lib/supabase/service`, `@/lib/supabase/browser`, `@/lib/peek/types`, `db/schema/*`
- **Validation:** `cd atelier && npm install && npm run typecheck` (cross-packet imports)
- **Target paths:** `atelier/app/g/[slug]/**`, `atelier/app/api/pick/**`, `atelier/components/recipient/**`

## Context

When a giver publishes a Peek, the recipient lands at `peek.gift/g/<slug>` (cold link from SMS/iMessage/email/social — no app, no signup). The page is a **cinematic reveal**: the hero image fades up with a custom font flourish, the giver's note types in like the recipient's reading it being written, cards drop in one by one in `position` order with motion timed to the page's `vibe.motion` setting.

After the reveal, the recipient browses cards and picks. Picks write to `peek_v2.picks` and trigger the giver notification (notification work is packet 16/17 — this packet just persists the pick).

The route is **public** (already in `proxy.ts` matcher from packet 06). The recipient is identified by a signed `recipient_session` cookie, not by Clerk auth — they're a stranger to our system until they choose to convert.

### Card-type rendering rules (recipient-facing)

- **product / digital**: image-forward, retailer hidden, value shown only if `reveal_value: true`. Pick → confirm overlay → write `picks` row.
- **activity**: shows proposed date (or "you propose"), location hint. Yes/counter-propose UI.
- **aspirational**: full visual. If `is_locked` AND `unlock_rule.kind === 'beg'`, render a "make your case" CTA opening a textarea — typed message persists in the pick as `beg_message`; giver gets pinged (packet 16) and can approve. If unlocked, normal pick UI.
- **gag** (`is_taunt === true`): `taunt_text` overlay, no pick possible — it's decorative.

### Variant groups

If cards share a `variant_group_id`, they render inside a labeled box with the group `title`. The `selection` rule (`pick_one`, `pick_any`, `pick_all`) is enforced client-side and on the server: picking a second card in a `pick_one` group replaces the prior pick rather than appending.

## Inputs

None — all schema types are already in `db/schema/*` and `lib/peek/types.ts`.

## Deliver

### `atelier/app/g/[slug]/page.tsx`

Server component. Loads the Peek by slug + cards + variant_groups via service-role client. If `peeks.status !== 'published'`, render an "almost ready" placeholder page (don't 404 — the slug exists). If not found, 404.

Sets a `recipient_session` cookie (UUID v4) if absent — signed via `GUEST_CLAIM_TOKEN_SECRET` (already in env). Passes `peekDraft` + `recipientSessionId` to the client component.

### `atelier/components/recipient/recipient-view.tsx`

`'use client'`. The full cinematic reveal + browse + pick UI. Holds local state for which cards are picked (mirrors server-side picks via Realtime). Wraps everything in `<PeekVibeProvider vibe={peek.vibe}>`.

Sub-components (each in its own file under `components/recipient/`):

- `cinematic-reveal.tsx` — orchestrates the timed entrance: hero fade (1s), recipient name flourish (1s delay), note typewriter (50ms/char), then cards stagger in (200ms per card, motion-tuned). Skippable via tap. Uses Framer Motion.
- `hero.tsx` — full-width hero image + recipient name + occasion subtitle.
- `note-block.tsx` — `react-markdown` + `remark-gfm` render of `peek.note_md`.
- `card-deck.tsx` — renders cards in `position` order, grouped by `variant_group_id`.
- `product-card.tsx`, `activity-card.tsx`, `aspirational-card.tsx`, `gag-card.tsx` — per-type renderers.
- `pick-button.tsx` — the action; calls `/api/pick`. Animates confirm. Toasts errors.
- `beg-sheet.tsx` — modal for locked aspirational cards with `unlock_rule.kind === 'beg'`. Textarea + send. POSTs to `/api/pick` with `beg_message`.

### `atelier/app/api/pick/route.ts`

POST handler. Body: `{ peekId: string; cardId: string; recipientSessionId: string; begMessage?: string; recipientNote?: string }`. Validate via Zod. Service-role client.

Logic:
1. Look up the card + its peek. Reject if peek `status !== 'published'`.
2. If card is in a `variant_group` with `selection: 'pick_one'`: delete any existing pick from this `recipientSessionId` on a card in the same group, then insert.
3. Else: insert the pick (or upsert on `(peek_id, card_id, recipient_signature)` unique).
4. `recipient_signature` is a HMAC of `recipientSessionId` keyed by `GUEST_CLAIM_TOKEN_SECRET` — so we don't store the raw session id but can still identify same-recipient.
5. Write an `events` row `kind: 'pick'`.
6. Return `{ ok: true, pickId }`.

DELETE handler at the same route: body `{ peekId, cardId, recipientSessionId }`. Deletes the matching pick (recipient changes their mind).

### `atelier/components/recipient/realtime.ts`

Hook that subscribes to `picks` table updates filtered by `peek_id` so other browsers viewing the same Peek (e.g. recipient on phone + giver previewing on laptop) see selections sync.

## Constraints

- TS strict. No `any`.
- Mobile-first. Hero fills viewport on mobile; cards full-width stacked; bottom-anchored pick button on mobile.
- Animations short (200-1000ms each). No long-running loops.
- HMAC of session uses `crypto.createHmac('sha256', secret)` server-side. Never expose the raw session id in API responses.
- Do not modify any file outside the target paths. Do not touch `db/schema/*` (schema is fixed by packet 13).
- No narrative comments. Log any to `_packets/COMMENTS.md`.

## Reply format

Branch `claude/packet-14-recipient-view`, commit `packet 14: recipient view + picks`, push. NOTES.md if deviations.

Worker briefing (always apply): workspace check, code only, ambiguities in NOTES.md, minimal reply.
