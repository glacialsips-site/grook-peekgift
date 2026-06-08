# MECHANICS-IR — the data model, the IR/document, and the interaction contract

> Produced for the CTO prep. READ-ONLY mine of the shared tree. Method: `git show`/`git ls-tree`/`git grep`
> across branches + `Read` on `/tmp/prep/*` and `/home/user/peek-zips/*`. Every claim cites `branch:path`
> with quoted real text. Classification: **CURRENT** = newest live lineage · **DEPLOYED** = what is actually
> serving prod · **OLD/SUPERSEDED** = earlier shape kept for back-compat or replaced.
>
> **The single most important mechanics fact up front:** there are **THREE incompatible "document" shapes**
> in this tree, authored by different chats over four days, and the newest one (studio-vnext / clean-slate,
> 2026-06-04) is a **freeform-HTML `PeekDocument` v2** that is NOT what GROUND-TRUTH §F calls canonical
> (GROUND-TRUTH §F, written 2026-06-02 on gallant-planck, calls **`PeekIR` v1** the canonical document — it
> predates the dual-rep pivot). The renderer gaps GROUND-TRUTH §F lists are **already fixed in the
> gallant-planck `packages/core`** but that branch's structured-IR approach was then **abandoned** in favor of
> the freeform-HTML approach. This conflict is the biggest decision the CTO must resolve.

---

## 0. BRANCH TIMELINE (commit dates — establishes CURRENT vs OLD)

| Branch | Latest commit | What it holds | Class |
|---|---|---|---|
| `atelier-integration` | 2026-05-28 | The **deployed** Next app: Drizzle row tables (`peek_v2`), `vibe` jsonb, 16-tool chat writes current-state rows. | **DEPLOYED** (Netlify builds this → vnext.peek.gift per GROUND-TRUTH §D) |
| `peek-clean` | 2026-05-29 | Same Drizzle schema as atelier-integration, trimmed. | OLD mirror |
| `claude/bold-feynman-SZzaO` | 2026-06-01 | `lib/ir/{contract,schema,ports}.ts` — **`PeekIR` v1** snake_case, the rich `ThemeSpec`/`Concept`/`sections[]` superset. | SUPERSEDED (lifted into core) |
| `claude/gallant-planck-pu51x` | 2026-06-02 | `packages/core` — **event-sourced** `PeekIR` v1 (`decide`→`PeekEvent[]`→`apply`→doc) + pure `render()` + `decidePick()`. The §F "canonical" doc. | SUPERSEDED by studio-vnext (same PeekIR, but the structured-render path was dropped) |
| `claude/studio-vnext` | 2026-06-04 06:21 | `apps/web` — **`PeekDocument` v2 dual-rep** = `{ spine: PeekIR, presentation: { html } }`. The chat authors **freeform tagged HTML**; 7 tools (`set_page`/`edit_region`/…). New `peek_documents` + `peek_picks` tables. | **CURRENT** (newest functional lineage) |
| `claude/clean-slate` | 2026-06-04 10:11 | studio-vnext with comments stripped — **byte-identical runtime + same PeekDocument v2 + same 7 tools**. | **CURRENT** (latest commit overall) |

`/home/user/peek-zips/deployed/public/peek-runtime.js` = a **third, simpler** runtime (the design-seat prototype): `data-peek-*` only, no legacy aliases, no injected sheet/bar fallback. **DEPLOYED-PROTOTYPE**, older than the studio-vnext runtime.

---

## 1. THE CANONICAL ENTITY MODEL (the live `peek_v2` schema)

Source of truth = the Drizzle schema on `atelier-integration:atelier/db/schema/*` (the deployed app), cross-checked
against `/tmp/prep/GROUND-TRUTH.md` §B and `/tmp/prep/REQUIREMENTS_SPEC.md` §9. All 14 tables live in the
`peek_v2` Postgres schema (`atelier-integration:atelier/db/schema/_schema.ts`: `export const peekV2 = pgSchema('peek_v2');`).
RLS on all. Row counts (GROUND-TRUTH §B, MCP 2026-06-02): peeks **50**, cards **33**, variant_groups **10**, events **372**,
chat_messages **380**, usage_ledger **277**, **picks 0**, **webhook_log 0**, collaborators/relationships/affiliate_revenue/tier_config/curator_memory **0**.

### 1.1 `peeks` — the core document (`atelier-integration:atelier/db/schema/peeks.ts`)
The lifecycle-bearing root. 50 live rows.

| Field (db col) | Type | Meaning |
|---|---|---|
| `id` | uuid pk | — |
| `slug` | text **unique notNull** | share/URL key (`/g/<slug>`) |
| `curatorId` (`curator_id`) | text → `users.clerkUserId` | owner (nullable → anon drafts) |
| `recipientName`, `relationship`, `occasion` | text | who/what — the personalization inputs |
| `giverNames` (`giver_names`) | text[] notNull default `'{}'` | the "from" names (group gifts) |
| `budgetCents` (`budget_cents`) | integer (nullable) | **the spending cap** (REQUIREMENTS §4) |
| `recipientProfile` | jsonb `RecipientProfile` notNull default `{}` | `{ favorite_things[], current_obsessions[], allergies_or_no_gos[], sizes{}, notes }` |
| `vibe` | jsonb `Vibe` notNull default `{}` | **the vibe/styles engine home** (see §1.12) |
| `heroImageUrl` / `heroImageSource` / `heroPrompt` | text | hero img (`user_upload\|unsplash\|ai_generated\|external`) + gen prompt |
| `noteMd` | text | the personal note (markdown) |
| `status` | enum `peek_status` notNull default `draft` | **lifecycle**: `draft → ready_for_publish → published → claimed → archived` |
| `stripePaymentIntentId`, `stripeCheckoutSessionId` | text | the $12 publish gate |
| `publishedAt`, `expiresAt` | timestamptz | publish/expiry |
| `shareUrl` | text | the sent link |
| `metadata` | jsonb default `{}` | escape hatch |
| `createdAt`, `updatedAt` | timestamptz default now | — |

