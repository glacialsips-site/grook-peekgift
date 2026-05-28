# CONCEPT INVENTORY — what's actually in the code

Status legend: **WIRED** = end-to-end behavior present. **PARTIAL** = some layers working, gaps documented. **STUB** = file exists with no/empty behavior. **ABSENT** = described in BRAIN-DUMP but no code.

All file paths are repo-relative to `atelier/`. Read-only inventory — no fixes attempted.

---

## 1. Rules engine

**Status: PARTIAL.** Schema and curator-side tools are fully wired. Recipient UI honors the rules visually. Server-side enforcement is incomplete: `pick_all` / `pick_any` modes, `is_locked` / beg requirement, and uniqueness are all unenforced server-side (confirmed in BUGS.md B02–B03).

### Schema
- `db/schema/cards.ts:16-27` — enums `card_type` (`product` | `activity` | `aspirational` | `digital`) and `variant_selection` (`pick_one` | `pick_any` | `pick_all`).
- `db/schema/cards.ts:29-37` — `variant_groups` table (`title`, `selection`, `position`).
- `db/schema/cards.ts:42-46` — `UnlockRule` TS type: `{ kind: 'beg' | 'date_after' | 'event'; beg_prompt?; unlock_after? }`.
- `db/schema/cards.ts:48-95` — `cards` table with rules columns:
  - `valueCents` (integer) + `revealValue` (boolean) — hidden vs visible price.
  - `isTaunt` (boolean) + `tauntText` — gag/wink behavior.
  - `isLocked` (boolean) + `unlockRule` (jsonb).
  - `proposedDate`, `locationHint` for activity cards.
  - `addedByUserId` — contributor attribution (foreign key to `users.clerk_user_id`).
- `db/schema/picks.ts:7-32` — `picks` table with `begMessage`, `begApprovedAt`, `fulfilledAt`, `recipientNote`, `recipientSignature`.
- `db/migrations/0000_next_kylun.sql` — all schema deployed.

### Tools (sender / curator AI)
- `lib/anthropic/tools/add_card.ts:25-100` — `add_card` tool accepts every rule field (`is_taunt`, `taunt_text`, `is_locked`, `unlock_rule` with `kind` + `beg_prompt` + `unlock_after`, `reveal_value`, `value_cents`, `variant_group_id`, `proposed_date`, `location_hint`). Validation by zod. Description explicitly mentions taunt/locked semantics to the model.
- `lib/anthropic/tools/add_variant_group.ts:9-69` — `add_variant_group` tool with `selection` enum.
- `lib/anthropic/tools/reorder_cards.ts`, `remove_card.ts` — adjacent rule plumbing.
- `lib/anthropic/tools/bootstrap.ts:9-22` — all rule-related tools registered.

### Recipient UI
- `components/recipient/card-deck.tsx:37-131` — dispatches by `card.type` and `card.isTaunt`. Renders variant-group blocks with label "Pick one" / "Pick any" / "All of these" (lines 218-222).
- `components/recipient/card-deck.tsx:182-184` — taunt branch routes to `GagCard`.
- `components/recipient/gag-card.tsx:8-43` — pure presentation, no `onPick`. (Server also blocks pick on taunt — see Enforcement.)
- `components/recipient/product-card.tsx:37-90` — `revealValue` gating of price display (line 37). `pick_all` lock styling (lines 38-39, 84-86: shows "Included" label and adds `pointer-events-none opacity-70` when locked-by-group — but does not block the click programmatically).
- `components/recipient/aspirational-card.tsx:35-130` — `isLocked` + `unlockRule.kind === 'beg'` triggers `BegSheet` modal. Locked-overlay uses `unlockRule.beg_prompt`. Persists `begMessage` via `onPick`.
- `components/recipient/beg-sheet.tsx:25-92` — dialog form, uses `unlockRule.beg_prompt`, posts the beg through `onSubmit`.
- `components/recipient/activity-card.tsx:45-181` — renders `proposedDate`, `locationHint`, plus "Counter-propose" dialog that writes `recipientNote`.
- `components/recipient/pick-button.tsx` — pure UI primitive, no rules logic.

Curator-side rendering of same rules:
- `components/build/preview-pane.tsx:237-240, 247-250, 279-302` — `LockOverlay` and `TauntOverlay` mirror the recipient view.

