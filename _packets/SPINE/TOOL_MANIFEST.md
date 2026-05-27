# TOOL_MANIFEST — every tool Peek can call

The levers Peek pulls to mutate the page mid-stream. Each tool here is one call away from a visible page change OR a side-effect on a vendor surface (Stripe, Clerk, Deepgram, etc.). Cross-refs: `CURATOR_PROMPT.md` (§"The shape of the work" — which tool gets called when, §"Hard rules" — when NOT to call), `CAPABILITY_INVENTORY.md` §A1 (the agentic tool-use surface) + §H6 (suggestion sidebar UI), `SLUG_MODEL.ts` (the canonical model every tool reads/mutates), and the `skills/` bundle (per-surface playbooks).

Every tool listed here MUST be registered in `atelier/lib/anthropic/tools/bootstrap.ts` to be callable. If a tool isn't in `bootstrap.ts`, it's a paper-spec — Peek will hallucinate the name and get back `Unknown tool: <name>`. Workers shipping new tools MUST add their import to bootstrap.

**Status legend** (mirror CAPABILITY_INVENTORY):

- ✅ WIRED — registered in bootstrap, handler implemented, returning real values
- 🟡 PARTIAL — registered but with documented gaps (see notes)
- 🔴 KEYED-NOT-USED — vendor configured, no tool implementation yet
- 💡 NET-NEW — proposed, no implementation, requires a packet

**Schemas:** the existing 13 use the canonical zod schemas in `atelier/lib/anthropic/tools/*.ts`. Net-new tools use the proposed shape documented inline below — implementation packet ships final schema, this doc is the spec.

**Naming:** snake_case for all tool names + input keys. Mirrors Anthropic's recommendation and the existing 13. Don't slip into camelCase for new tools.

---

## Existing tools (13, from packet 11)

### `ping`

- **Vendor:** none (in-process)
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/ping.ts`)
- **Input schema:** `z.object({}).strict()` — no input
- **Output:** `{ pong: true, at: string /* ISO timestamp */ }`
- **Side effect:** none
- **When to call:** ONLY when explicitly testing tool-use wiring. Never call as part of a real chat turn.
- **Errors:** none — always succeeds.
- **Cross-refs:** none.

### `set_recipient`

- **Vendor:** Supabase (writes to `peek_v2.peeks` recipient_* columns)
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/set_recipient.ts`)
- **Input schema:**
  ```
  z.object({
    recipient_name: z.string().min(1).max(120),
    relationship: z.string().min(1).max(120).optional(),
    occasion: z.string().min(1).max(120).optional(),
    giver_names: z.array(z.string().min(1).max(120)).max(20).optional(),
    budget_cents: z.number().int().nonnegative().max(100_000_000).optional(),
  }).strict()
  ```
- **Output:** `{ ok: true, recipient_name, relationship, occasion, giver_names, budget_cents }` or `{ ok: false, error: 'moderation_block', user_message }`
- **Side effect:** `peeks.recipient_name`, `peeks.relationship`, `peeks.occasion`, `peeks.giver_names`, `peeks.budget_cents` updated. Runs Anthropic moderation on the assembled string first.
- **When to call:** First-time recipient info arrives OR significant update. CURATOR_PROMPT §"The shape of the work" #1 — THE FIRST THING YOU ASK.
- **Errors:** `moderation_block` (sexual/violent content surfaced; surface user_message and pivot the conversation), peek not found (throws, surfaces as 500).
- **Cross-refs:** SLUG_MODEL.ts RecipientSchema + OccasionSchema.

### `set_recipient_profile`

- **Vendor:** Supabase (writes `peek_v2.peeks.recipient_profile` jsonb)
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/set_recipient_profile.ts`)
- **Input schema:**
  ```
  z.object({
    favorite_things: z.array(z.string().min(1).max(200)).max(50).optional(),
    current_obsessions: z.array(z.string().min(1).max(200)).max(50).optional(),
    allergies_or_no_gos: z.array(z.string().min(1).max(200)).max(50).optional(),
    sizes: z.record(z.string(), z.string()).optional(),
    notes: z.string().max(2000).optional(),
  }).strict()
  ```
- **Output:** `{ ok: true, recipient_profile: RecipientProfile }`
- **Side effect:** merge-updates `peeks.recipient_profile`. Hidden from the recipient — curator scratchpad only.
- **When to call:** As facts surface in chat ("she's vegan / she has a cat / she's a size 7"). Eager — don't wait for batches.
- **Errors:** peek not found (throws).
- **Cross-refs:** SLUG_MODEL.ts RecipientProfileSchema.

### `set_vibe`

- **Vendor:** Supabase (writes `peek_v2.peeks.vibe` jsonb)
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/set_vibe.ts`)
- **Input schema:** Big — see `VibeInputSchema` in the source. Includes `preset` (playful/romantic/dry/unhinged/tender), `tone` text, `palette` (hex bg/surface/ink/accent[/accent2]), `mood_words[]`, `motion` (still/soft/lively), `font_pairing` {display, body}, `typography` {heading: serif/display/sans/mono/script, body: sans/serif/mono}, `density` (compact/cozy/breathable), `shape` (sharp/soft/pillowy), `mood` (minimal/rich/whimsical/editorial), `voice` (warmth/humor/pace/formality/emoji/vocabulary/length sub-enums per skills/vibe-direction.md).
- **Output:** `{ ok: true, vibe: StoredVibe }`
- **Side effect:** REPLACES `peeks.vibe` entirely. Tracks `vibe_evolved` PostHog event.
- **When to call:** Once early when you have a clear read. Use `update_vibe` for refinements.
- **Errors:** schema mismatch (zod throws → surfaces as tool error).
- **Cross-refs:** SLUG_MODEL.ts VibeSchema + skills/vibe-direction.md.

### `update_vibe`

- **Vendor:** Supabase
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/update_vibe.ts`)
- **Input schema:** Same shape as `set_vibe` PLUS `signal_source` enum (`curator` | `hero_palette` | `tone_classifier` | `card_mix`) — defaults `curator`.
- **Output:** `{ ok: true, vibe: Vibe }` (with `signal_source_history` appended)
- **Side effect:** MERGE-updates `peeks.vibe` — provided fields overwrite, absent fields preserved. Pushes a `signal_source_history` entry (capped at 10). Tracks `vibe_evolved`.
- **When to call:** Continuously as signals arrive — palette extracted from hero, card mix changes the read, curator pivots tone. Most common vibe mutation.
- **Errors:** peek not found (throws).
- **Cross-refs:** skills/vibe-direction.md §"Signal sources."

### `set_hero_image`

- **Vendor:** Supabase + (background) palette extraction via `scheduleEvolveVibe`
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/set_hero_image.ts`)
- **Input schema:**
  ```
  z.object({
    image_url: z.string().url(),
    source: z.enum(['user_upload', 'unsplash', 'ai_generated', 'external']),
  }).strict()
  ```