`peekStatus` enum verbatim: `['draft','ready_for_publish','published','claimed','archived']`.

### 1.2 `cards` — the items (`atelier-integration:atelier/db/schema/cards.ts`)
33 live rows. `cardType` enum: `['product','activity','aspirational','digital']`.

| Field | Type | Meaning |
|---|---|---|
| `id` | uuid pk | the **stable id the HTML `data-peek-id` joins on** (studio-vnext) |
| `peekId` | uuid → peeks (cascade) | parent |
| `variantGroupId` | uuid → variant_groups (set null) | membership in a pick-one/any/all set |
| `position` | integer notNull default 0 | order (`uniqueIndex(peekId, position)`) |
| `type` | enum `card_type` notNull | product/activity/aspirational/digital |
| `title`, `description`, `imageUrl` | text | display |
| `sourceUrl`, `sourceRetailer` | text | **hidden from recipient** (curator's source) |
| `affiliateUrl` | text | computed at scrape time |
| `affiliateNetwork` | text | `skimlinks\|sovrn\|amazon_associates\|direct` (comment) |
| `commissionPct` | numeric(5,2) | affiliate commission % |
| `valueCents` | integer | **price for cap math** |
| `revealValue` | boolean default false | show the price to the recipient or not |
| `isTaunt` | boolean default false | the "JUST PLACED"/"HA, DENIED" taunt card |
| `tauntText` | text | the taunt copy |
| `isLocked` | boolean default false | gated card |
| `unlockRule` | jsonb `UnlockRule \| {}` notNull default `{}` | **the lock semantics** (see below) |
| `proposedDate`, `locationHint` | timestamptz / text | activity-card fields |
| `addedByUserId` | text → users | which contributor added it (group peeks) |
| `metadata` | jsonb default `{}` | escape hatch |

`UnlockRule` union (db type, `cards.ts`): four kinds —
`{kind:'beg', beg_prompt?}` · `{kind:'date_after', unlock_after}` · `{kind:'event', unlock_after?}` ·
`{kind:'requires_picks', card_ids[]}`. Constant `UNLOCK_RULE_KINDS = ['beg','date_after','event','requires_picks']`.

> **GAP — `source_citations` does NOT exist on `cards`.** REQUIREMENTS_SPEC §4 and GROUND-TRUTH §F both name
> `source_citations` as a card field; the deployed Drizzle `cards.ts` has **no such column** (it has
> `sourceUrl`/`sourceRetailer`, not citations). Citations from `web_search` have no home in the schema. Flag for the CTO.

### 1.3 `variant_groups` — bundles/sets (`cards.ts`, same file)
10 live rows. `variantSelection` enum: `['pick_one','pick_any','pick_all']`.
Fields: `id`, `peekId`→peeks (cascade), `title` notNull, `selection` enum notNull, `position` default 0
(`uniqueIndex(peekId, position)`). This is the variants mechanic (REQUIREMENTS §4).

### 1.4 `picks` — recipient selections (`atelier-integration:atelier/db/schema/picks.ts`)
**0 live rows — the publish→pick→notify loop has never completed (GROUND-TRUTH §B headline).**
Fields: `id`, `peekId`→peeks(cascade), `cardId`→cards(cascade), `pickedAt` default now,
`recipientSignature` (hashed session/claim token), `recipientNote`, **`begMessage`** (if a locked card required a beg),
**`begApprovedAt`** (curator approval ts), `fulfilledAt`, `fulfillmentNotes`. → this is the **beg flow + Tier-1
fulfillment** model (REQUIREMENTS §8).

> **DIVERGENCE:** studio-vnext does **not** write this table. It uses a brand-new `peek_v2.peek_picks` (one
> row per peek, jsonb `picks` array of card-ids) — see §1.13. The Drizzle `picks` table (with beg/fulfillment
> columns) is effectively orphaned by the CURRENT lineage.

### 1.5 `peek_collaborators` (`collaborators.ts`)
0 rows. `collaboratorRole` enum: `['organizer','co_organizer','contributor']`.
Fields: `id`, `peekId`→peeks(cascade), `userId`→users (nullable), `invitedEmail` (pre-signup invite),
`role` enum notNull, `inviteToken` unique, `acceptedAt`, `createdAt`. `unique(peekId, userId)`.
Built, never exercised. REQUIREMENTS §6 flags the *rules* (who edits what, approval flow) as unspecified.

### 1.6 `relationships` (`relationships.ts`)
0 rows. The recurring-nudge graph. Fields: `id`, `userId`→users notNull, `recipientName` notNull,
`relationship`, `birthday` date, `anniversary` date, `lastPeekId`→peeks, `notes`, `createdAt`.
Feeds the `nudge-relationships` Inngest job (currently NOOP per GROUND-TRUTH §A).

### 1.7 `events` (`events.ts`) — the flat telemetry stream
372 rows. `id` bigserial, `ts` default now, `userId`→users (null for anon), `sessionId` (anon),
`peekId`→peeks(set null), **`kind` text notNull** (`'chat_turn','card_added','pick','share','publish',…`),
`payload` jsonb default `{}`. Indexed on ts/userId/peekId/kind.
> **This is NOT event-sourcing.** GROUND-TRUTH §B: "a **flat telemetry stream** … This is **not** the
> event-sourced command→event→state gate the architecture calls for." It is analytics, not the document log.

### 1.8 `usage_ledger` + `tier_config` (`usage.ts`)
`usage_ledger` (277 rows): `id` bigserial, `userId`/`sessionId`/`peekId`, `vendor` notNull, `kind` notNull,
`costCents` notNull default 0, `payload` jsonb, `ts`. Live cost metering (Anthropic Opus/Haiku, fal, ZenRows).
`tier_config` (0 rows): `id` int pk, `config` jsonb default `{}`, `updatedAt`.

### 1.9 `affiliate_revenue` (`affiliate_revenue.ts`)
0 rows. Webhook-fed (Skimlinks/Sovrn). `id`, `network` notNull, `externalTxnId` unique, `cardId`/`pickId`/`peekId`
refs, `reportedAt`, `amountCents`, `commissionCents`, `currency` default `USD`, `status`
(`pending\|confirmed\|reversed`), `rawPayload` jsonb, `createdAt`.

### 1.10 `chat_messages` (`chat_history.ts`)
380 rows. `id` uuid, `peekId`→peeks(cascade) notNull, `role` enum `['user','assistant','tool_result']` notNull,
`content` jsonb notNull, `toolCallId`, `createdAt`. The persisted curator chat.

### 1.11 `webhook_log` / `users` / `curator_memory`
- `webhook_log` (0 rows): `id` bigserial, `source` notNull, `payload` jsonb, `success` boolean notNull, `receivedAt`.
- `users` (3 rows): `clerkUserId` pk, `email`, `displayName`, `avatarUrl`, `tier` notNull default `authenticated`, timestamps. Mirror of Clerk via webhook.
- `curator_memory` (0 rows): composite pk `(clerkUserId, path)`, `content` text, `sizeBytes`, timestamps. The **Anthropic Memory-tool backing store** (path-validated virtual FS). GROUND-TRUTH §E: "Memory-tool path validation burns ~2 tool calls/session."

### 1.12 The `vibe` jsonb sub-model (`peeks.ts` types) — the styles/vibe engine
The deployed vibe is **rich already** (not the "thin palette+font" GROUND-TRUTH §F implies the IR replaces).
`Vibe = VibeCore & { signal_source_history? }`. `VibeCore`:
- `preset?`: `playful\|romantic\|dry\|unhinged\|tender`
- `tone?` string; `palette?` `{bg,surface,ink,accent,accent2?}`; `mood_words?` string[]
- `motion?` `still\|soft\|lively`; `font_pairing?` `{display,body}`
- `typography?` `{heading: serif\|display\|sans\|mono\|script, body: sans\|serif\|mono}`
- `density?` `compact\|cozy\|breathable`; `shape?` `sharp\|soft\|pillowy`; `mood?` `minimal\|rich\|whimsical\|editorial`
- `voice?` `VibeVoice` = `{warmth,humor,pace,formality,emoji,vocabulary,length}` (the chat-voice knobs)
- `signal_source_history?`: `[{source: curator\|hero_palette\|tone_classifier\|card_mix, ts, patch}]` — provenance of vibe edits.

### 1.13 vNext persistence tables (added by studio-vnext / clean-slate, additive)
- `peek_v2.peek_documents` (`studio-vnext:supabase/migrations/20260602120000_vnext_peek_documents.sql`):
  `id text pk, slug text unique, curator_id text, status text default 'draft', doc jsonb notNull, created_at, updated_at`.
  RLS **default-deny, service-role only**. The migration comment: *"vNext document store: one folded PeekIR snapshot
  per peek. Additive to peek_v2 (does not touch the legacy app's tables)… Applied to the live project
  ewqpujqerdnrkjqlpobo via the Supabase connector on 2026-06-02."* — i.e. **this table is LIVE in prod** alongside the
  legacy row tables. The whole `PeekDocument` envelope (spine + presentation.html) is stored in the single `doc` jsonb.
- `peek_v2.peek_picks` (referenced by `studio-vnext:apps/web/lib/persistence/picks.ts`): `peek_id`, `picks` (jsonb
  string[]), `updated_at`, `onConflict: peek_id`. **One row per peek, v1 single-recipient.** Replaces the Drizzle
  `picks` table for the CURRENT lineage (loses the beg/fulfillment columns).

---

## 2. THE COMPETING IR SHAPES (and which is CURRENT)

There are **three** distinct document shapes. They share the same inner `PeekIR` types but wrap/author them entirely differently.

### 2.1 SHAPE A — Deployed row tables + thin `vibe` (OLD, but DEPLOYED)
`atelier-integration` Drizzle schema (§1). There is **no single "document object"** — the app writes
current-state rows (`peeks`+`cards`+`variant_groups`) and a flat `events` stream. The chat exposes 16 tools that
map ~1:1 to write operations. GROUND-TRUTH §F: *"The folded `PeekDocument` will map onto these row tables via
`PersistencePort`."* This is what is **serving prod today**.

### 2.2 SHAPE B — `PeekIR` v1 snake_case (SUPERSEDED; the §F "canonical")
`bold-feynman:lib/ir/contract.ts` and **byte-identical** `gallant-planck:packages/core/src/document/contract.ts`.
The shape (verbatim, contract.ts §7):
```ts
export interface PeekIR {
  schema_version: 1;
  peek: Peek;
  sections: Section[];          // ordered page structure
  variant_groups: VariantGroup[];
  cards: Card[];
}
```
Key facts:
- **snake_case throughout** (`variant_groups`, `value_cents`, `is_taunt`, `unlock_rule`) — mirrors the DB, NOT camelCase Drizzle.
- It is a **SUPERSET MIGRATION** of the deployed shape. Header comment: *"Nothing the current build relies on is
  removed — Card / VariantGroup / Pick are kept verbatim (only the old `image_url: string` becomes `media: MediaSlot`)."*
- It **replaces thin `vibe` with a full `ThemeSpec`** (TypeSystem, Palette, scene/motif/frame, radius/space/motion,
  `loud` shadow/border/texture tokens, `cssVars` escape hatch) and **adds `Concept`** (oneLiner/boldMove/voice/
  emotionalCore/antiPattern — the "anti-generic lock") and **an ordered `sections[]` layer** (18 SectionKinds:
  hero/note/giftgrid/rail/lookbook/gallery/details/stats/lede/steps/countdown/claim/tracklist/courses/tiers/stubs/
  flightplan/custom). `custom` carries model-authored HTML against `--peek-*` vars (sanitized).
- `Card` adds `media: MediaSlot` (vendor-neutral, with a `directive` for the ImageProvider port) and `value_display`
  (DQ-4: "$40–$60"/"—"). `CardType` stays `product\|activity\|aspirational\|digital` (DQ-5).
- This is the shape GROUND-TRUTH §F (2026-06-02, written on gallant-planck) calls **canonical**:
  *"The canonical document is `PeekIR = { schema_version:1, peek, sections[], variant_groups[], cards[] }` … It is sound
  and will be lifted verbatim into `packages/core`."*

### 2.2b SHAPE B' — event-sourced PeekIR (gallant-planck only; the maker-checker gate)
`gallant-planck:packages/core` adds the event-sourcing layer over Shape B (this is the "maker-checker done right"):
- `commands/schema.ts`: **16 commands** `set_concept, set_theme, upsert_section, remove_section, reorder_sections,
  set_note, add_card, update_card, set_card_rule, remove_card, reorder_cards, add_variant_group, generate_hero_image,
  set_hero_media, mark_ready`. Each `{type, payload}` Zod-validated; `parseCommand` returns `Result<Command,CoreError>`.
- `commands/events.ts`: `PeekEvent` union (facts, fully-resolved) — `concept_set, theme_set, note_set, hero_set,
  section_inserted/patched/removed, sections_reordered, card_added/updated/rule_set/removed, cards_reordered,
  variant_group_added, ready_marked`.
- `event-sourcing.ts`: the pure spine — *"A document is the fold of its events. The chat never mutates the document
  directly: it proposes a Command, `decide` validates it … and returns either an Err or the Events it would produce,
  and `apply` folds an Event onto the document. Undo / history / replay fall out of this for free."*
  `decide(doc, command, ctx) → Result<PeekEvent[], CoreError>` (deterministic via injected `ctx.newId`); `apply`
  reduces; `fold`/`replay` rebuild from the log. **`resolve_card` is intentionally NOT a core command** — it is app
  orchestration (resolve via `cardResolver` port, then issue `add_card`).
- This branch **fixes all four §F renderer gaps** (see §5). But it was **abandoned** — studio-vnext discarded the
  structured-render path for freeform HTML.

### 2.3 SHAPE C — `PeekDocument` v2 dual-rep / freeform HTML (CURRENT)
`studio-vnext` and `clean-slate` (`packages/core/src/document/contract.ts` §7.5). The chat **stops authoring a
structured IR** and instead authors a **bespoke HTML page**; the structured spine is *derived* from the HTML tags.
```ts
export interface Presentation {
  html: string;              // the sanitized, model-authored full document — the canonical look
  html_hash: string;         // sha256 of `html` — lockstep/drift check + cache key
  runtime_version: string;   // the peek-runtime.js contract version this HTML targets
  authored_at: ISODate;
}
export interface PeekDocument {
  schema_version: 2;
  spine: PeekIR;             // the canonical commerce/state truth (Shape B verbatim)
  presentation: Presentation | null; // the canonical look; null until HTML is authored
}
```
Contract comment (`studio-vnext:.../contract.ts` §7.5): *"The chat authors a bespoke HTML page for design
caliber; a structured PeekIR 'spine' is derived from its `data-peek-*` tags and kept in lockstep for commerce,
recipient state, and the product graph. The recipient is served `presentation.html` (+ peek-runtime.js); picks /
checkout / caps read `spine`. The two join on the stable card id (the HTML's `data-peek-id === Card.id`).
`presentation` is null for IR-only / fallback pages — then `render(spine)` paints them."*
- **`validatePeekDocument`** (`studio-vnext:.../document/schema.ts`) accepts **both** a v2 envelope **and** a bare v1
  `PeekIR` (legacy rows: `{schema_version:2, spine: ir, presentation: null}`). Back-compat by design.
- **Tools change completely** (`studio-vnext:apps/web/lib/curator/tools.ts`): **7 tools** —
  `set_page` (the whole HTML in one move), `edit_region` (replace one node by selector), `set_style` (append a
  themed `<style>`), `set_media` (drop a resolved url into a slot), `resolve_card` (fuzzy/URL → product), 
  `generate_hero_image`, `publish` (flag ready → $12 checkout). **None of the 16 structured commands survive.**
- The spine is derived by `studio-vnext:apps/web/lib/curator/extract.ts` (`extractSpine(html) → {cards, variant_groups,
  budgetCents, issues}`), which reads the same `data-peek-*` tags the runtime enforces (see §3).

**WHICH IS CURRENT:** **Shape C (studio-vnext / clean-slate, 2026-06-04)** is the newest functioning lineage and is
the one with a complete app (`apps/web` with curator/pick/publish/stripe routes). `clean-slate` is the latest commit
(comment-stripped Shape C). **Shape A is what is deployed to prod.** **Shape B/B' (gallant-planck) is the §F-blessed
"canonical" but was superseded by C.** GROUND-TRUTH §F is therefore **partly stale**: it calls PeekIR v1 the canonical
document, but the team pivoted to the freeform-HTML PeekDocument v2 two days later. **This is the central IR conflict
the CTO must resolve: structured-IR-render (B') vs freeform-HTML-with-derived-spine (C).**

> Re the prompt's "freeform-HTML `presentation.html`": there is **no file literally named `presentation.html`** in any
> branch (verified). The "presentation.html" is the **`Presentation.html` string field** inside the `PeekDocument` v2
> envelope (Shape C), authored by `set_page`, stored in `peek_documents.doc`, sanitized by `apps/web/lib/sanitize.ts`,
> served to the recipient alongside `peek-runtime.js`.

---

## 3. THE FULL `data-peek-*` INTERACTION CONTRACT

Two runtimes implement this. The **CURRENT** one is `studio-vnext:apps/web/public/peek-runtime.js` (≡
`clean-slate` runtime, byte-identical logic). The **DEPLOYED-PROTOTYPE** one is
`/home/user/peek-zips/deployed/public/peek-runtime.js` (simpler). The model is taught the contract in
`studio-vnext:apps/web/lib/curator/system-prompt.ts` §"THE INTERACTION CONTRACT"; the spine extractor
(`extract.ts`) reads the same tags so behavior and spine cannot drift. Below = **every attribute → behavior → CSS state**.

### 3.1 Card declaration
| Attribute | Behavior | CSS/state |
|---|---|---|
| `data-peek-card` (CURRENT also matches legacy `data-card`) | Marks a claimable item. The runtime's `CARD = "[data-peek-card],[data-card]"`. Tapping a card (that has no `[data-opt]` children and isn't locked) opens the bottom sheet. | — |
| `data-peek-id` | The **stable id** state is keyed by. If absent, runtime stamps it from `data-name` or an autoincrement (`"c"+uid`). **Join key: HTML `data-peek-id === Card.id`** (extract.ts links spine↔HTML). | — |
| `data-name` | Card label; shown in sheet + order summary; fallback id source. | — |
| `data-price` | Number (regex-stripped to digits/dot). `0` or absent = **Free**. Feeds `priceOf(card)` → order total + tab. | — |
| `data-src` | Source/retailer label shown in the sheet. | — |
| `data-desc` | Sheet body copy. | — |
| `data-kind` | `product\|wrapped\|custom\|experience\|taunt\|digital` (authoring vocab). Recorded in the order item. extract.ts folds via `KIND_MAP` to core `CardType` (wrapped→product, custom→product+`metadata.homemade`, experience→activity, taunt→aspirational+`is_taunt=true`, digital→digital); raw kind preserved on `Card.metadata.kind`. | — |

### 3.2 Selection / variant rules
| Attribute | Behavior | CSS/state |
|---|---|---|
| `data-group="<g>"` + `data-rule="pick-one"` | **Single-select within the group.** On pick, runtime deletes the previous `groupSel[g]` from the order and unmarks it (`pick()`: `if (on && pickOne){ prev=groupSel[group]; if(prev&&prev!==id){delete order[prev]; markCard(...,false)} groupSel[group]=id }`). | host sets `data-peek-picked` on the new card, removes it from the prior |
| `data-opt` (sub-option inside a card; each with `data-price`, `data-label`) | The card itself is the pick-one unit; tapping an option toggles it, copies its `data-price` onto the card, and picks/unpicks the card. Click handler `e.stopPropagation()` so the card's own open-sheet doesn't fire. | host toggles `.sel` on the chosen `[data-opt]`; cards with any `[data-opt]` never open the sheet |
| `data-rule="pick-any"` | Runtime treats as default multi-select (only `pick-one` is special-cased in JS). **`pick-any`/`pick-all` are spine-level semantics** enforced server-side by `decidePick`, not in the runtime (extract.ts comment: *"The runtime only acts on 'pick-one'"*). | — |

### 3.3 The shared tab / budget thermometer
| Attribute | Behavior | CSS/state |
|---|---|---|
| `data-budget="250"` | On the order region. Dollars → the shared pool. `budget()` reads it; extract.ts → `budgetCents`. `0`/absent = no cap shown. | — |
| `data-peek-tab` | The meter container. | host toggles `.over` class when `total > budget` |
| `data-peek-tab-amount` | Text set to `"$<left> left"` or `"$<over> over"`. | — |
| `data-peek-tab-fill` | `style.width = min(100, total/budget*100)%` — the draining bar. | — |
| `data-peek-tab-msg` | `"$X over — swap or drop a paid pick."` / `"Nothing picked yet."` / `"<n> picked · $<t> of $<B>."` | — |

### 3.4 Locks / unlock-after
| Attribute | Behavior | CSS/state |
|---|---|---|
| `data-locked` (CURRENT also accepts `.locked` class) | Card is **not pickable** until unlocked. `isLocked()` = has `data-locked`/`.locked` AND not `.unlocked` AND `data-peek-unlocked !== "1"`. Tapping a locked card does nothing (returns early). | model styles the locked veil |
| `data-unlock="after:<token>"` | When ANY card is picked, runtime builds a token `"<kind>\|<group>\|<id>"` and unlocks every `[data-unlock]` whose `after:` substring is contained in it (`maybeUnlock`: `if (m && token.indexOf(m[1]) !== -1)`). So `<token>` can match a kind, a group, or a card id (loose substring match). | host adds `.unlocked` class + sets `data-peek-unlocked="1"`; model styles the unlock reveal |

> Note: the runtime's `data-unlock` is **only the "pick X to unlock Y" mechanic** (the spine's
> `UnlockRule.kind:'requires_picks'`/`'event'`). The other db unlock kinds (`beg`, `date_after`) are **not** enforced
> by the runtime — `beg` is the recipient-message flow (picks.begMessage/begApprovedAt), `date_after` is time-based.
> Those live server-side, not in the host JS.

### 3.5 Picked state, sheet, sticky bar, CTA
| Attribute | Behavior | CSS/state |
|---|---|---|
| `data-peek-picked` | **Host-set** on a chosen card (`markCard`). The model styles `[data-peek-picked]` for the selected look. (CURRENT also toggles legacy `.chosen-on` for compatibility.) | the contract's one stateful hook the author styles |
| `data-peek-sheet` (or `.sheet`) | The bottom sheet. CURRENT: if absent, **runtime injects a themed fallback sheet** (reads `--peek-surface`/`--peek-accent`). Sub-slots: `data-peek-sheet-src/-name/-desc/-price/-pick`, `data-close-sheet`. | `.open` class drives the slide-up |
| `data-peek-sheet-pick` (`.sh-pick`) | "Add to my order" / "Remove from order" — toggles the current sheet card's pick, then closes. | — |
| `data-peek-bar` (or `.mbar`) | Sticky order bar. CURRENT: **injected if absent**; CTA label is mode-aware (`recipient`→"Send my picks", else "Publish · $12"). Sub-slots `data-peek-bar-k/-v` (or legacy `#mbarK/#mbarV/.k/.v`). Shown via IntersectionObserver on `#top`/`header`/first card (`rootMargin:"-40% 0px 0px 0px"`). | `.show` class drives visibility |
| `data-peek-action="publish\|claim\|rsvp\|share"` | The primary CTA. Calls `cfg.onAction(type, {items,total,budget})`. | — |
| `data-peek-reveal` (or `.rv`) | Scroll-reveal via IntersectionObserver (threshold 0.12). | host adds `.in`; model animates from `.in` |

### 3.6 The host config & rescan contract
`window.__PEEK__ = { mode:"preview"|"recipient", onAction(type, summary), rescan() }` is set before load. The runtime is
**event-delegated at document level** so `edit_region` patches (replaced nodes) stay interactive with no re-init; state
survives because it's keyed by `data-peek-id`. `window.__PEEK__.rescan()` re-wires reveals + refreshes the meter after a patch.

### 3.7 DEPLOYED-PROTOTYPE runtime differences (`/home/user/peek-zips/deployed/public/peek-runtime.js`)
Older/simpler. Differences vs CURRENT: matches **`[data-peek-card]` only** (no `data-card` legacy alias);
**does NOT inject** a fallback sheet or bar (`openSheet` falls back to `pick(card)` if no `[data-peek-sheet]` present);
`onAction` signature is **`onAction({type, mode, items, total, budget})`** (single object) vs CURRENT's
**`onAction(type, {items,total,budget})`** (two args) — a real signature drift between the two runtimes;
the picked attribute and reveal/bar mechanics are otherwise the same. Mark this as a contract-version mismatch the CTO
should unify (the `runtime_version` field on `Presentation` exists precisely to track this).

---

## 4. THE RULES ENGINE SEMANTICS (`gallant-planck:packages/core/src/picks/engine.ts`)

The server-side pure selection engine — *"the recipient side of the maker-checker, and the product's genuinely
defensible mechanic … the recipient surface and the server both run this, so the client preview and the
server-validated pick can never disagree."* `decidePick(doc, current, {type:'toggle', cardId}, caps?) → Result<PickResult, CoreError>`.

**Guard order (early returns):**
1. card not found → `NOT_FOUND`.
2. `card.is_taunt` → `FORBIDDEN` ("a taunt card can't be picked").
3. `card.is_locked` → `FORBIDDEN` ("card X is locked"). *(Note: the engine treats a locked card as simply
   unselectable; the beg/date/event unlocking happens outside the engine.)*

**Variant-group toggle math** (on the resulting `Set` of picked ids):
- `pick_one` (radio): delete every group member, then add this card if it wasn't already picked.
- `pick_all` (the bundle moves as one): if all members currently picked → delete all; else add all.
- `pick_any` (checkbox) / no group: plain toggle of this card.

**Caps / thermometer:**
- `committedCents` = sum of `value_cents` over picked cards **excluding taunts** and excluding null prices.
- `caps.hardCents`: if `committedCents > hardCents` → **`INVARIANT` error** (the pick is **blocked**), with
  `{committedCents, hardCents}` detail.
- `caps.softCents`: if exceeded → `overSoftCap: true` returned (the pick **succeeds, with a warning** — the
  thermometer goes "over").
- Returns `{ picks: [...].sort(), committedCents, overSoftCap }` — deterministic (sorted), no IO/clock/random.

**Server wiring (`studio-vnext:apps/web/app/api/pick/route.ts`):** loads the spine by slug, loads current picks from
`peek_picks`, runs `decidePick`, persists the new array, returns `{picks, committedCents, overSoftCap}`. On engine err
returns HTTP **409** with `{error, code}`. **NB:** the route calls `decidePick` **without passing `caps`** — so the
hard/soft cap enforcement is **not wired** in studio-vnext's pick route (the engine supports it, the API doesn't supply
budget→caps). The client-side thermometer (runtime §3.3) is purely visual; the server doesn't yet enforce the cap.
**Gap to flag.**

**The 16-tool→command→event→state gate (gallant-planck only):** chat tool call → `commandFromTool(name,input)` →
`parseCommand` (Zod) → `decide(doc, cmd, ctx)` → `PeekEvent[]` → `apply` fold → new `PeekIR`. Malformed AI output
bounces at `parseCommand`/`decide` with a typed `CoreError`, never corrupting the document. This is the maker-checker.
**studio-vnext/clean-slate do NOT use this** — they author HTML directly and derive the spine post-hoc via `extractSpine`,
so the only "checker" on the CURRENT path is `sanitizeHtml` (DOMPurify) + `extractSpine`'s `issues[]` (warn/error), not a
command-validation gate.

**Service ports (`gallant-planck:packages/core/src/ports/ports.ts`)** — the typed boundary the engine/IR sit behind
(framework-agnostic; *"core depends on contracts, never on a process.env read"*). `PortResult<T>` = `{ok:true}&T | {ok:false,error,retryable?}`.
13 ports in the `Ports` registry: `llm, productSource, research, cardResolver, image, persistence, payment, auth, email,
analytics, moderation, storage, botGate`. Notable: `CardResolverPort` is a **data-ordered cascade**
(`DEFAULT_RESOLVER_ORDER = ['retailer_api','url_scrape','research']`, `makeCardResolver` iterates and returns the first
tier that yields a card, tagged `via`); `PersistencePort` = `load/save/appendVersion/bySlug` (the version-history hook for
the event log); `PaymentPort.createCheckout({peekId, amount_cents, kind:'publish'|'contribution'})`.

---

## 5. THE RENDERER GAPS (GROUND-TRUTH §F) — status per branch

GROUND-TRUTH §F lists four gaps "confirmed with file:line evidence and scheduled." **All four are FIXED on
`gallant-planck:packages/core`** (the structured-render path) — but that path was superseded by the freeform-HTML
Shape C, where these gaps **do not apply the same way** (the model authors the grouped control / glow / itinerary
directly in HTML). Status:

1. **variant_groups render as flat tiles** (`VariantGroup.selection` stored but never read at render).
   → **FIXED on gallant-planck** (`render.ts` `groupCards()`): cards are grouped by `variant_group_id` into
   `CardGroupView[]` with `selection` surfaced, so the surface can render a rule-aware grouped control. Render comment:
   *"gap-a: cards are GROUPED by variant_group with the selection rule surfaced."* → On Shape C the model authors the
   group control in HTML (`data-group`+`data-rule`), and the runtime enforces `pick-one` (§3.2), so the *behavior* gap
   is closed differently; the visual grouping is the author's responsibility.

2. **glow never reaches the hero headline** (`--peek-display-shadow` hardcoded to `'none'` unless `loud.displayShadow`).
   → **FIXED on gallant-planck** (`theme/tokens.ts` `toTokens`): *"GAP-C FIX: `palette.glow: true` now produces a
   headline glow via `--peek-display-shadow`."* The code now: explicit `loud.displayShadow` wins (with
   accent/accent2/ink keyword expansion); else if `palette.glow` → `displayShadow = "0 0 24px <accent@55%>"`; else none.
   `--peek-display-shadow` emits `t.displayShadow || "none"`. → On Shape C the author writes the glow in CSS directly.