### Server enforcement (`app/api/pick/route.ts`)
- L83-97 — fetches card, asserts `card.peek_id === peekId`, blocks taunt picks (`card.is_taunt` → 400 `card_is_decorative`). **WIRED.**
- L99-108 — peek must be `published`.
- L110-129 — looks up variant group selection + sibling ids.
- L131-138 — `pick_one`: deletes sibling picks for same recipient signature. **WIRED.**
- **GAP:** `pick_all` and `pick_any` branches not implemented — code falls into the `else` block on L139-174 with no group-mode rules applied.
- **GAP:** `is_locked` not checked. Recipient could POST a pick on a locked card with no `begMessage` and it succeeds (BUGS.md B02).
- **GAP:** `unlock_rule.kind === 'date_after'` and `'event'` never consulted anywhere in the codebase (only `'beg'` has UI hooks).
- **GAP:** `recipientSessionId` read from request body, not signed cookie → impersonation (BUGS.md B01).
- **GAP:** No unique index on `(peek_id, card_id, recipient_signature)` (BUGS.md B03).
- **GAP:** Off-limits / "HA YEAH RIGHT" behavior — no code matches `off-limits`, `HA YEAH`, or anything beyond the generic `isTaunt`/`GagCard` rendering. If the BRAIN-DUMP describes a distinct off-limits gag separate from `isTaunt`, it's ABSENT.

### Known gaps cross-ref
- BUGS.md B01 (impersonation), B02 (no server lock enforcement), B03 (no `pick_all` enforcement, no uniqueness), B13 (race on `position`), B16 (no state-machine on `mark_ready_for_publish` precondition).
- `unlock_rule.kind === 'date_after'` and `'event'` are accepted by `add_card`'s zod schema but no consumer code reads them.
- Curator-side preview pane shows lock/taunt overlays but the curator has no "edit rules" UI — rules are only set via the AI chat tools.

---

## 2. Giver collaboration

**Status: STUB.** A schema and an enum exist. Nothing else. No API, no UI, no tool, no invite send, no RLS policy on the table.

### Schema
- `db/schema/collaborators.ts:7-11` — `collaborator_role` enum (`organizer` | `co_organizer` | `contributor`).
- `db/schema/collaborators.ts:13-31` — `peek_collaborators` table: `peekId`, `userId` (Clerk), `invitedEmail` (for pre-signup), `role`, `inviteToken` (unique), `acceptedAt`. Unique constraint on `(peek_id, user_id)`.
- `db/schema/cards.ts:85` — `addedByUserId` on cards is the only consumer of the contributor concept anywhere — `add_card` writes `ctx.userId` into this column on every card insert.
- `db/migrations/0000_next_kylun.sql:6, 86-96, 145-146` — table + constraints deployed.
- `db/migrations/0005_enable_rls_default_deny.sql:6, 17` — RLS enabled + forced on `peek_collaborators`. No policies grant access.

### API
- **ABSENT.** No `app/api/collaborators/...` route. No invite send. No invite-accept route. No `peekCollaborators` reference outside of schema re-exports (`db/schema/index.ts:6`, `lib/supabase/database.types.ts:6, 56`).

### UI
- **ABSENT.** No "invite a co-curator" button, no roster view, no role-gated rendering in `components/build/*`. The build surface treats the signed-in curator as the sole owner.

### Tool surface
- **ABSENT.** No Anthropic tool for inviting/listing collaborators. Bootstrap (`lib/anthropic/tools/bootstrap.ts`) registers nothing related.

### Known gaps
- Packet 23 ("Group co-curation: collaborators API + invite-link flow + role-gated tools") is listed in `_packets/STATE.md:149` and `_packets/STATE.md:320` as a suggested follow-up — never implemented (no `_packets/23-*` directory exists).
- Because RLS is forced with default-deny and `0006_rls_policies.sql` adds no policy for `peek_collaborators`, the table is effectively unreadable/writable except through service-role — moot since nothing reads it.
- `cards.added_by_user_id` is populated but never displayed; no recipient/curator UI surfaces "who added this card".
- `share_url` write path (in peek build flow) does not invite anyone; "share" means "send the link", not "add as contributor".

---

## 3. Social media