- **Output:** `{ ok: true, image_url, source }`
- **Side effect:** Updates `peeks.hero_image_url` + `peeks.hero_image_source`. Inserts `events` row (`kind: palette_extract_scheduled`). Schedules background `evolveVibe` job that re-fires `update_vibe` with extracted palette.
- **When to call:** Curator uploaded a photo, dropped a URL, picked an Unsplash result — anything that has a real URL ready. For prompts → use `generate_hero_image`.
- **Errors:** peek not found (throws).
- **Cross-refs:** SLUG_MODEL.ts HeroSchema + skills/image-direction.md.

### `generate_hero_image`

- **Vendor:** fal.ai (Flux schnell) + Supabase (re-hosts after gen)
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/generate_hero_image.ts`)
- **Input schema:**
  ```
  z.object({
    prompt: z.string().min(3).max(2000),
    aspect: z.enum(['16:9', '4:3', '1:1', '9:16']).optional(),
  }).strict()
  ```
- **Output:** `{ ok: true, image_url: string | null, fallback_suggestion?: string }` (returns `image_url: null + fallback_suggestion` if fal is offline — Peek then asks for upload or pivots) OR `{ ok: false, error, suggestion? }`
- **Side effect:** Hits fal.ai. Updates `peeks.hero_image_url`, `peeks.hero_image_source = 'ai_generated'`, `peeks.hero_prompt`. Inserts `events` (`kind: hero_image_generated`). Schedules background re-host to Supabase Storage (`peek-v2-assets/hero/{peekId}/...`) so the durable URL replaces the fal.ai expiring URL. Records usage via `recordUsageFireAndForget` (vendor: 'fal', kind: 'fal-ai/flux/schnell').
- **When to call:** Curator described a scene without a URL OR no upload offered. Server enriches the prompt with vibe palette + recipient + occasion via `buildHeroPrompt` — keep the prompt focused on subject + feel; don't repeat styling boilerplate.
- **Errors:** rate-limit (returns `image_url: null` + suggestion to upload). Soft-fail by design — never leaves the page heroless.
- **Cross-refs:** SLUG_MODEL.ts HeroSchema + skills/image-direction.md + CAPABILITY_INVENTORY §E3.

### `set_note`

- **Vendor:** Supabase + (background) `scheduleEvolveVibe`
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/set_note.ts`)
- **Input schema:**
  ```
  z.object({ note_md: z.string().min(1).max(5000) }).strict()
  ```
- **Output:** `{ ok: true, note_md }` or `{ ok: false, error: 'moderation_block', user_message }`
- **Side effect:** Updates `peeks.note_md`. Runs Anthropic moderation. Schedules background vibe refinement (notes feed tone signal).
- **When to call:** Once you have something concrete IN THE CURATOR'S VOICE. The note is the emotional core (CURATOR_PROMPT §5) — propose drafts, let the curator edit, save when it sounds like them. Use Extended Thinking on hard ones (CAPABILITY_INVENTORY §A5).
- **Errors:** `moderation_block` (rewrite + retry); peek not found.
- **Cross-refs:** SLUG_MODEL.ts NoteSchema.

### `add_variant_group`

- **Vendor:** Supabase
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/add_variant_group.ts`)
- **Input schema:**
  ```
  z.object({
    title: z.string().min(1).max(120),
    selection: z.enum(['pick_one', 'pick_any', 'pick_all']),
  }).strict()
  ```
- **Output:** `{ ok: true, variant_group_id: string }`
- **Side effect:** Inserts row in `variant_groups`. Auto-assigns `position` (max+1).
- **When to call:** Before `add_card` when you want sibling alternatives (colors, sizes, dinner options) OR a bundle that must move together. Pass returned id to `add_card` as `variant_group_id`.
- **Errors:** peek not found.
- **Cross-refs:** SLUG_MODEL.ts VariantGroupSchema + skills/rules-engine-patterns.md §1.

### `add_card`

- **Vendor:** Supabase + (inline scrape) ZenRows / Browserbase / Jina + (inline wrap) Skimlinks/Sovrn affiliate
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/add_card.ts`)
- **Input schema:** Big — see source. Discriminated by `type` (product/activity/aspirational/digital), plus title (required), description, image_url, source_url (auto-scrape + auto-wrap), source_retailer, value_cents, reveal_value, variant_group_id, proposed_date (ISO, activity), location_hint, is_taunt + taunt_text, is_locked + unlock_rule (discriminated by kind: beg | date_after | event | requires_picks).
- **Output:** `{ ok: true, card_id, position }` or `{ ok: false, error: 'moderation_block', user_message }`
- **Side effect:** Inserts `cards` row. Auto-assigns position. If `source_url` set + no `image_url`: runs inline scrape pipeline, populates image + description + price + retailer from result. Wraps `source_url` through `wrapAffiliateLink()` with `peekId:cardId` customId for click attribution. Updates `peeks.updated_at`. Tracks `card_added` PostHog event. Schedules vibe re-evaluation against recent card mix.
- **When to call:** Whenever you have a concrete card to put on the page. Pull from `web_search` (specific products), `affiliate_search` (categories), `scrape_url` (curator-supplied links), or curator's direct description.
- **Errors:** `moderation_block` (title/description/taunt_text flagged); peek not found; insert race (rare).
- **Cross-refs:** SLUG_MODEL.ts CardSchema (discriminated) + skills/rules-engine-patterns.md + skills/affiliate-strategy.md §4.

### `update_card`

- **Vendor:** Supabase + (re-wrap) affiliate
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/update_card.ts`)
- **Input schema:** Same union as `add_card` plus required `card_id: uuid()`. All fields optional; `null` clears nullable fields.
- **Output:** `{ ok: true, card_id }` or `{ ok: false, error: 'moderation_block', user_message }`
- **Side effect:** Patches `cards` row (only provided fields). If `source_url` set: re-runs `wrapAffiliateLink()` with refined `peekId:cardId` customId. Re-runs moderation if title/description/taunt_text touched.
- **When to call:** Refining (swap image, fix title, change unlock_rule, toggle reveal_value, re-bind to variant group) — preferred over `remove_card` + `add_card`.
- **Errors:** `moderation_block`; card not found in peek; schema mismatch.
- **Cross-refs:** SLUG_MODEL.ts CardSchema.

### `remove_card`

- **Vendor:** Supabase
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/remove_card.ts`)
- **Input schema:** `z.object({ card_id: z.string().uuid() }).strict()`
- **Output:** `{ ok: true }` (idempotent — removing a missing card returns ok)
- **Side effect:** Deletes `cards` row. Cascades to `picks` (via ON DELETE CASCADE on the FK).
- **When to call:** Curator says "drop that one." Prefer `update_card` for refinement.
- **Errors:** none expected.
- **Cross-refs:** none.

### `reorder_cards`