3. **stats / lede unauthorable** (in IR+Zod+renderer but absent from the tool's `SECTION_KINDS` enum).
   → **FIXED on gallant-planck** (`commands/inputs.ts`, comment line ~46: *"so stats/lede are authorable here even
   though the legacy tool enum omitted them"*). The `upsert_section` input now accepts the full SectionKind set incl.
   stats/lede. → On Shape C there is no SectionKind enum at all (HTML is freeform), so the gap is moot.

4. **itinerary** (activity cards render like products; only a `flightplan` section, no dedicated itinerary shape).
   → **FIXED on gallant-planck** (`render.ts` `buildItinerary()`): activity cards are derived into an ordered
   `ItineraryStepView[]` (cardId/title/description/date/place, sorted by date). Render comment: *"gap-b: activity cards
   are derived into an ordered itinerary."* → On Shape C the author lays out the itinerary in HTML.

**The meta-gap for the CTO:** the §F fixes were all done in the **structured-IR renderer (gallant-planck)** that the
team then **walked away from**. In the CURRENT freeform-HTML lineage (studio-vnext/clean-slate) there is **no
`render(PeekIR)` in the hot path for authored pages** — `presentation.html` IS the render, and `render(spine)` is only
the **fallback** when `presentation` is null. So the §F gaps are "fixed" in a path that may not ship. The real renderer
truth now is: *does the model author beautiful enough HTML, and does `sanitizeHtml` + `extractSpine` keep the spine in
lockstep?* (The aesthetic-quality gate REQUIREMENTS §14 names as the moat is still net-new.)

---

## 6. CROSS-SHAPE MAPPING & DRIFT RISKS (the lockstep that must hold)

| Concept | Shape A (deployed Drizzle, camelCase) | Shape B/B' (PeekIR v1, snake_case) | Shape C (PeekDocument v2) |
|---|---|---|---|
| Document root | `peeks` row + `cards`/`variant_groups` rows + `events` stream | `{schema_version:1, peek, sections[], variant_groups[], cards[]}` | `{schema_version:2, spine:PeekIR, presentation:{html,...}\|null}` |
| Look/theme | `peeks.vibe` jsonb (rich VibeCore) | `peek.theme: ThemeSpec` (replaces vibe) | spine.peek.theme + authored CSS in presentation.html |
| Hero | `heroImageUrl`/`heroImageSource`/`heroPrompt` (3 cols) | `peek.hero: MediaSlot` | same as B in spine; `<img>` in HTML |
| Card image | `cards.imageUrl: text` | `Card.media: MediaSlot` (with directive) | derived; `<img src>` in HTML |
| Price (human) | — | `Card.value_display` (DQ-4) | — (derived) |
| Page structure | none (implicit) | `sections: Section[]` (18 kinds) | the HTML itself (no sections) |
| Concept | none | `Concept` (anti-generic lock) | none in derived spine (lives in HTML/prompt) |
| Persistence | row tables | `PersistencePort` (planned) | `peek_documents.doc` jsonb + `peek_picks` |
| Picks | `picks` table (beg/fulfillment cols) | `Pick` type (verbatim from A) | `peek_picks` jsonb array (loses beg/fulfillment) |

**Drift risks the CTO should know:** (a) **camelCase Drizzle vs snake_case IR** — the IR mirrors the DB *column names*
not the Drizzle field names, so any ORM-to-IR mapper must translate; (b) **`source_citations` named in specs but
absent from `cards`** (§1.2); (c) **two `picks` representations** (`picks` table vs `peek_picks` jsonb) — the rich
beg/fulfillment columns are dropped in C; (d) **two runtime versions with a different `onAction` signature** (§3.7);
(e) **caps not enforced server-side** in C's pick route (§4); (f) GROUND-TRUTH §F's "canonical PeekIR" claim is **stale**
relative to the C pivot.

---

## 7. PROVENANCE (every file mined)

- `/tmp/prep/GROUND-TRUTH.md` (Read) · `/tmp/prep/REQUIREMENTS_SPEC.md` (Read)
- `/home/user/peek-zips/deployed/public/peek-runtime.js` (Read — DEPLOYED-PROTOTYPE runtime)
- `atelier-integration:atelier/db/schema/{_schema,peeks,cards,picks,collaborators,relationships,events,affiliate_revenue,usage,curator_memory,webhook_log,users,chat_history}.ts` (DEPLOYED schema)
- `claude/bold-feynman-SZzaO:lib/ir/contract.ts` (PeekIR v1)
- `claude/gallant-planck-pu51x:packages/core/src/{document/contract.ts, document/index.ts, commands/{events,schema,decide,inputs}.ts, event-sourcing.ts, picks/engine.ts, render/render.ts, theme/tokens.ts, ports/ports.ts}` · `tests/fixtures/el-taquito.ir.json`
- `claude/studio-vnext:{supabase/migrations/20260602120000_vnext_peek_documents.sql, packages/core/src/document/{contract,schema}.ts, apps/web/public/peek-runtime.js, apps/web/lib/{persistence/store.ts, persistence/picks.ts, curator/extract.ts, curator/tools.ts, curator/system-prompt.ts, sanitize.ts}, apps/web/app/api/{pick,publish}/route.ts}` (CURRENT)
- `claude/clean-slate:{packages/core/src/document/contract.ts, apps/web/lib/curator/tools.ts, apps/web/public/peek-runtime.js}` (CURRENT, comment-stripped — confirmed runtime byte-identical to studio-vnext, same v2 envelope, same 7 tools)