**Status: PARTIAL.** Generic share-sheet (copy link + native share + intent-URL launchers for X / Facebook / WhatsApp / iMessage / mailto) wired. Real SMS (Twilio) and Email (Resend) outbound wired through `/api/share/send`. **Zero outbound to Pinterest / Instagram / TikTok**, no Ayrshare/Buffer adapter, no reel generation.

### Share-sheet client
- `components/build/share-sheet.tsx:98-109` — `platformLinks()` returns intent URLs for sms/whatsapp/twitter/facebook/email. These are `sms:`, `https://wa.me/`, `twitter.com/intent/tweet`, `facebook.com/sharer`, `mailto:` — i.e. user-launched share-sheet redirects, not API posts. **WIRED.**
- L142-173 — `handleCopy()` and `handleNativeShare()` (uses browser `navigator.share`). **WIRED.**
- L175-239 — `handleSubmit()` posts to `/api/share/send` with channel `sms` or `email`. **WIRED.**
- L72-86 — PostHog `share_initiated` / `share_form_submitted` analytics (note: BUGS.md M04 flags double-counting between client + server).
- L315-367 — Quick-share button row covers iMessage, WhatsApp, X, Facebook, Email. No Pinterest/IG/TikTok buttons.

### Server send (`app/api/share/send/route.tsx`)
- Twilio SMS path (L73-109): full implementation with retry. Returns `sms_not_configured` when env vars unset. **WIRED.**
- Resend email path (L196-228) via `lib/email/send` + `PeekShareMessageEmail` template. **WIRED.**
- Auth + curator-ownership check (L116-156). Rate limited via `limiters.shareSendPerUser()`.

### Outbound to Pinterest / IG / TikTok
- **ABSENT.** A repo-wide search for `pinterest`, `tiktok`, `instagram`, `ayrshare`, `buffer` (excluding the noun "buffer" used for byte buffers) returns zero matches in `atelier/` outside Node's `Buffer` standard library.
- No `lib/social/` directory. No reel/video generation pipeline. No scheduled-post job in `lib/inngest/` (the three jobs are `nudge-relationships`, `scrape-worker`, `webhook-logger`).
- OG image for sharing is generated at `app/g/[slug]/opengraph-image.tsx` — used by the intent URLs above and any unfurling on iMessage/WhatsApp/X/FB. **WIRED.**

### Known gaps cross-ref
- Packet 27 ("Social outbound: Ayrshare/Buffer adapter + generated reels job") listed at `_packets/STATE.md:153, 324` — never implemented (no `_packets/27-*` directory).
- ROADMAP `C1`, `C2` (`_packets/ROADMAP.md:44-45`) call for TikTok/IG manual posts and Pinterest API integration — Phase C, post-MVP.
- BUGS.md M04 — `share_initiated` event fired both server and client for SMS/email → analytics double-count.

---

## 4. Affiliate / suggested items

**Status: PARTIAL (outbound wrap WIRED; revenue webhook WIRED with caveats; scrape pipeline 2/3 tiers; suggestion UI for curator ABSENT).**

### Outbound wrap (Skimlinks → Sovrn → direct)
- `lib/affiliate/wrap.ts:18-43` — `wrapAffiliateLink(originalUrl, customId?)` tries Skimlinks first, falls back to Sovrn, else returns `direct` unwrapped. Returns `{ wrappedUrl, network, commissionPctEstimate }`. Commission defaults: skimlinks 5%, sovrn 4%. **WIRED.**
- `lib/affiliate/skimlinks.ts:8-22` — env-gated on `SKIMLINKS_PUBLISHER_ID`. Builds `https://go.skimresources.com/?id=…&url=…&xs=customId`. **NOTE:** BUGS.md (line 96 trailing notes) flags this as a stale endpoint — real Skimlinks uses `go.redirectingat.com`.
- `lib/affiliate/sovrn.ts:8-22` — env-gated on `SOVRN_API_KEY`. Builds `https://redirect.viglink.com/?…&cid=customId`. Also flagged as possibly stale.
- `wrap.ts:45-56` — `buildClickCustomId(peekId, cardId?)` returns `peekId:cardId` string for round-trip attribution; `parseClickCustomId()` splits it back. **WIRED.**