- **Vendor:** Supabase
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/reorder_cards.ts`)
- **Input schema:** `z.object({ card_ids: z.array(z.string().uuid()).min(1).max(200) }).strict()`
- **Output:** `{ ok: true, updated: number }`
- **Side effect:** Updates `cards.position` to match the array order (first id = position 0). Two-phase update (negate positions first, then set) to avoid unique-index conflicts.
- **When to call:** Curator wants the page sorted differently. Include EVERY card you want positioned to avoid stragglers.
- **Errors:** ids that don't belong to the peek are silently ignored.
- **Cross-refs:** none.

### `scrape_url`

- **Vendor:** ZenRows (primary) / Browserbase (broken — M13) / Jina (M12 — proposed) / web fetch
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/scrape_url.ts`)
- **Input schema:** `z.object({ url: z.string().url() }).strict()`
- **Output:** `{ ok: true, card_id, title, image_url, description, provider, degraded, affiliate_url?, affiliate_network? }` or `{ ok: false, error }`
- **Side effect:** Runs scrape pipeline (cascades Browserbase → ZenRows → Jina). Inserts a `cards` row of type `product` with whatever the scrape returned. Wraps the URL through `wrapAffiliateLink()` once with `peekId`, then RE-wraps with `peekId:cardId` post-insert. Tracks `scrape_url_requested` + `scrape_complete`. Stores `metadata.scrape_provider` + `metadata.scrape_degraded` on the card.
- **When to call:** Curator dropped a URL — anywhere in the message. Don't ask permission; scrape and let the pipeline hydrate. Check `degraded` — if true, ask for a screenshot.
- **Errors:** all providers returned not-ok (rare; pipeline always returns SOMETHING — even a domain stub).
- **Cross-refs:** skills/affiliate-strategy.md §1 + §4.

### `mark_ready_for_publish`

- **Vendor:** Supabase (writes `peeks.metadata.markedReadyAt`)
- **Status:** ✅ WIRED (`atelier/lib/anthropic/tools/mark_ready_for_publish.ts`) — B16 fixed
- **Input schema:** `z.object({}).strict()` — no input
- **Output:** Union — see source. `{ ok: true, next_step: 'paywall', already_ready?: boolean }` on success; `{ ok: false, error: 'preconditions_failed' | 'already_published' | 'not_found', missing?, user_message, share_url? }` on rejection.
- **Side effect:** Server-side precondition check: requires recipient_name + note + hero + vibe.preset + ≥1 non-taunt card. If preconditions pass: atomically sets `peeks.metadata.markedReadyAt = nowISO` (via `jsonb_set`). Tracks `peek_marked_ready`. Idempotent.
- **When to call:** Curator confirms they're done. Surface preconditions_failed errors as concrete asks ("still need a hero — got a photo or want me to generate one?").
- **Errors:** `preconditions_failed` (list of missing fields), `already_published` (already live; share existing URL), `not_found`.
- **Cross-refs:** SLUG_MODEL.ts PeekStatusSchema (note ready_for_publish derived state) + skills/rules-engine-patterns.md §8 + BUGS B16.

---

## NET-NEW tools (Tier 0)

The 15 tools per CURATOR_PROMPT §"the tool list mentioned in §A1." Each needs an implementation packet. Listed in dispatch order roughly mirroring CAPABILITY_INVENTORY §I Tier 0.

### `affiliate_search` — 💡 NET-NEW

- **Vendor:** Skimlinks Merchant API (primary) + Sovrn Commerce API (fallback), catalog search only — read-only.
- **Status:** 💡 NET-NEW (proposed `atelier/lib/anthropic/tools/affiliate_search.ts`). Implementation depends on packet 42 (CAPABILITY_INVENTORY §K).
- **Input schema:**
  ```
  z.object({
    query: z.string().min(2).max(200),
    category_hint: z.enum([
      'apparel', 'home', 'kitchen', 'beauty', 'outdoor', 'books',
      'tech', 'kids', 'jewelry', 'fragrance', 'pet', 'sports',
      'food_and_drink', 'art', 'wellness',
    ]).optional(),
    price_floor_cents: z.number().int().nonnegative().optional(),
    price_ceiling_cents: z.number().int().nonnegative().optional(),
    max_results: z.number().int().min(1).max(5).default(3),
    prefer_network: z.enum(['skimlinks', 'sovrn', 'any']).default('any'),
  }).strict()
  ```
- **Output:** `{ ok: true, results: Array<{ title, description, image_url, source_url, source_retailer, value_cents, network, affiliate_url, commission_pct_estimate, confidence: 'high'|'medium'|'low' }> }` or `{ ok: false, error: 'affiliate_not_configured' | 'no_results' | 'degraded' }`
- **Side effect:** None (read-only). Results render in the curator-side suggestion sidebar deck (per CAPABILITY_INVENTORY §H6 + skills/affiliate-strategy.md §6). The transition `suggestion → card` happens via a SEPARATE `add_card` call (drag-drop in UI OR curator "add this one"). Wraps each `source_url` through `wrapAffiliateLink()` with `peekId`-only customId — re-wrap with `peekId:cardId` happens inside `add_card`.
- **When to call:** Curator names a product CATEGORY ("coffee gift", "outdoor gear"). NOT for specific named products — those go to `web_search` (decisive) or this tool (exploratory). NEVER for activities/restaurants/events (use `place_search_v2`).
- **Errors:** `affiliate_not_configured` (no Skimlinks/Sovrn keys — fall through to `web_search`); `no_results` (Peek proposes manually or asks one clarifying Q); `degraded` (one network timed out, partial results returned).
- **Cross-refs:** skills/affiliate-strategy.md §2 + CAPABILITY_INVENTORY §E7+§E8 + §H6.

### `place_search_v2` — 💡 NET-NEW (replaces older `place_search`)

- **Vendor:** Viator + OpenTable + Ticketmaster + (optional) TripAdvisor/GetYourGuide. **Not Google Places** — Frank dropped, address autosuggest covered by Stripe Address Element (C20).
- **Status:** 💡 NET-NEW. Implementation in packet adjacent to 42.
- **Input schema:**
  ```
  z.object({
    query: z.string().min(2).max(200),
    kind: z.enum(['restaurant', 'tour', 'experience', 'event', 'hotel', 'unspecified']).default('unspecified'),
    location_hint: z.string().max(200).optional(),
    proposed_date: z.string().datetime().optional(),
    max_results: z.number().int().min(1).max(5).default(3),
  }).strict()
  ```
- **Output:** `{ ok: true, results: Array<{ title, description, image_url, source_url, source_retailer, location_hint, proposed_date_suggested, value_cents, network: 'viator' | 'opentable' | 'ticketmaster' | 'tripadvisor' | 'getyourguide' | 'direct', affiliate_url, commission_pct_estimate, confidence }> }` or `{ ok: false, error }`
- **Side effect:** None (read-only). Same flow as `affiliate_search` — results render in suggestion deck; `add_card` (type='activity') is the insertion path.
- **When to call:** Curator names an activity / restaurant / event / venue. "Dinner at Carbone" → OpenTable. "Wine tour in Sonoma" → Viator. "Hamilton tickets" → Ticketmaster.
- **Errors:** rate-limited per vendor, kind-mismatched (curator asked for restaurant but only Ticketmaster results came back).
- **Cross-refs:** skills/affiliate-strategy.md §1 + CAPABILITY_INVENTORY §G4-G6.

