# CAPABILITY_INVENTORY — vendors × features peek.gift actually uses or has a path to

Source of truth for what's wired, what's keyed-not-used, and the small set of NET-NEW capabilities with a real path to live. Pairs with `SERVICES.md` (account/key matrix), `CONCEPT-V2.md` (product brief), `BRAIN-DUMP.md` (Frank's raw voice), `BUGS.md` (live ledger), `STATE.md` (live state).

**Speculative bloat was moved to `IDEAS-LATER.md` 2026-05-28.** Travel APIs, retailer direct affiliates, music/video integrations, real-time voice/video hosting, Code Execution, Connect/Subscriptions/Invoices, Resend Audiences, Ayrshare/Buffer, Tolt/Rewardful, Pinterest/Instagram/Canva, Apple Music, Lottiefiles, Mapbox, Mux/Bunny, LiveKit/Daily — all preserved there for when their product surface ships.

## Status legend

- ✅ **WIRED** — end-to-end behavior present, working in prod
- 🟡 **PARTIAL** — some layers working, gaps documented (cross-ref BUGS / CONCEPT-INVENTORY)
- 🔴 **KEYED-NOT-USED** — credentials/feature exist on our side, code path not built
- 💡 **NET-NEW** — feature available from vendor, not yet started, has Tier 0/1 path

---

## A. ANTHROPIC — agentic feature surface

`ANTHROPIC-API-CONTEXT.md` covers mechanics (caching, batching, streaming, telemetry). This section is the **agentic** features that build "make any idiot build this page."

### A1. Tool use (function calling) ✅ WIRED
13 tools registered today (packet 11): `set_recipient`, `set_vibe`, `update_vibe`, `set_hero_image`, `generate_hero_image`, `set_note`, `add_variant_group`, `add_card`, `remove_card`, `reorder_cards`, `scrape_url`, `mark_ready_for_publish`, `ping`. peek.gift use: every chat utterance can mutate the page mid-stream. **THE** killer feature. Spine expansion (TOOL_MANIFEST.md) adds new tools for the in-flight build: `affiliate_search`, `share_pack_generate`, `invite_cocurator`, `propose_checkout`, `set_countdown`, `set_rules_template`, `request_voice_capture`, `request_camera_capture`, `set_reaction_capture_consent`, `transcribe_chunk`, `attach_files_api_ref`, `set_curator_memory`.

### A2. Streaming SSE ✅ WIRED
`app/api/chat/route.ts`. Text streams to chat UI; tool_use blocks emit live to preview pane. M07 (turn_end per inner iteration) addressed in Wave 1.

### A3. Vision (image input) ✅ WIRED
Curator drops a photo → Claude reads it. Use: hero vibe extraction, recipient face for personalization, inspiration image for shopping. Net-new tie-in: camera capture (F3) should feed the same Vision pipe.

### A4. Prompt caching 🔴 KEYED-NOT-USED
Per ANTHROPIC-API-CONTEXT §Prompt Caching: 90% input-cost cut on chat surfaces. Mechanic: `cache_control: { type: "ephemeral" }` marker on the last stable block before per-request input. Shape:
```
[ system prompt          ] ← stable
[ tool definitions       ] ← stable
[ Skills bundle          ] ← stable (or conditional bundle per occasion)
[ persona / style guide  ] ← stable
[ retrieved long context ] ← cache breakpoint
[ per-request user msg   ] ← varies
```
peek.gift use: **THE** biggest unhit lever. Big system prompt + 25+ tools + Skills library will easily exceed 1024-token cache minimum. Verify current `lib/anthropic/chat.ts` does NOT set this; if missing, ship as a 1-line packet.

### A5. Extended thinking 💡 NET-NEW
**Default chat model: Sonnet 4.6** (`claude-sonnet-4-6`). Opus 4.7 is opt-in per-call for specific creative jobs, NOT the default. Use sparingly. Apply Opus 4.7 + extended thinking to:
- Writing the curator's personal note in the curator's voice from 3-4 signals
- Designing tricky rules trees ("3 watches, cheapest one is beg-locked, oldest one is gag-card")
- Disambiguating a recipient profile when curator gives conflicting signals
NOT for mid-stream tool calls (kills perceived latency).
Implementation: conditional `thinking: { type: 'enabled', budget_tokens: 8000 }` + `model: 'claude-opus-4-7'` only on specific tool dispatch phases. All other turns stay on Sonnet 4.6.

### A6. Anthropic Skills 💡 NET-NEW
Capability bundles loaded into Claude's context. Build the `peek/*` library:
- `peek/curator-protocol` — system prompt + tool routing rules + bookend behavior (landing→auth→build→checkout)
- `peek/occasion-templates/<type>` — princess-bday, teen-grad, bachelorette, wedding, milestone-bday, anniversary, holidays, baby-shower, retirement, condolences, just-because
- `peek/vibe-direction` — palette / typography / density / shape / mood from signals
- `peek/image-direction` — fal.ai briefs for hero / card images
- `peek/copy-house-style` — Peek's voice
- `peek/share-mechanics` — per-platform shareables
- `peek/reveal-mechanics` — cinematic reveal choreography
- `peek/affiliate-strategy` — when to scrape, web-search, propose from `affiliate_search`
- `peek/rules-engine-patterns` — picks/locks/begs/gags
- `peek/voice-camera-protocol` — voice/camera mode UX

Delivery model (H2): **A2 — conditional loading.** Classify occasion type in turns 1-2 via Haiku, load only the relevant occasion-template + common always-loaded skills (curator-protocol, vibe-direction, copy-house-style).

### A7. Memory tool 💡 NET-NEW
Persist state across conversations. peek.gift use: curator profile across visits — favorite occasions, recipients gifted before, vibe defaults, family relationship graph (curator's nieces, brothers, mom — each with their own preferences and dates). Unlocks the "5th-gift" experience. Storage: Supabase `curator_memory` table keyed by `clerk_user_id`; tool reads/writes; passed into the system prompt as the curator-context block.

### A8. Files API 💡 NET-NEW
Upload files server-side, persist, reference in conversations. peek.gift use:
- Big-file uploads (multi-photo album, PDF wishlist email, long voice memo)
- Files persist across the session; tool calls reference by `file_id`
- Hero candidate library (curator uploads 10 photos; Peek auto-selects best 3)

### A9. Server-side Web Search tool 💡 NET-NEW
Anthropic-native `web_search` tool. 30 req/sec rate limit. peek.gift use:
- "She loves Stanley cups" → search current line, prices, availability, affiliate-eligible retailers
- Pricing/availability mid-chat
- Aspirational card fact-finding
- **Doubles as `affiliate_search` fallback** when Skimlinks/Sovrn aren't keyed yet (per packet 41 stub pattern).

### A10. Citations 💡 NET-NEW
Claude cites sources in responses. peek.gift use: aspirational-card "fact sheet" mode. Curator: "Ferrari 296 GTB card with actual specs." → pulls from web_search + cites. Recipient sees "0–60 in 2.6s [source]" with link rendered.

### A11. Batch API 💡 NET-NEW
50% off non-realtime work. SLA up to 24h. peek.gift use:
- Pre-gen hero prompts for the 10 common occasion archetypes (cold-start latency)
- A/B prompt sweeps for reveal copy
- Bulk share-pack generation post-publish (6 platform variants overnight)
- Eval suite runs on prompt changes

### A12. Application-level telemetry ✅ WIRED
Per ANTHROPIC-API-CONTEXT + STATE packets 25/34. PostHog `$ai_generation` + own `events` table.

---

## B. CLERK — auth/identity surface

Custom UI locked per packet 28 (no Clerk branding visible).

| ID | Feature | Status | peek.gift use |
|---|---|---|---|
| B1 | Email + password | ✅ | Default auth |
| B2 | Passwordless email (magic link) | 💡 | Mobile-friendly low-friction signup at value-accrued auth wall |
| B3 | Phone/SMS OTP | 💡 | Mobile-first signups |
| B4 | Passkeys / WebAuthn | 💡 | Sticky repeat-buyer login. Face ID on mobile checkout |
| B5 | Social OAuth (Apple, Google) | 💡 | Friction reducer at auth-wall moment |
| B6 | MFA (TOTP, SMS, backup codes) | 💡 | Optional for high-value curators |
| B7 | **Organizations** | 💡 | **How co-curation works.** Each peek is an org-membership. Schema exists; no API/UI/tool/policy yet. Tier 1 — not Tier 0 |
| B8 | Org invitations | 💡 | Invite co-curators. Magic-link or email |
| B9 | Custom session claims | 💡 | Store curator vibe defaults, occasion, family-graph hashes — no DB roundtrip per chat turn |
| B10 | Lifecycle webhooks | ✅ | `app/api/webhooks/clerk/route.ts`. M20 + B-Wave1.5 closed |
| B11 | Custom themed UI | ✅ | Packet 28 — custom sign-in/up forms reskinned |

---

## C. STRIPE — payments surface

Custom Payment Element locked per packet 15.

> **Stripe principle: ALL payment methods, ALL currencies, ALL countries, automatic_tax on.** Frank's account already has Tax + Adaptive Pricing activated. Every Stripe payment method that's account-enabled routes through the Payment Element with NO per-method opt-in code.

| ID | Feature | Status | peek.gift use |
|---|---|---|---|
| C1 | Payment Element | ✅ | Default checkout |
| C2 | Stripe Tax | 🟡 | Code-side flipped on (packet 15); Dashboard activation done this session (NJ origin registered) |
| C3 | Adaptive Pricing | 🟡 | Account-level on; M01 carryover — not set on Session create |
| C4 | Link (saved cards) | 💡 | Faster repeat checkout, one-click |
| C5 | Apple Pay / Google Pay | 💡 | **Tier 0.** Mobile-first checkout |
| C6 | Klarna / Afterpay / Affirm (BNPL) | 💡 | Higher-AOV gifts. `async_payment_succeeded` webhook handling — B14 in Wave 1 |
| C7 | ACH / Bank transfer | 💡 | Corporate gifters paying $1000+ |
| C8 | Customer Portal | 💡 | Curator self-serve: billing history, payment methods, receipts |
| C9 | Coupons / Promo codes | 🟡 | `THISISTHEONE` $0.50 test coupon exists. Need full UI for launch coupons + partner codes + refer-a-friend |
| C10 | Saved payment methods | 💡 | Repeat-curator one-tap checkout |
| C11 | Webhooks | ✅ | `app/api/stripe/webhook/route.ts`. B14 (async_payment) Wave 1; B15 (idempotency fail-open) carry-forward; M22 (Upstash missing) carry-forward |
| C12 | Receipt customization | 💡 | Branded receipts |
| C13 | Radar (fraud) | ✅ | Auto-on at Stripe Standard. No extra wiring needed |
| C14 | Address Element (Link autocomplete) | 💡 | Address auto-suggest in checkout + curator profile + recipient delivery addresses. Comes free with Payment Element config. Replaces any need for Google Places autocomplete |

---

## D. SUPABASE — data, storage, extensions

| ID | Feature | Status | peek.gift use |
|---|---|---|---|
| D1 | Postgres + Drizzle | ✅ | Default DB layer |
| D2 | Row-Level Security | ✅ | Packet 31 — RLS on all 11 tables; service-role bypasses; anon reads via policy |
| D3 | Storage | 🟡 | `peek-v2-assets` bucket per CLAUDE.md. Hero re-host wired (packet 22). Net-new: recipient reaction videos, curator selfies, voice notes |
| D4 | **Realtime (Postgres LISTEN/NOTIFY → websocket)** | 🟡 | **LIVE PREVIEW** for co-curator / recipient. B07+B08 closed in Wave 1 |
| D5 | Auth (NOT used) | — | Clerk owns auth |

---

## E. EXISTING BACKEND (per STATE)

### E1. Resend (transactional email) ✅ WIRED
Share notifications, payment receipts.

### E2. Twilio 🟡 PARTIAL
SMS wired. WhatsApp keys not yet wired.
- **SMS** ✅ — share-by-text, OTP backup, nudge reminders
- **WhatsApp** 💡 — international sharing (huge in non-US markets)

### E3. fal.ai 🟡 PARTIAL
Image gen wired (packet 22). Keyed this session. Net-new opportunities:
- **Video gen** — fal hosts Pika, Luma, Runway models (Tier 1)
- **LipSync** — hero photo "speaks" the personal note (Tier 1)
- **Voice gen (TTS)** — alternative to ElevenLabs/Cartesia
- **ControlNet / IP-Adapter** — consistent character across hero variants
- **Image edit (inpainting, background remove, restyle)**
- **Upscale** — high-DPI displays / print exports

### E4. ZenRows ✅ WIRED
99% of scrape volume. Browserbase deferred to IDEAS-LATER (endpoint broken, ZenRows covers everything).

### E5. Jina Reader 💡 NET-NEW (per BUGS.md M12)
Long-tail markdown for AI-friendly content extraction. Third-tier scrape fallback.

### E6. Skimlinks (affiliate outbound) 🟡 PARTIAL
Frank's call (2026-05-28): "we don't have affiliates right now" — demoted from Tier 0. Outbound wrap wired (packet 24). Caveats:
- Webhook signature format guessed (M14)
- Endpoint URL may be stale (BUGS.md trailing notes)
- **NET-NEW**: Skimlinks API for **catalog search** — currently ABSENT. The missing piece for the `affiliate_search` tool. Until Frank applies + gets approved, `affiliate_search` falls back to Anthropic `web_search`.

### E7. Sovrn 🟡 PARTIAL
Wrap wired. No revenue webhook. Same catalog-search gap as Skimlinks. Same demotion — not Tier 0.

### E8. PostHog ✅ LIVE (keyed this session)
Org `peekgift`, project id `434015`. Analytics + provider + LLM observability wired (packet 25). Session replay needs CSP fix (M23 in Wave 1.5 — closed); proxy strips headers (B18 in Wave 1 — closed).
- **Feature flags** 💡 — gate cinematic reveal mechanics behind flag
- **Experiments** 💡 — A/B reveal copy, hero gen prompts, checkout flows
- **Session replay** 💡 — see how recipients interact (diagnose pick bounce)
- **Surveys** 💡 — post-publish curator NPS

### E9. Inngest ✅ WIRED (packet 26)
3 jobs: nudge-relationships, scrape-worker, webhook-logger. Net-new:
- **share-pack batch gen** post-publish (fan-out N platform variants — couples to A11 Batch API)
- **Recipient drip campaign** (3 nudges over a week if they haven't picked)
- **Curator engagement** (anniversary of last peek → "build another?")

### E10. Sentry ✅ WIRED (packet 34)
Errors + breadcrumbs. M23 (CSP) closed. **Account exists; DSN needs to be set in Netlify env to activate.**

### E11. Upstash Redis ✅ LIVE (keyed this session)
URL: `https://probable-lemur-138225.upstash.io`. peek.gift use: rate limiting, idempotency, ephemeral session state, presence ("Frank is editing"), curator anon-turn cap per-IP (M05 carryover). BUGS M22 closes once Stripe webhook + rate-limit code reads these env vars.

### E12. Netlify ✅ WIRED
Primary URL is now `vnext.peek.gift` (custom-domain alias). `peek-gift-vnext.netlify.app` still resolves. Cutover to `peek.gift` is a one-domain-add on the same project — see `CUTOVER.md`.

---

## F. NET-NEW MEDIA — voice + camera

### F1. Deepgram (STT) 💡 NET-NEW
Streaming WebSocket STT. ~$0.0043/min. peek.gift use: curator talks the gift into being. Real-time transcription feeds Claude streaming. Drop-in for the mic button (CONCEPT-V2 §2). Latency ~150-300ms streaming.

### F2. ElevenLabs OR Cartesia (TTS) 💡 NET-NEW
Streaming TTS. ElevenLabs $0.18-0.30 / 1k chars. Cartesia faster latency, similar pricing. peek.gift use:
- Narrator voice on cinematic reveal
- Optional voice-of-curator (clone curator's voice from a 30s sample)
- Spoken card descriptions for accessibility

### F3. MediaRecorder API (browser-native) 💡 NET-NEW
Free. peek.gift use:
- Camera + mic capture in the chat surface (CONCEPT-V2 §2 `+` menu → Camera)
- **Recipient reaction capture** after reveal → uploads to Supabase Storage → embedded back in the page for the curator
- Curator selfie for the personal-note card

### F4. fal.ai video gen / LipSync 💡 NET-NEW (Tier 1)
See E3. Cinematic reveal upgrade — hero video instead of static image, LipSync to make hero photo "speak."

---

## G. ARCHITECTURAL QUESTIONS (need decision before spine packets)

### G1. Skills delivery model
- **A1 — Inline:** every chat turn ships ALL skills. Burns cache writes initially but caches well after first turn.
- **A2 — Conditional:** classify occasion type in turn 1 via Haiku, then load only relevant `peek/occasion-templates/<type>` + common skills.
- **Recommendation: A2.** Cache common skills (`curator-protocol`, `vibe-direction`, `copy-house-style`) always. Add occasion-specific skill once classified.

### G2. Voice latency budget
End-to-end loop: mic → Deepgram STT → text → Claude → ElevenLabs TTS stream → speaker. Target: <1.5s perceived from user-stop-speaking to first-TTS-byte. Sonnet streaming TTFT ~500-800ms. Deepgram STT ~150-300ms. ElevenLabs Flash ~300ms. Total ~1s. Workable.
- **Recommendation: Ship voice as Tier 0, but as a TOGGLE not default.** Type mode is faster for most curators; voice is a feature unlock for those who want it.

### G3. Camera capture flow
- **Recipient reaction:** MediaRecorder → blob → POST → Supabase Storage → CDN URL → store as `recipient_reaction_url` on peek
- **Curator selfie:** same flow. Use as note-card avatar or hero accent.
- **Privacy:** explicit consent toast before recording. Curator can disable recipient reaction in peek settings.

### G4. Co-curation in MVP scope?
CONCEPT-V2 §7 wants it. CONCEPT-INVENTORY §2 — STUB (schema only). **Recommendation: Tier 1, not Tier 0.** Solo-curator flow + checkout must be perfect first.

### G5. Affiliate suggestion UI (the absent feature)
CONCEPT-INVENTORY §4 — ABSENT. No "browse suggested products" panel; chat-driven only. **Tier 0** even with affiliate demotion — Frank explicitly wants this surface; until Skimlinks lands, results come from Anthropic `web_search`. Implementation: curator-side panel that the AI populates as chat unfolds. `affiliate_search` tool → results render as sidebar deck. Curator drag-and-drops into card list.

### G6. Reveal mechanics — what "feeling"
Default: hybrid — hero "lights up" (gentle desaturate → saturate + slow zoom), name "writes itself" (typewriter on short notes, fade on long — packet 14), then note, then cards fan in (deck-of-cards spread).

### G7. Voice on/off default
Tier 0 capability but default toggle: **off** for now. Curator opts in via chat input mic button. Eventually surface "Voice mode" in chat onboarding once UX is right.

### G8. Tailwind utility classes vs primitive Vibe components
**Demote Tailwind, don't rip it.** Tailwind becomes layout glue only (flex/margin/positioning). All visual (color/spacing/shape/type) flows from vibe CSS variables via `<VibeText kind="display">`, `<VibeCard shape="organic">`, `<VibeStack gap="airy">` primitives. End state can be tailwind-free; we ship in pieces.

---

## H. TIERED PRIORITY (the dispatch shape)

### Tier 0 — Must integrate to unlock "fucking insane"

| # | Capability | Status | Refs |
|---|---|---|---|
| 1 | Anthropic Prompt Caching across system + tools + Skills | 🔴 | A4 |
| 2 | Anthropic Skills `peek/*` library (conditional load) | 💡 | A6 + G1 |
| 3 | Anthropic Memory tool (curator profile cross-session) | 💡 | A7 |
| 4 | Anthropic Server Web Search (price/availability mid-chat; affiliate_search fallback) | 💡 | A9 |
| 5 | Anthropic Files API (large uploads) | 💡 | A8 |
| 6 | Anthropic Extended Thinking (creative tool calls) | 💡 | A5 |
| 7 | **Affiliate search tool** with web_search fallback + suggestion UI | 💡 | E6 + E7 + G5 |
| 8 | **Voice** (Deepgram STT + ElevenLabs TTS, toggle off default) | 💡 | F1 + F2 + G2 + G7 |
| 9 | **Camera** (MediaRecorder + Supabase Storage) | 💡 | F3 + G3 |
| 10 | Clerk Passkeys + Apple/Google OAuth + magic link | 💡 | B4 + B5 + B2 |
| 11 | Stripe Link + Apple/Google Pay + Klarna/Afterpay/Affirm + customer portal | 💡 | C4 + C5 + C6 + C8 |
| 12 | Stripe `automatic_tax` + `adaptive_pricing` on session create | 🟡 | C2 + C3 (M01) |
| 13 | Stripe Address Element on checkout | 💡 | C14 |
| 14 | Supabase Realtime live preview (curator → co-curator → recipient) | 🟡 | D4 |
| 15 | PostHog session replay + flags + experiments | ✅/🟡 | E8 |
| 16 | Share-pack generator (OG card + 6 platform variants, batched via A11) | 🟡 | E9 + A11 |
| 17 | Reaction capture (recipient post-reveal video back into the page) | 💡 | F3 |
| 18 | Twilio WhatsApp activation | 🔴 | E2 |
| 19 | Tailwind demotion → primitive Vibe components | 💡 | G8 |
| 20 | Custom card geometry per type (product / activity / aspirational / digital / joke each get distinct base form) | 💡 | — |
| 21 | Upstash-backed rate limit + Stripe webhook idempotency | 🔴 | E11 + BUGS M22/B15 |
| 22 | Sentry DSN wired (account exists; needs env var) | 🔴 | E10 |

### Tier 1 — Bells & whistles, high-value adds

- fal.ai video gen + LipSync (E3, F4)
- Anthropic Citations on aspirational cards (A10)
- Anthropic Batch API for nightly enrichment + share-pack gen (A11)
- Clerk Organizations (co-curation) (B7 + G4)
- Jina Reader long-tail markdown scrape (E5)
- Skimlinks / Sovrn revenue webhooks (when affiliates matter again per Frank)

### Tier 2 — Post-MVP / strategic

Deferred entirely to `IDEAS-LATER.md`:
- Travel APIs (Viator, OpenTable, Booking, Expedia, Airbnb, TripAdvisor, GetYourGuide, Ticketmaster, SeatGeek, StubHub)
- Major-retailer direct affiliates (Amazon, Apple, Walmart, Target, eBay)
- Music/video integrations (Spotify, Apple Music, TMDB, YouTube oEmbed, Pinterest, Instagram, Canva)
- Real-time voice/video hosting (LiveKit/Daily, Mux/Cloudflare/Bunny)
- Code Execution tool
- Stripe Connect / Subscriptions / Invoices / Identity
- Marketing/outbound (Resend Audiences, Ayrshare/Buffer, Twilio Studio)
- Creator affiliate (Tolt/Rewardful)
- Lottiefiles, Mapbox
- Anthropic Agent SDK, WIF, MCP Connectors

---

## I. ACCOUNT / KEY SIGNUP CHECKLIST (Frank tasks)

Per PROD-PARALLEL POLICY in CLAUDE.md: **do NOT provision proactively**, surface and let Frank decide. Trimmed to only Tier 0/1 actually needed for the in-flight build.

| Service | Action | Tier | Why |
|---|---|---|---|
| Stripe Dashboard | Tax activated + NJ origin registered ✅ (this session) | — | Done |
| Clerk Dashboard | Confirm `vnext.peek.gift` AND `peek-gift-vnext.netlify.app` authorized origins | 0 | Auth from both URLs |
| Netlify env | `GUEST_CLAIM_TOKEN_SECRET` ≥32 chars | 0 | Recipient HMAC fail-closed |
| Netlify env | Upstash keys ✅ (set this session) | — | Done |
| Netlify env | PostHog keys ✅ (set this session) | — | Done |
| Netlify env | FAL_KEY ✅ (set this session) | — | Done |
| Netlify env | Sentry DSN + org + project + auth token | 0 | Error visibility (account exists) |
| Deepgram | Signup, key | 0 | Voice STT |
| ElevenLabs OR Cartesia | Signup, key | 0 | Voice TTS |
| Twilio | WhatsApp Business approval | 0 | International + WhatsApp share |
| Inngest | Signup, app `peek-gift-vnext`, 2 keys | 0 | Background nudges + scrape worker |
| Skimlinks | Application — DEMOTED per Frank ("we don't have affiliates right now") | 1 | Revenue layer when Frank wants it |
| Sovrn | Application — DEMOTED same as Skimlinks | 1 | Affiliate fallback |

> Anything outside this list lives in `IDEAS-LATER.md`. Don't add to the table without Frank's go.

---

## J. WHAT'S NEXT (orchestrator's dispatch plan)

Build order to ship the spine:

1. **`SPINE/CURATOR_PROMPT.md`** — Peek's system prompt. Mobile-first chat UI. Identity, fields collected + WHY each, conversational rules, house tone, bookends.
2. **`SPINE/SLUG_MODEL.ts`** — one zod-validated schema. Discriminated union on card types.
3. **`SPINE/TOOL_MANIFEST.md`** — every tool Peek can call.
4. **`SPINE/skills/peek-*.md`** — conditional skill library.
5. **Dispatch packets** — once spine lands, draft packets that implement piece-by-piece.

Order of dispatch (Tier 0 first, parallel where safe):

1. **Packet 40 — Prompt caching** (1-line system + tool prefix; massive cost win)
2. **Packet 41 — Anthropic surface expansion** (Memory + Files API + Web Search + Extended Thinking wiring)
3. **Packet 42 — Affiliate search + suggestion UI** (web_search-backed fallback now; Skimlinks/Sovrn when Frank flips them on)
4. **Packet 43 — Voice mode toggle** (Deepgram + ElevenLabs/Cartesia streaming pipe)
5. **Packet 44 — Camera capture** (MediaRecorder → Storage; reaction capture flow)
6. **Packet 45 — Stripe surface expansion** (Link + Apple/Google Pay + Klarna/Afterpay/Affirm + customer portal + Address Element)
7. **Packet 46 — Clerk surface expansion** (Passkeys + magic link + social OAuth)
8. **Packet 47 — Realtime live preview** (Supabase Realtime → co-curator + recipient see edits live)
9. **Packet 48 — Share-pack batch gen** (Inngest fan-out + Batch API)
10. **Packet 49 — Tailwind demotion + primitive Vibe components**
11. **Packet 50 — Custom card geometry per type**

Wave 2 BUGS items parallel to this.

---

_Source-of-truth ownership: this file is canonical for vendors × features × peek.gift use. Speculative / deferred capabilities live in `IDEAS-LATER.md`. Account/key matrix lives in `SERVICES.md`. If any spine doc contradicts this, the contradiction is wrong (or this file needs a follow-up update)._
