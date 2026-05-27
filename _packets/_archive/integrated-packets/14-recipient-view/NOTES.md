# Packet 14 — integration notes

## Decisions / deviations

- **No `generateMetadata` export.** Packet 16 (share/OG/email) is dispatched in
  parallel and owns that export at `app/g/[slug]/page.tsx`. This packet wrote
  only the default server component body + helpers. Merge-time the orchestrator
  layers them.
- **HMAC fallback when `GUEST_CLAIM_TOKEN_SECRET` is missing.** Both
  `app/g/[slug]/page.tsx` and `app/api/pick/route.ts` use `crypto.createHmac` if
  the env var is set; otherwise they emit `unsigned:<sessionId>` and continue.
  No `console.warn` was added — the env var is listed as optional in
  `lib/env.ts`. Production deploy SHOULD set the secret. If you want a startup
  warning, fold it into env init.
- **Recipient `events` row** writes `session_id = <signature>`, `peek_id`,
  `kind = 'pick'`, payload `{ card_id, action, pick_id? }`. `user_id` left null
  (recipient is anonymous). Add a column to filter giver vs recipient events
  later if needed.
- **`recipient_session` cookie**: UUID v4, httpOnly, sameSite=lax,
  secure-in-prod, 365-day TTL. Set on first GET of `/g/<slug>` via the server
  component. The raw value goes back to the client for use in API calls (so the
  server can verify); the HMAC signature is what hits the DB.
- **Cinematic-reveal timing** is parameterized by `vibe.motion`:
  `still` ⇒ 0.6× scale, `soft` ⇒ 1×, `lively` ⇒ 1.25×. Total reveal duration
  caps at ~3.5–4.5s (hero fade → name flourish → cards stagger). Tap anywhere
  (or Enter/Space) skips. The note typewriter only types when note ≤ 280 chars
  AND the user hasn't already skipped; longer notes render instantly to avoid
  trapping the recipient.
- **Variant-group semantics** enforced server-side:
  - `pick_one`: server DELETEs all picks from this recipient in the group's
    sibling card_ids before INSERT.
  - `pick_any` / `pick_all`: upsert path checks for existing
    `(peek_id, card_id, recipient_signature)` and updates if found; inserts
    otherwise. `pick_all` cards always render as "Included" (pick button
    disabled visually) but the API still accepts opt-in/opt-out, so the giver's
    intent isn't accidentally overridden if they later switch a card out of the
    group.
- **`taunt` (gag) cards** are explicitly rejected by `POST /api/pick`
  (`card.is_taunt === true` ⇒ 400). The recipient UI also doesn't expose a
  pick button on gag cards.
- **Activity card counter-propose** reuses the existing pick row via
  `recipient_note` rather than a separate column. Giver-side will surface this
  text in their picks dashboard.
- **`AspirationalCard` beg flow** writes `beg_message` on the same pick row.
  When the beg modal opens for an already-picked card it pre-fills with the
  existing message so the recipient can revise.
- **Supabase realtime** subscribes to all `picks` for the peek (not filtered by
  recipient signature) so multi-device (recipient phone + giver laptop) stays
  in sync. The HMAC means the client never learns other recipients' raw
  session ids, but in MVP there should only be one recipient per peek anyway.
- **`PickButton` confirm ripple** is a 700ms scale-up div, then dismissed. Not
  a celebration confetti — kept subtle to match the cinematic aesthetic.
- **No comments file entries** — packet 14 doesn't introduce any narrative
  comments.

## Files touched (strictly within target paths)

```
atelier/app/g/[slug]/page.tsx
atelier/app/api/pick/route.ts
atelier/components/recipient/almost-ready.tsx
atelier/components/recipient/recipient-view.tsx
atelier/components/recipient/realtime.ts
atelier/components/recipient/cinematic-reveal.tsx
atelier/components/recipient/hero.tsx
atelier/components/recipient/note-block.tsx
atelier/components/recipient/card-deck.tsx
atelier/components/recipient/pick-button.tsx
atelier/components/recipient/product-card.tsx
atelier/components/recipient/activity-card.tsx
atelier/components/recipient/aspirational-card.tsx
atelier/components/recipient/beg-sheet.tsx
atelier/components/recipient/gag-card.tsx
```

## Validation

- `npm install` clean
- `npm run typecheck` green
- `npm run build` green; route table shows `ƒ /api/pick` and `ƒ /g/[slug]`

## Follow-ups / known limitations

- `picks` table relies on no DB-level unique constraint for
  `(peek_id, card_id, recipient_signature)`; the upsert path is application-
  level. If concurrent same-recipient POSTs race, two rows could land. Worth a
  partial unique index in a follow-up schema packet.
- `picks` realtime fires per-row; no rate limit. If a single peek gets very
  large picker traffic the channel can chatter. Not an MVP concern.
- The cinematic reveal uses a fixed overlay; users who hit the page with
  `prefers-reduced-motion: reduce` still see the overlay (it's still skippable).
  Worth wiring `useReducedMotion` from Framer for a follow-up packet.