### `web_search` — 💡 NET-NEW (Anthropic server-side tool)

- **Vendor:** Anthropic (server-side `web_search` per CAPABILITY_INVENTORY §A9). 30 req/sec ceiling.
- **Status:** 💡 NET-NEW. No custom handler — this is enabled at the Anthropic API level (`tools: [{ type: 'web_search_20250125' }]` or similar). Documented here for Peek's awareness.
- **Input schema:** Anthropic-native shape (model emits search queries; server runs and returns results).
- **Output:** Anthropic-native result objects (title, snippet, URL, source).
- **Side effect:** None.
- **When to call:** Specific product named ("Stanley Quencher H2.0"), price/availability check, fact-finding for aspirational cards (Ferrari specs, etc.). Decisive — when curator knows what they want.
- **Errors:** rate-limited (Peek waits + retries server-side); empty results (Peek pivots to `affiliate_search`).
- **Cross-refs:** skills/affiliate-strategy.md §1 + CAPABILITY_INVENTORY §A9 + §A11 (Citations).

### `set_countdown` — 💡 NET-NEW

- **Vendor:** Supabase
- **Status:** 💡 NET-NEW (proposed `atelier/lib/anthropic/tools/set_countdown.ts`)
- **Input schema:**
  ```
  z.object({
    target_iso: z.string().datetime(),
    label: z.string().min(1).max(120).optional(),
    visible: z.boolean().default(true),
  }).strict()
  ```
- **Output:** `{ ok: true, target_iso, label, visible }`
- **Side effect:** Writes `peeks.metadata.countdown` jsonb (target_iso + label + visible). Also patches `peeks.occasion.date_iso` IF unset — the countdown date IS the occasion date in 99% of cases. The recipient-page countdown UI reads from SlugModel.countdown.
- **When to call:** Curator confirmed a date (birthday on the 30th, wedding on June 14, anniversary). One per peek. Update with another call.
- **Errors:** target_iso in the past (curator probably mistyped; Peek confirms in chat).
- **Cross-refs:** SLUG_MODEL.ts CountdownSchema + CURATOR_PROMPT §8.

### `set_rules_template` — 💡 NET-NEW

- **Vendor:** Supabase + (re-routes to existing tools `add_card`/`update_card`/`add_variant_group`) for the actual lock + group composition.
- **Status:** 💡 NET-NEW. Implementation packet wires this as an ORCHESTRATOR — applies a named pattern from skills/rules-engine-patterns.md §2 by composing existing tool calls. The tool itself is a recorder of intent; the multi-mutation happens via the existing 13.
- **Input schema:**
  ```
  z.object({
    pattern: z.enum([
      'shoes_dinners_ferrari',
      'pick_everything_unless_afternoon',
      'wedding_registry_counter_propose',
      'escalator',
      'surprise_with_roast',
      'vintage_tee_chaos',
      'cheap_and_cheerful_plus_one_luxury',
      'all_of_these_no_choice',
      'event_locked_finale',
      'custom',
    ]),
    // Pattern-specific config — see skills/rules-engine-patterns.md §2 for
    // each pattern's required fields. Pass as object; tool validates per
    // pattern.
    config: z.record(z.string(), z.unknown()).optional(),
  }).strict()
  ```
- **Output:** `{ ok: true, pattern, applied_mutations: Array<{ tool, input, result }> }` (a log of the sub-tool calls Peek made) or `{ ok: false, error: 'pattern_requires_cards' | 'pattern_invalid_config' | 'partial_failure', user_message }`
- **Side effect:** Writes `peeks.metadata.rules_pattern = pattern`. Executes the pattern's composition by calling the existing 13 tools internally (server-side; not via Anthropic). For example, `shoes_dinners_ferrari` requires curator's already-added 3 shoes + 2 restaurants + 1 ferrari (validated first), then issues two `add_variant_group` calls + four `update_card` calls binding shoes/restaurants into groups + a `update_card` flipping `is_taunt` on the Ferrari.
- **When to call:** Once the curator has the raw cards on the page and you propose a pattern (per skills/rules-engine-patterns.md §3). Confirm pattern name with curator before firing.
- **Errors:** `pattern_requires_cards` (curator hasn't added enough cards yet — Peek narrates: "need 3 sneakers first, two restaurants next"); `pattern_invalid_config` (pattern needs unlock_after that wasn't supplied); `partial_failure` (some sub-mutations failed — surfaced as ROLLBACK or kept partial per packet design).
- **Cross-refs:** SLUG_MODEL.ts RulesPatternNameSchema + skills/rules-engine-patterns.md (full pattern catalog).

### `unlock_event` — 💡 NET-NEW

- **Vendor:** Supabase
- **Status:** 💡 NET-NEW. Pairs with the proposed `cards.unlock_event_fired_at` column (per skills/rules-engine-patterns.md §7).
- **Input schema:** `z.object({ card_id: z.string().uuid() }).strict()`
- **Output:** `{ ok: true, card_id, fired_at }`
- **Side effect:** Sets `cards.unlock_event_fired_at = now()` on a card with `unlock_rule.kind === 'event'`. Server-side pick route (per `app/api/pick/route.ts:164-165`) updates to check this column BEFORE returning `unlock_event_pending`.
- **When to call:** Curator manually fires an event-locked card from the post-publish dashboard ("the ceremony's over → open the honeymoon card now"). Peek mode shifts post-publish — see CURATOR_PROMPT §"After publish."
- **Errors:** card not found in peek; card not event-locked; peek not published.
- **Cross-refs:** SLUG_MODEL.ts EventUnlockSchema + skills/rules-engine-patterns.md §7.

### `propose_checkout` — 💡 NET-NEW

- **Vendor:** Stripe (Payment Element via Checkout Session, automatic_tax + adaptive_pricing on per CAPABILITY_INVENTORY §C)
- **Status:** 💡 NET-NEW. Implementation packet 45 (CAPABILITY_INVENTORY §K).
- **Input schema:**
  ```
  z.object({
    coupon_code: z.string().min(1).max(80).optional(),
  }).strict()
  ```