Consumers (callsites):
- `lib/anthropic/tools/add_card.ts:117-160` — wraps before insert with `peekId`, then re-wraps with `peekId:cardId` post-insert and `UPDATE`s if the wrapped URL changed. Persists `affiliateUrl`, `affiliateNetwork`, `commissionPct`. **WIRED.**
- `lib/anthropic/tools/scrape_url.ts:33-62` — wraps placeholder card with peek-level custom id before insert. **GAP (BUGS.md M16):** `lib/jobs/scrape-worker.ts:26-37` does not re-wrap with `peekId:cardId` after hydration → click attribution stays peek-level.

### Scrape pipeline tiers
- `lib/scrape/pipeline.ts:33-57` — two-tier: tries Browserbase, falls back to ZenRows. 25s timeout. Uses `extractProduct()` for HTML → structured product. **PARTIAL — Jina Reader third tier missing (BUGS.md M12).**
- `lib/scrape/browserbase.ts` — tier 1. **GAP:** BUGS.md M13 flags `POST /v1/sessions/{id}/page` as not a documented Browserbase endpoint; pipeline 404s and falls through to ZenRows every time.
- `lib/scrape/zenrows.ts` — tier 2 fallback. Effectively the only working scrape provider.
- `lib/scrape/extract.ts:17, 100-130` — Anthropic-call extracts `{title, description, imageUrl, valueCents, sourceRetailer}` from HTML. **WIRED.**
- `app/api/scrape/route.ts` — HTTP entrypoint called by `scrape-worker.ts`. **WIRED.**
- `lib/jobs/scrape-worker.ts` — Inngest job that runs the pipeline async and updates the placeholder card. **WIRED with M16 gap above.**

### Suggestion UI for curator
- **ABSENT.** No "suggested items" UI, no panel of pre-fetched affiliate-network products for the curator to pick from. The build surface (`components/build/*`) is chat-driven only. Curator pastes a URL → `scrape_url` tool fetches it → card is inserted. There is no "browse suggested products" or "recommended for this vibe" code path.
- No "suggestions" or "recommendations" tool registered in `lib/anthropic/tools/bootstrap.ts`. Repo-wide grep for `suggest` / `recommend` returns only two matches in `generate_hero_image.ts` (error-message field).
- No outbound search to Skimlinks / Sovrn product feeds. The two `lib/affiliate/*.ts` files only handle wrapping, not catalog browsing.

### Revenue webhook
- `app/api/webhooks/skimlinks/route.ts:42-120` — Skimlinks POST endpoint. Verifies HMAC-SHA256 signature via `x-skimlinks-signature` header against `SKIMLINKS_WEBHOOK_SECRET`. Parses transaction; uses `parseClickCustomId` to recover `peekId` + `cardId`; looks up most recent pick on that card; upserts a row into `affiliate_revenue` with `on_conflict: external_txn_id` for idempotency. **WIRED with caveats:**
  - BUGS.md M14 — signature format is guessed (Skimlinks doesn't publish the format). Will likely 401 on first real webhook until verified against actual docs.
  - `lib/security/idempotency.ts` deduplicates by `(source='skimlinks', eventId=transaction_id)`.
- `db/schema/affiliate_revenue.ts:9-29` — `affiliate_revenue` table: `network`, `externalTxnId` (unique), `cardId`/`pickId`/`peekId` references, `amountCents`, `commissionCents`, `status` (`pending`/`confirmed`/`reversed`), `rawPayload` jsonb. **WIRED.**
- **GAP:** No Sovrn revenue webhook route. Only Skimlinks has an inbound webhook.
- **GAP:** No surfacing of revenue back to the curator (no dashboard view).

### Known gaps cross-ref
- BUGS.md M12 (Jina fallback), M13 (Browserbase endpoint), M14 (Skimlinks signature format), M16 (re-wrap on scrape worker), M24 (placeholder card position collision + no vibe schedule), B14/B15 (peripheral — Stripe webhook handling and Upstash idempotency fail-open).
- STATE.md line 24 confirms M14 status: "Skimlinks webhook signature header name/encoding isn't publicly documented — followed packet's `x-skimlinks-signature` / hex-HMAC spec verbatim."
- ROADMAP `C5`, `C8` (Phase C) — "creator affiliate" (Tolt/Rewardful) is deferred entirely, no schema.