- **Output:** `{ ok: true, checkout_session_id, payment_url, expires_at }` or `{ ok: false, error: 'peek_not_ready_for_publish' | 'already_paid' | 'stripe_error', user_message }`
- **Side effect:** Creates a Stripe Checkout Session for the $12 publish fee (or $0.50 with `THISISTHEONE`). Stores `peeks.stripe_checkout_session_id`. Surfaces the Payment Element in the curator UI (the UI listens for the tool_result, opens the modal). Webhook flips `peeks.status = 'published'` + sets `peeks.published_at` on success.
- **When to call:** ONLY after `mark_ready_for_publish` returned ok. The bookend — CURATOR_PROMPT §11 + §"Closing the build."
- **Errors:** `peek_not_ready_for_publish` (mark_ready never called or returned preconditions_failed); `already_paid` (idempotent — Peek says "this one's live, want a new peek?"); `stripe_error` (rare — Stripe API down).
- **Cross-refs:** SLUG_MODEL.ts CheckoutSchema + CAPABILITY_INVENTORY §C.

### `propose_payment_method` — 💡 NET-NEW

- **Vendor:** Stripe (Payment Element supports all account-enabled methods automatically)
- **Status:** 💡 NET-NEW. Mostly a UI hint tool — Stripe Payment Element auto-renders enabled methods; this tool just SUGGESTS one in chat ("want to use Apple Pay? or Klarna for split-pay?").
- **Input schema:**
  ```
  z.object({
    method: z.enum([
      'apple_pay', 'google_pay', 'link', 'klarna', 'afterpay', 'affirm',
      'cashapp', 'ach', 'card',
    ]),
  }).strict()
  ```
- **Output:** `{ ok: true, method, surfaced: true }`
- **Side effect:** Tracks `payment_method_proposed` PostHog event. The actual rendering is in the Payment Element (no further mutation).
- **When to call:** Curator says "can I split this?" → suggest Klarna/Afterpay/Affirm. "Is Apple Pay an option?" → confirm yes. This tool is the conversational handoff; Stripe renders the actual method.
- **Errors:** none.
- **Cross-refs:** CAPABILITY_INVENTORY §C4-C7.

### `propose_subscription` — 💡 NET-NEW (Tier 1)

- **Vendor:** Stripe Subscriptions (per CAPABILITY_INVENTORY §C11)
- **Status:** 💡 NET-NEW Tier 1. Defer until recurring-gifts product surface designed.
- **Input schema:**
  ```
  z.object({
    cadence: z.enum(['monthly', 'quarterly', 'annual']),
    duration_months: z.number().int().min(1).max(60).optional(),
  }).strict()
  ```
- **Output:** `{ ok: true, subscription_session_id, payment_url }` or error.
- **Side effect:** Creates Stripe Subscription Schedule for recurring peeks ("give Mom a monthly peek for a year"). Tier 1; deferred per CAPABILITY_INVENTORY.
- **When to call:** Curator explicitly asks for recurring ("can I do this every month?"). Don't propose unprompted.
- **Errors:** Tier 1 — implementation packet defines.
- **Cross-refs:** CAPABILITY_INVENTORY §C11.

### `share_pack_generate` — 💡 NET-NEW

- **Vendor:** Anthropic Batch API (per CAPABILITY_INVENTORY §A12) + Inngest (fan-out per §E11) + Resend (email template) + Supabase Storage (asset hosting)
- **Status:** 💡 NET-NEW. Implementation packet 48 (CAPABILITY_INVENTORY §K).
- **Input schema:**
  ```
  z.object({
    platforms: z.array(z.enum([
      'og', 'ig_story', 'twitter', 'facebook',
      'whatsapp', 'sms', 'email',
    ])).optional(), // default = all 7
    force_regenerate: z.boolean().default(false),
  }).strict()
  ```
- **Output:** `{ ok: true, share_pack: Array<SharePackVariant> }` or `{ ok: false, error: 'peek_not_published' | 'pack_generating', user_message }`
- **Side effect:** On first call post-publish: emits `peek.published` Inngest event → fan-out → Batch API job per platform → results land in `peek_share_packs` table (proposed). Subsequent calls: idempotent — returns existing pack. `force_regenerate: true` is Tier 2 (re-vibe).
- **When to call:** Auto-fires on publish via webhook (NOT via Peek). Peek calls it on-demand post-publish when curator asks "give me the Instagram one" — the call retrieves the pre-generated variant.
- **Errors:** `peek_not_published` (Peek says "publish first"); `pack_generating` (Peek says "give it a sec, batch is running").
- **Cross-refs:** SLUG_MODEL.ts ShareSchema + SharePackVariantSchema + skills/share-mechanics.md (entire doc).

### `invite_cocurator` — 💡 NET-NEW (Tier 1)

- **Vendor:** Clerk Organizations (per CAPABILITY_INVENTORY §B7+§B8) + Resend (invitation email)
- **Status:** 💡 NET-NEW Tier 1. Defer per CAPABILITY_INVENTORY §H5.
- **Input schema:**
  ```
  z.object({
    email: z.string().email(),
    role: z.enum(['co_organizer', 'contributor']).default('contributor'),
    message: z.string().max(500).optional(),
  }).strict()
  ```
- **Output:** `{ ok: true, invite_token, invite_url }` or `{ ok: false, error: 'org_not_created' | 'invite_failed' | 'already_member', user_message }`
- **Side effect:** Creates Clerk org for the peek if not exists (one org per peek). Issues Clerk invitation to email + role. Inserts `peek_collaborators` row with `invite_token`. Sends Resend email with magic-link to accept.
- **When to call:** Curator explicitly asks ("invite my sister to help") OR group-gift signal ("we're pooling for this"). Defer most flows to Tier 1.
- **Errors:** `org_not_created` (Clerk not provisioned for orgs); `already_member` (idempotent); `invite_failed` (Resend down).
- **Cross-refs:** SLUG_MODEL.ts CollabSchema + skills/curator-protocol.md (TBD on collab UX).

### `request_voice_capture` — 💡 NET-NEW

- **Vendor:** Browser MediaRecorder + Deepgram (STT) per CAPABILITY_INVENTORY §F1 + §F3
- **Status:** 💡 NET-NEW. Implementation packet 43.
- **Input schema:**
  ```
  z.object({
    purpose: z.enum([
      'curator_voice_clone',    // 30s sample for ElevenLabs cloning (voice-camera §9)
      'voice_note_card',        // attach voice to a digital card
      'voice_mode_toggle',      // open mic for voice-mode chat input
    ]),
  }).strict()
  ```
- **Output:** `{ ok: true, capture_requested: true }`
- **Side effect:** Surfaces the mic UI in the chat surface. The actual capture happens in the browser; subsequent message from the user (transcript) is what Peek processes next turn.
- **When to call:** Curator implicitly opted in (per skills/voice-camera-protocol.md §6 — typing fragmentation on mobile) OR explicitly asked. NEVER auto-flip into voice mode without curator initiation per §1.
- **Errors:** none — the UI surface owns permission errors.
- **Cross-refs:** skills/voice-camera-protocol.md §1+§3+§9.

### `request_camera_capture` — 💡 NET-NEW

- **Vendor:** Browser MediaRecorder + (downstream) Vision (Anthropic A3 per CAPABILITY_INVENTORY) + Supabase Storage (per §D4)
- **Status:** 💡 NET-NEW. Implementation packet 44.
- **Input schema:**
  ```
  z.object({
    purpose: z.enum([
      'hero_candidate',         // photo as signal for the hero
      'curator_selfie_note',    // selfie for the note card avatar
      'inspiration_photo',      // general signal for cards / vibe
    ]),
  }).strict()
  ```
- **Output:** `{ ok: true, capture_requested: true }`
- **Side effect:** Surfaces the camera UI in the `+` menu. Curator captures → upload to Supabase Storage → URL returned via subsequent user message + Vision call.
- **When to call:** Curator says "let me take a photo of..." OR Peek proactively suggests for vibe extraction ("got a photo of her place? I can pull colors").
- **Errors:** none — UI surface owns.
- **Cross-refs:** skills/voice-camera-protocol.md §3.

### `set_reaction_capture_consent` — 💡 NET-NEW

- **Vendor:** Supabase
- **Status:** 💡 NET-NEW. Pairs with `peeks.recipient_reaction_consent_disabled` column (proposed in skills/share-mechanics.md §4).
- **Input schema:** `z.object({ disabled: z.boolean() }).strict()`
- **Output:** `{ ok: true, disabled }`
- **Side effect:** Sets `peeks.recipient_reaction_consent_disabled`. When `true`, recipient-side reveal page does NOT surface the capture button.
- **When to call:** Curator says "don't let her record a reaction" / sensitive occasion (condolence — default `disabled: true` per skills/share-mechanics.md §4).
- **Errors:** none.
- **Cross-refs:** SLUG_MODEL.ts ShareSchema + skills/voice-camera-protocol.md §4 + skills/share-mechanics.md §4.

### `transcribe_chunk` — 🟡 SYSTEM PRIMITIVE (NOT a tool)

- **Vendor:** Deepgram (streaming WebSocket STT)
- **Status:** Documented here so Peek/workers don't confuse it for a tool. Deepgram STT runs as a system primitive — the browser streams audio to a server WebSocket relay → Deepgram returns partial + final transcripts → final transcript becomes the next user message into the chat route. There is no Anthropic-side `transcribe_chunk` tool call; Peek never invokes this directly.
- **Why documented:** the CURATOR_PROMPT spec mentions it. If implementation later promotes it to a tool (e.g. for explicit re-transcription of a stored audio file), the spec would be `z.object({ audio_url: z.string().url() }).strict()` → `{ ok: true, transcript, confidence, language }`.
- **Cross-refs:** CAPABILITY_INVENTORY §F1 + skills/voice-camera-protocol.md §2+§5.

### `set_song_card` — 💡 NET-NEW (Tier 1)

- **Vendor:** Spotify Web API (per CAPABILITY_INVENTORY §G1) — free OAuth. Adds a digital card with embedded Spotify player.
- **Status:** 💡 NET-NEW Tier 1.
- **Input schema:**
  ```
  z.object({
    spotify_track_id: z.string().min(1).max(64).optional(),
    query: z.string().min(2).max(200).optional(), // search if no id
    variant_group_id: z.string().uuid().optional(),
    is_locked: z.boolean().optional(),
    unlock_rule: /* same shape as add_card */,
  }).strict().refine(x => x.spotify_track_id || x.query, 'need id or query')
  ```
- **Output:** `{ ok: true, card_id, spotify_track_id, title, artist, image_url, preview_url }` or `{ ok: false, error: 'no_match' | 'spotify_unavailable', user_message }`
- **Side effect:** Calls Spotify Search API if `query` supplied, picks top match. Inserts `cards` row with `type: 'digital'`, populates title/description/image_url from track metadata, stores `metadata.digital_kind = 'spotify_song'` + `metadata.spotify_track_id`.
- **When to call:** Curator mentions a song / artist as a card ("her favorite is Taylor Swift" → search T.S. top match OR ask which song).
- **Errors:** `no_match` (zero results); `spotify_unavailable` (API down — fall back to manual card via `add_card`).
- **Cross-refs:** SLUG_MODEL.ts DigitalCardSchema.

### `set_movie_card` — 💡 NET-NEW (Tier 1)

- **Vendor:** TMDB (per CAPABILITY_INVENTORY §G7) — free API.
- **Status:** 💡 NET-NEW Tier 1.
- **Input schema:**
  ```
  z.object({
    tmdb_id: z.number().int().positive().optional(),
    query: z.string().min(2).max(200).optional(),
    variant_group_id: z.string().uuid().optional(),
  }).strict().refine(x => x.tmdb_id || x.query, 'need id or query')
  ```
- **Output:** `{ ok: true, card_id, tmdb_id, title, year, runtime_min, image_url, overview, watch_links }`
- **Side effect:** Calls TMDB search if `query` supplied. Inserts digital card. Stores `metadata.digital_kind = 'tmdb_movie'` + `metadata.tmdb_id`. Watch links (Apple TV, Prime, etc.) wrapped through `wrapAffiliateLink` where eligible (e.g. Apple Services Performance Partners per CAPABILITY_INVENTORY §G3g).
- **When to call:** Curator references a movie/TV show ("she loves The Notebook").
- **Errors:** `no_match` (zero results); `tmdb_unavailable`.
- **Cross-refs:** SLUG_MODEL.ts DigitalCardSchema.

### `set_youtube_card` — 💡 NET-NEW (Tier 1)

- **Vendor:** YouTube oEmbed (per CAPABILITY_INVENTORY §G8) — free.
- **Status:** 💡 NET-NEW Tier 1.
- **Input schema:**
  ```
  z.object({
    youtube_url: z.string().url(),
    variant_group_id: z.string().uuid().optional(),
  }).strict()
  ```
- **Output:** `{ ok: true, card_id, video_id, title, channel, image_url, duration_sec }`
- **Side effect:** Calls YouTube oEmbed. Inserts digital card. Stores `metadata.digital_kind = 'youtube_video'` + `metadata.youtube_id`.
- **When to call:** Curator drops a YouTube link OR mentions a video they want embedded.
- **Errors:** `invalid_url`, `oembed_unavailable`.
- **Cross-refs:** SLUG_MODEL.ts DigitalCardSchema.

### `attach_files_api_ref` — 💡 NET-NEW

- **Vendor:** Anthropic Files API (per CAPABILITY_INVENTORY §A8)
- **Status:** 💡 NET-NEW. Implementation packet 41.
- **Input schema:**
  ```
  z.object({
    file_id: z.string().min(1).max(120),
    purpose: z.enum([
      'hero_candidate_album',     // 10-photo album for hero auto-selection
      'recipient_voice_memo',     // long voice memo to embed
      'recipient_pdf',            // PDF wishlist from recipient
      'inspiration_doc',          // moodboard PDF, planning doc
    ]),
  }).strict()
  ```
- **Output:** `{ ok: true, file_id, purpose, attached_at }`
- **Side effect:** Records the file_id in `peeks.metadata.files_api_refs[]` (array of `{ file_id, purpose, attached_at }`). Subsequent chat turns include the file as a content block via Anthropic Files API reference. Vision-eligible files (images, PDFs) auto-feed Vision.
- **When to call:** Curator uploaded something big via the `+` menu's "File" path. Peek references it on subsequent turns by `file_id` rather than re-uploading.
- **Errors:** `file_not_found` (Files API returned 404); `quota_exceeded`.
- **Cross-refs:** CAPABILITY_INVENTORY §A8.

### `set_curator_memory` — 💡 NET-NEW

- **Vendor:** Anthropic Memory tool (per CAPABILITY_INVENTORY §A7) + Supabase (`curator_memory` table proposed)
- **Status:** 💡 NET-NEW. Implementation packet 41.
- **Input schema:**
  ```
  z.object({
    key: z.string().min(1).max(120),    // e.g. 'family_graph.sister.name'
    value: z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.unknown()), z.record(z.unknown())]),
    // Soft TTL — defaults to never. Curator memory IS the long-tail.
    expires_at: z.string().datetime().optional(),
  }).strict()
  ```
- **Output:** `{ ok: true, key, value }`
- **Side effect:** Writes to `curator_memory` table keyed by `(clerk_user_id, key)`. Subsequent sessions load memory into the system prompt's `{curator_memory}` interpolation per CURATOR_PROMPT §"Context."
- **When to call:** A new durable fact about the curator emerges that should persist across peeks. "Mom's name is Diana, birthday March 14." "Sister Hannah, allergic to nuts." "Wife and I anniversary Aug 14, prefer warm-romantic vibes." Don't store every signal — store what would change a NEXT peek.
- **Errors:** `memory_unavailable` (Memory tool API down); `unauthorized` (anon curator — fail silently, no point storing).
- **Cross-refs:** CAPABILITY_INVENTORY §A7.

### `share_to_social` — 💡 NET-NEW (Tier 2)

- **Vendor:** Ayrshare OR Buffer (per CAPABILITY_INVENTORY §G11)
- **Status:** 💡 NET-NEW Tier 2. Behind feature flag `social_outbound_enabled`.
- **Input schema:**
  ```
  z.object({
    platform: z.enum(['instagram_story', 'instagram_feed', 'pinterest', 'tiktok', 'facebook']),
    confirm: z.literal(true),  // non-skippable
  }).strict()
  ```
- **Output:** `{ ok: true, post_id, post_url }` or `{ ok: false, error: 'not_connected' | 'platform_unsupported' | 'rate_limited', user_message }`
- **Side effect:** POSTs to Ayrshare/Buffer endpoint. Posts to curator's connected social account. Curator must have OAuthed the platform via Ayrshare's hosted flow first.
- **When to call:** Curator explicitly asks ("post this to my Instagram story"). NEVER auto-post on publish per skills/share-mechanics.md §6 anti-patterns.
- **Errors:** `not_connected` (curator hasn't OAuthed — Peek says "connect IG in settings first"); `platform_unsupported` (e.g. TikTok needs manual download).
- **Cross-refs:** skills/share-mechanics.md §6.

### `request_extended_thinking` — 💡 NET-NEW (system primitive, not a tool)

- **Vendor:** Anthropic (per CAPABILITY_INVENTORY §A5)
- **Status:** 💡 NET-NEW. Strictly speaking, NOT a tool — it's a `thinking: { type: 'enabled', budget_tokens: N }` parameter on the next `messages.create` call. Documented here so workers know the surface exists.
- **When Peek "calls" it:** Conceptually, Peek flags a turn as deserving extended thinking. The chat route detects (via a sentinel in Peek's last message OR a specific tool-result signal) and re-issues the next call with thinking enabled. Specifically: drafting the personal note (CURATOR_PROMPT §5), designing tricky rules trees, disambiguating recipient profile from conflicting signals.
- **Anti-pattern:** NEVER in voice mode (per skills/voice-camera-protocol.md §2 — kills latency).
- **Cross-refs:** CAPABILITY_INVENTORY §A5.

---

## Tool routing summary

| Tool | Vendor(s) | Implementing packet |
|---|---|---|
| `ping` | none | packet 11 ✅ |
| `set_recipient` | Supabase | packet 11 ✅ |
| `set_recipient_profile` | Supabase | packet 11 ✅ |
| `set_vibe` / `update_vibe` | Supabase | packet 11 ✅ |
| `set_hero_image` | Supabase | packet 11 ✅ |
| `generate_hero_image` | fal.ai + Supabase Storage | packet 11 ✅ (rehost packet 22) |
| `set_note` | Supabase | packet 11 ✅ |
| `add_variant_group` / `add_card` / `update_card` / `remove_card` / `reorder_cards` | Supabase + Skimlinks/Sovrn (wrap) + ZenRows (scrape) | packet 11 + 24 ✅ |
| `scrape_url` | ZenRows + Skimlinks/Sovrn | packet 11 + 22 ✅ |
| `mark_ready_for_publish` | Supabase | packet 11 + Wave 1.5 B16 ✅ |
| `affiliate_search` | Skimlinks + Sovrn | packet 42 (proposed) |
| `place_search_v2` | Viator + OpenTable + Ticketmaster | packet 42 / Tier 1 fan-out |
| `web_search` | Anthropic native | packet 41 (Anthropic surface expansion) |
| `set_countdown` | Supabase | packet 42 |
| `set_rules_template` | Supabase (orchestrator over existing tools) | packet 42 |
| `unlock_event` | Supabase + post-publish dashboard | follow-up to packet 42 |
| `propose_checkout` | Stripe | packet 45 |
| `propose_payment_method` | Stripe (Payment Element) | packet 45 |
| `propose_subscription` | Stripe Subscriptions | Tier 1 |
| `share_pack_generate` | Anthropic Batch + Inngest + Resend + Supabase Storage | packet 48 |
| `invite_cocurator` | Clerk Orgs + Resend | Tier 1 |
| `request_voice_capture` | Browser + Deepgram | packet 43 |
| `request_camera_capture` | Browser + Vision + Supabase Storage | packet 44 |
| `set_reaction_capture_consent` | Supabase | packet 44 |
| `transcribe_chunk` | Deepgram (system primitive) | packet 43 |
| `set_song_card` | Spotify API | Tier 1 |
| `set_movie_card` | TMDB | Tier 1 |
| `set_youtube_card` | YouTube oEmbed | Tier 1 |
| `attach_files_api_ref` | Anthropic Files API | packet 41 |
| `set_curator_memory` | Anthropic Memory + Supabase | packet 41 |
| `share_to_social` | Ayrshare/Buffer | Tier 2 |
| `request_extended_thinking` | Anthropic (system primitive) | packet 41 |

Total: 13 existing ✅ + 18 net-new = **31 tools/primitives** on the spine. (CURATOR_PROMPT mentions "13 + ~15" — close. The additional surface here covers Tier 1 song/movie/YouTube cards + Tier 2 social outbound + a couple system primitives, all flagged.)

---

## Anti-patterns

What NEVER to do with tools — patterns Peek must avoid. Mirrors the anti-pattern sections in CURATOR_PROMPT §"Hard rules", skills/affiliate-strategy.md §7, skills/rules-engine-patterns.md §8, skills/share-mechanics.md §8, skills/voice-camera-protocol.md.

### Never call a tool just to "show you can"

Every tool call mutates a vendor or a row. If the move isn't real, don't call. `ping` exists specifically because Peek must NEVER use any other tool as a heartbeat.

### Never batch unrelated tools in one turn

Tool calls within a turn can fire in parallel (per skills/voice-camera-protocol.md §2 — `affiliate_search` + `set_vibe` can co-fire). But batching 5+ unrelated mutations (`set_recipient` + `set_vibe` + `add_card` + `add_card` + `set_note` + `mark_ready_for_publish`) is wrong. The curator's signal isn't there yet. One question, one move per turn (CURATOR_PROMPT §"How you talk").

### Never bypass `mark_ready_for_publish` server-side validation

The server enforces preconditions (per BUGS B16). If Peek tries to fast-path to checkout via `propose_checkout` without `mark_ready_for_publish` returning ok, `propose_checkout` returns `peek_not_ready_for_publish`. Don't paper over the gate — Peek's job is to GET the curator to ready, not work around it.

### Never wrap affiliate URLs more than once

`wrapAffiliateLink` exactly once per source URL, at the moment of card insert. The re-wrap with `peekId:cardId` (in `add_card.ts:252-261` and `scrape_url.ts:99-108`) operates on the ORIGINAL URL, not the wrapped one. Workers writing new card-insertion tools (`set_song_card`, `set_movie_card`, etc.) MUST follow this pattern. Wrapping twice produces a Skimlinks-of-a-Skimlinks URL that no merchant pixel recognizes.

### Never expose retailer / affiliate branding to the recipient

The slug model has `affiliate_network`, `affiliate_url`, `source_retailer`, `commission_pct` — none of these flow to the recipient page. The render layer reads `title`, `description`, `image_url`, `value_cents` (gated by `reveal_value`). Curators see retailer name for trust ("Stanley"); recipients see only the card. Per skills/affiliate-strategy.md §7 — "the cards feel like the sender's gift, not Amazon's wishlist."

### Never call `affiliate_search` for activities/restaurants/events

Use `place_search_v2`. Skimlinks doesn't have restaurant listings; you'll get back wrong-category junk.

### Never call `web_search` when `scrape_url` works

Curator pasted a URL → scrape that URL. Don't re-search around it to find a "better" link. Curator's judgment > Peek's fact-finding. Only fall back to `web_search` when the scrape returns `degraded: true` AND the curator can't provide a screenshot.

### Never call `affiliate_search` repeatedly for the same category

One call per category per session, unless curator pivots categories. Refining within a category = clarify in chat first, then ONE refined call. Over-searching burns Anthropic web-tool quota (30 req/sec — easy to hit).

### Never auto-add highest-commission result

`affiliate_search` returns suggestions. The transition to a card is the curator's move (drag-drop OR explicit "add this one"). Per skills/affiliate-strategy.md §7 — FIT > commission. The exception: curator explicitly said "just add the best one" in their prior message.

### Never set locks the curator hasn't approved

`set_rules_template` and `add_card` with `is_locked: true` require the curator's affirmative. Peek PROPOSES; curator confirms; Peek fires. Locks added silently are the worst kind of surprise. Per skills/rules-engine-patterns.md §8.

### Never set rules for occasions where they don't fit

`set_rules_template` for condolence / bereavement / baby shower / retirement-with-older-recipient → push back. Locks read as gatekeepy on these. Per skills/rules-engine-patterns.md §8 anti-patterns.

### Never auto-post to social on publish

`share_pack_generate` runs on publish (auto via Inngest fan-out). `share_to_social` is ALWAYS curator-initiated with a confirm modal. Generation ≠ distribution. Per skills/share-mechanics.md §8.1.

### Never trigger `request_voice_capture` more than once per session unprompted

Per skills/voice-camera-protocol.md §6 — one soft offer per session. If the curator passes, don't re-suggest.

### Never use Extended Thinking in voice mode

Per skills/voice-camera-protocol.md §2 — kills the sub-1.5s latency target. Note drafting and other slow-thinking tasks switch to text mode first OR fire an explicit "give me a sec" message that opens the latency budget.

### Never call `propose_checkout` mid-build

It's the bookend. Only after `mark_ready_for_publish` returns ok AND the curator confirms ("ready to publish"). Per CURATOR_PROMPT §"Closing the build."

### Never narrate tool calls verbatim

Per CURATOR_PROMPT §"Peek would never say" — DON'T say "I have created a card titled 'Stanley Cup' with value $35." The page shows it. Narrate the INTENT ("added the Stanley — keeping it or swap?"), not the mechanics.

### Never call tools that aren't in `bootstrap.ts`

Peek hallucinating a non-registered tool name returns `Unknown tool: <name>`. Worker packets shipping new tools MUST add the import to `atelier/lib/anthropic/tools/bootstrap.ts` alphabetically.

### Never assume `peek.metadata` is durable for cross-version data

`peeks.metadata` is the catch-all for unmigrated state (countdown.label, rules_pattern, files_api_refs, reaction_consent_disabled, markedReadyAt). Each of these has a planned promotion to a real column (see follow-up migrations in skills/share-mechanics.md §4 + rules-engine-patterns.md §6/§7). Workers reading metadata should fall back gracefully when the key is absent.

### Never call `set_curator_memory` for anon curators

`clerk_user_id` is null pre-signup; the write fails silently per the tool's `unauthorized` error mode. Don't try to persist anon-curator state via this tool — use the chat session instead.

---

## Cross-references

- `_packets/SPINE/CURATOR_PROMPT.md` — Peek's system prompt; lists tools by name.
- `_packets/SPINE/CAPABILITY_INVENTORY.md` — vendor surface; tier prioritization; what's wired vs net-new.
- `_packets/SPINE/SLUG_MODEL.ts` — canonical zod model every tool mutates.
- `_packets/SPINE/skills/*.md` — per-surface playbooks (affiliate, rules, share, voice/camera, vibe, image, copy, reveal).
- `atelier/lib/anthropic/tools/*.ts` — source-of-truth for the 13 wired tools.
- `atelier/lib/anthropic/tools/bootstrap.ts` — registration manifest. Every tool here must be imported there.
- `atelier/db/schema/*.ts` — Drizzle schemas the SLUG_MODEL.ts mirrors.
- `BUGS.md` — open bugs that intersect with tools (B16 mark_ready, M04 share double-count, M13 Browserbase, M14 Skimlinks signature, M16 scrape re-wrap).
