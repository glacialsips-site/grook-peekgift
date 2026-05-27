# CAPABILITY_INVENTORY — every vendor × every feature × peek.gift use case

Source of truth for what's available, what's wired, what's keyed-not-used, what's net-new. Pairs with `CONCEPT-V2.md` (product brief), `CONCEPT-INVENTORY.md` (component-state audit), `ANTHROPIC-API-CONTEXT.md` (Anthropic mechanics), `BRAIN-DUMP.md` (Frank's raw voice), `BUGS.md` (live ledger), `STATE.md` (live state).

The product brief in CONCEPT-V2 and BRAIN-DUMP already nails WHAT the product is. This doc answers: **for every feature available across every vendor we use or could use, how does it map to making peek.gift "fucking insane"?** Frank's directive: "every single feature available from clerk and stripe that even remotely makes sense; EVERYTHING from the anthropic api that even remotely makes sense; every connector and plugin and skill; voice chat, camera, SMS, every fuckin integration."

## Status legend

- ✅ **WIRED** — end-to-end behavior present, working in prod
- 🟡 **PARTIAL** — some layers working, gaps documented (cross-ref CONCEPT-INVENTORY or BUGS)
- 🔴 **KEYED-NOT-USED** — credentials/feature exist on our side, code path not built
- 💡 **NET-NEW** — feature available from vendor, not yet started

---

## A. ANTHROPIC — agentic feature surface

`ANTHROPIC-API-CONTEXT.md` covers the mechanics (caching, batching, streaming, rate limits, telemetry). This section is the **agentic** features that build "make any idiot build this page."

### A1. Tool use (function calling) ✅ WIRED
13 tools registered today (packet 11): `set_recipient`, `set_vibe`, `update_vibe`, `set_hero_image`, `generate_hero_image`, `set_note`, `add_variant_group`, `add_card`, `remove_card`, `reorder_cards`, `scrape_url`, `mark_ready_for_publish`, `ping`. peek.gift use: every chat utterance can mutate the page mid-stream — curator says "ferrari" → `add_card({type:'aspirational',…})` fires before model finishes the next sentence. **THE** killer feature. Spine expansion (TOOL_MANIFEST.md) adds ~15 more tools: `affiliate_search`, `activity_search` (Viator/OpenTable/Ticketmaster/Booking/GetYourGuide affiliate-driven, no Google Places), `share_pack_generate`, `invite_cocurator`, `propose_checkout`, `set_countdown`, `set_rules_template`, `request_voice_capture`, `request_camera_capture`, `set_reaction_capture_consent`, `transcribe_chunk`, `set_song_card`, `set_movie_card`, `attach_files_api_ref`, `set_curator_memory`.

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
peek.gift use: **THE** biggest unhit lever. Big system prompt + 28+ tools + Skills library will easily exceed 1024-token cache minimum. Verify current `lib/anthropic/chat.ts` does NOT set this; if missing, ship as a 1-line packet.

### A5. Extended thinking 💡 NET-NEW (Sonnet 4.6, Opus 4.7 both support)
Use sparingly — burns latency. Apply to:
- Writing the curator's personal note in the curator's voice from 3-4 signals (Peek's hardest creative job)
- Designing tricky rules trees ("3 watches, cheapest one is beg-locked, oldest one is gag-card")
- Disambiguating a recipient profile when curator gives conflicting signals
NOT for mid-stream tool calls (kills perceived latency).
Implementation: conditional `thinking: { type: 'enabled', budget_tokens: 8000 }` on specific tool dispatch phases.

### A6. Anthropic Skills 💡 NET-NEW
Capability bundles loaded into Claude's context. Frank explicitly mentioned ("styles thing"). Build the `peek/*` library:
- `peek/curator-protocol` — system prompt + tool routing rules + bookend behavior (landing→auth→build→checkout)
- `peek/occasion-templates/<type>` — princess-bday, teen-grad, bachelorette, wedding, milestone-bday, anniversary, holidays, baby-shower, retirement, condolences, just-because. Each defines: typical vibe, default card mix, copy register, share cadence, common gotchas.
- `peek/vibe-direction` — how to set palette / typography / density / shape / mood from signals
- `peek/image-direction` — how to brief fal.ai for hero / card images (style, character consistency, composition)
- `peek/copy-house-style` — Peek's voice: playful, irreverent, sentimental modes. "What Peek would say. What Peek would never say."
- `peek/share-mechanics` — how to assemble per-platform shareables (OG card + IG-story + X + FB + iMessage + WhatsApp + SMS + Email)
- `peek/reveal-mechanics` — choreograph the cinematic reveal (hero → name → note → cards → done)
- `peek/affiliate-strategy` — when to scrape, when to web-search, when to propose from `affiliate_search` results
- `peek/rules-engine-patterns` — common picks (pick-one-of-N, beg-locks, pick-all-or-counter, date-after unlock, gag overrides)
- `peek/voice-camera-protocol` — when to suggest voice mode, when to ask for camera, when to record reaction (consent flow)

Delivery model (architectural decision, see H2): **A2 — conditional loading.** Classify occasion type in turns 1-2 via Haiku, then load only the relevant occasion-template skill + the common always-loaded skills (curator-protocol, vibe-direction, copy-house-style). Smaller per-turn payload, cleaner attention, still cache-friendly.

### A7. Memory tool 💡 NET-NEW
Persist state across conversations. peek.gift use: curator profile across visits — favorite occasions, recipients gifted before, vibe defaults, family relationship graph (curator's nieces, brothers, mom — each with their own preferences and dates). Unlocks the "5th-gift" experience: "Want to do something for Sarah again? Last year's anniversary peek skewed warm/cozy — same direction or shake it up?" Storage: Supabase `curator_memory` table keyed by `clerk_user_id`; tool reads/writes; passed into the system prompt as the curator-context block.

### A8. Files API 💡 NET-NEW
Upload files server-side, persist, reference in conversations. peek.gift use:
- Big-file uploads (curator drops a multi-photo album, a PDF wishlist email from the recipient, a long voice memo from a family member to embed as a digital card)
- Files persist across the session; tool calls reference by `file_id` instead of re-uploading
- Hero candidate library (curator uploads 10 photos; Peek auto-selects best 3 for hero options)

### A9. Server-side Web Search tool 💡 NET-NEW
Anthropic-native `web_search` tool. 30 req/sec rate limit. peek.gift use:
- Curator says "she loves Stanley cups" → Peek calls `web_search` → finds current Stanley line, prices, availability, links to affiliate-eligible retailers
- "Her favorite restaurant is Carbone" → searches for Carbone NYC, validates address, finds OpenTable link
- Pricing/availability mid-chat ("is that watch in stock?")
- Aspirational card fact-finding ("0–60 of a Ferrari 296 GTB is…")

### A10. Server-side Code Execution tool 💡 NET-NEW (Tier 2)
Sandboxed Python. peek.gift marginal use: complex date math (anniversary countdowns across timezones), currency conversion for international curators, generating CSV exports for corporate bulk gifting. Not Tier 0.

### A11. Citations 💡 NET-NEW
Claude cites sources in responses. peek.gift use: aspirational-card "fact sheet" mode. Curator: "I want a Ferrari 296 GTB card with actual specs." → Claude pulls from web_search + cites. Recipient sees "0–60 in 2.6s [source]" with the link rendered.

### A12. Batch API 💡 NET-NEW
50% off non-realtime work. SLA up to 24h. peek.gift use:
- Nightly catalog enrichment (Skimlinks/Sovrn product feed → classify by vibe → cache in Supabase for `affiliate_search` to query)
- Pre-gen hero prompts for the 10 common occasion archetypes (cuts cold-start latency on princess-bday and wedding peeks)
- A/B prompt sweeps for reveal copy
- Bulk share-pack generation post-publish (after publish, batch-create all 6 platform variants overnight)
- Eval suite runs on prompt changes

### A13. MCP Connectors 💡 NET-NEW (Tier 1 for Calendar; Tier 2 for others)
Anthropic-hosted connectors: Google Drive, Calendar, Gmail, Slack, GitHub, Asana, Linear, Notion, Box, Canva, Atlassian, PayPal, Plaid, Salesforce, Stripe, Zapier. peek.gift use:
- **Google Calendar** — auto-detect anniversaries/birthdays from curator's calendar (with permission). Major repeat-buyer hook.
- Google Drive — pull a photo album for hero/card image selection
- Gmail — reference an old email thread for a memory card ("you sent each other 47 emails about that trip; want me to weave one into a card?")
- Notion — power-curator pulls from a planning doc
- Pinterest (if connector exists) — pull recipient's mood board for vibe signal
Most are post-MVP. Calendar is the most compelling for the repeat-curator engagement loop.

### A14. Agent SDK / Managed Agents 💡 NET-NEW (architectural — see H1)
Anthropic's first-class agent infra. Skills + Memory first-class. Reduces our orchestration code. Tradeoff: less control over the chat loop. Recommendation: stay raw for now (we have working `chatTurn` per packet 17); revisit as a focused architectural packet post-Wave 2.

### A15. Application-level telemetry ✅ WIRED
Per ANTHROPIC-API-CONTEXT + STATE packets 25/34. PostHog `$ai_generation` + own `events` table.

### A16. Workspace separation / WIF 💡 NET-NEW (Tier 2)
Per-environment keys to reduce blast radius. WIF removes long-lived keys from deploy surface. Tier 2 — useful once we have prod/staging traffic separation.

---

## B. CLERK — auth/identity surface

Custom UI locked per packet 28 (no Clerk branding visible).

| ID | Feature | Status | peek.gift use |
|---|---|---|---|
| B1 | Email + password | ✅ | Default auth |
| B2 | Passwordless email (magic link) | 💡 | Mobile-friendly low-friction signup at the value-accrued auth wall |
| B3 | Phone/SMS OTP | 💡 | Mobile-first signups; cheaper than passkey UX for first-time users |
| B4 | Passkeys / WebAuthn | 💡 | Sticky repeat-buyer login. Face ID on mobile checkout |
| B5 | Social OAuth (Apple, Google, etc.) | 💡 | Friction reducer at the auth-wall moment |
| B6 | MFA (TOTP, SMS, backup codes) | 💡 | Optional for high-value curators (corporate $500+ gifters) |
| B7 | **Organizations** | 💡 | **THIS IS HOW CO-CURATION WORKS.** Each peek is an org-membership. Roles (organizer / co-organizer / contributor) map directly to Clerk org roles. Schema already exists (`db/schema/collaborators.ts`); CONCEPT-INVENTORY §2 — STUB; no API/UI/tool/policy yet |
| B8 | Org invitations | 💡 | Invite co-curators to help build a peek. Magic-link or email |
| B9 | Custom session claims | 💡 | Store curator's vibe defaults, default occasion, family-graph hashes — accessible to Claude on every chat turn without DB roundtrip |
| B10 | Impersonation | 💡 | Support tool — Frank/team impersonates a stuck curator to debug |
| B11 | Lifecycle webhooks | ✅ | `app/api/webhooks/clerk/route.ts`. M20 + B-Wave1.5 closed (user.created with no email handled, user.deleted soft-delete pending) |
| B12 | B2B features (audit logs, SAML SSO) | 💡 | Corporate gifting product surface (post-MVP) |
| B13 | Custom themed UI | ✅ | Packet 28 — custom sign-in/up forms reskinned, no Clerk branding |

---

## C. STRIPE — payments surface

Custom Payment Element locked per packet 15.

> **Stripe principle: ALL payment methods, ALL currencies, ALL countries, automatic_tax on.** Frank's account already has Tax + Adaptive Pricing activated. Every Stripe payment method that's account-enabled (cards, Link, Apple Pay, Google Pay, ACH, Klarna, Afterpay, Affirm, Cash App, iDEAL, Bancontact, SEPA, EPS, etc.) routes through the Payment Element with NO per-method opt-in code. Custom checkout with custom branding (per packet 15). Tax + Adaptive Pricing automatic at the Session level.

| ID | Feature | Status | peek.gift use |
|---|---|---|---|
| C1 | Payment Element | ✅ | Default checkout |
| C2 | Stripe Tax | 🟡 | Code-side flipped on (packet 15); Dashboard activation pending per STATE Stripe owner-tasks |
| C3 | Adaptive Pricing | 🟡 | Account-level on; M01 carryover — not set on Session create. International curators charged USD until fixed |
| C4 | Link (saved cards across Stripe sites) | 💡 | Faster repeat checkout, one-click |
| C5 | Apple Pay / Google Pay | 💡 | **Tier 0.** Mobile-first checkout |
| C6 | Klarna / Afterpay / Affirm (BNPL) | 💡 | Higher-AOV gifts. `async_payment_succeeded` webhook handling — B14 in Wave 1 |
| C7 | ACH / Bank transfer | 💡 | Corporate gifters paying $1000+ in one shot |
| C8 | Customer Portal | 💡 | Curator self-serve: billing history, payment methods, receipts |
| C9 | **Stripe Connect** | 💡 | **Creator marketplace.** When curators get a cut of recipient affiliate revenue, Connect handles payouts. Post-MVP but architecturally significant. Couples to Tolt/Rewardful program (G10) |
| C10 | Stripe Identity | 💡 | KYC for Connect creators (when creator program launches) |
| C11 | Subscriptions | 💡 | Recurring gifts ("give Mom a monthly peek for a year"). Annual peek subscriptions for power-curators |
| C12 | Invoices | 💡 | Corporate gifters (employee-of-the-month, holiday bulk). Bill-me invoicing |
| C13 | Payment Links | 💡 | Recipient buying for themselves (when peeks allow recipient-self-purchase) |
| C14 | Coupons / Promo codes | 🟡 | `THISISTHEONE` $0.50 test coupon exists per BRAIN-DUMP. Need full UI surface for launch coupons + partner discount codes + refer-a-friend |
| C15 | Saved payment methods | 💡 | Repeat-curator one-tap checkout |
| C16 | Webhooks | ✅ | `app/api/stripe/webhook/route.ts`. B14 (async_payment) Wave 1; B15 (idempotency fail-open) carry-forward; M22 (Upstash missing) carry-forward |
| C17 | Receipt customization | 💡 | Branded receipts |
| C18 | Radar (fraud) | 💡 | Auto-on at Stripe Standard. No extra wiring needed |
| C19 | Customer Sessions (Custom checkout) | 🟡 | Payment Element wired; richer Customer Session for variants TBD |
| C20 | Address Element (Link autocomplete) | 💡 | Address auto-suggest in checkout flow + curator profile + recipient delivery addresses (when Tier 2 fulfillment ships). Comes free with Stripe Checkout/Payment Element configuration; just enable. Replaces any need for Google Places autocomplete |

---

## D. SUPABASE — data, storage, extensions

| ID | Feature | Status | peek.gift use |
|---|---|---|---|
| D1 | Postgres + Drizzle | ✅ | Default DB layer |
| D2 | Row-Level Security | ✅ | Packet 31 — RLS on all 11 tables; service-role bypasses; anon reads via policy |
| D3 | pgvector extension | 🔴 | Installed but unused. peek.gift use: embedding search for "find similar peeks" or "what cards work for this vibe" |
| D4 | Storage | 🟡 | `peek-v2-assets` bucket per CLAUDE.md. Hero re-host wired (packet 22). Net-new: recipient reaction videos, curator selfies, voice notes |
| D5 | Edge Functions | 💡 | Low-latency endpoints. Could host realtime presence (curator + co-curator "X is editing"). Probably skip — Next routes serve well |
| D6 | **Realtime (Postgres LISTEN/NOTIFY → websocket)** | 🟡 | **LIVE PREVIEW** for co-curator / recipient. Curator types → peek mutates → other viewers see the page mutate live. B07+B08 closed in Wave 1 (browser client schema + picks publication) |
| D7 | Database webhooks | 💡 | Pipe DB events to Inngest (cheaper than polling) |
| D8 | pg_cron | 💡 | Cheaper than Inngest for simple periodic jobs. Probably skip — Inngest already wired |
| D9 | Auth (NOT used) | — | Clerk owns auth |

---

## E. EXISTING BACKEND (per STATE)

### E1. Resend (transactional email) ✅ WIRED
Share notifications, payment receipts. Net-new: Resend Audiences (broadcasts) for marketing — minimal scope; PostHog or a list tool handles announcements better.

### E2. Twilio 🟡 PARTIAL
SMS wired. WhatsApp keys not yet wired (STATE). peek.gift use:
- **SMS** ✅ — share-by-text, OTP backup, nudge reminders
- **WhatsApp** 💡 — international sharing (huge in non-US markets)
- **Voice** 💡 — outbound call (recipient gets a phone call announcing the gift) — novelty mode
- **Verify** 💡 — alternative auth (Clerk primary; Verify as backup)
- **Studio** 💡 NET-NEW — visual flow builder for recipient outreach campaigns
- **Lookup** 💡 NET-NEW — phone number validation, carrier check before sending
- **Conversations** 💡 NET-NEW — cross-channel messaging (single thread spans SMS + WhatsApp + chat)

### E3. fal.ai 🟡 PARTIAL
Image gen wired (packet 22). Net-new opportunities:
- **Video gen** — fal hosts Pika, Luma, Runway models
- **LipSync** — hero photo "speaks" (says the personal note in narrator voice or curator's cloned voice)
- **Voice gen (TTS)** — alternative to ElevenLabs/Cartesia
- **ControlNet / IP-Adapter** — consistent character across multiple hero variants (princess theme across 3 card backgrounds)
- **Image edit (inpainting, background remove, restyle)**
- **Upscale** — for high-DPI displays / print exports

### E4. Browserbase 🟡 PARTIAL
BUGS.md M13 — endpoint guessed wrong; every call 404s. Effectively unused. peek.gift use: stateful scraping for sites needing session (logged-in pages, gated content). Decision: fix endpoint OR drop until needed. ZenRows covers ~all real traffic today.

### E5. ZenRows ✅ WIRED
99% of scrape volume.

### E6. Jina Reader 💡 NET-NEW (per BUGS.md M12)
Long-tail markdown for AI-friendly content extraction. Third-tier scrape fallback.

### E7. Skimlinks (affiliate outbound) 🟡 PARTIAL
Outbound wrap wired (packet 24). Caveats:
- Webhook signature format guessed (M14)
- Endpoint URL may be stale (BUGS.md trailing notes — real Skimlinks uses `go.redirectingat.com`, not `skimresources.com`)
- **NET-NEW**: Skimlinks API for **catalog search** — currently ABSENT (CONCEPT-INVENTORY §4). This is the missing piece for the `affiliate_search` tool. Curator says "Stanley cups" → search Skimlinks merchant catalog → 3 affiliate-eligible options → curator picks → card auto-wraps.

### E8. Sovrn 🟡 PARTIAL
Wrap wired. No revenue webhook. Same catalog-search gap as Skimlinks.

### E10. PostHog 🟡 PARTIAL
Analytics + provider + LLM observability wired (packet 25). Session replay needs CSP fix (M23 in Wave 1.5 — closed); proxy strips headers (B18 in Wave 1 — closed).
- **Feature flags** 💡 — gate the new cinematic reveal mechanics behind a flag
- **Experiments** 💡 — A/B reveal copy, hero gen prompts, checkout flows
- **Session replay** 💡 — see how recipients interact with the page (powerful for diagnosing why someone bounced from a pick)
- **Surveys** 💡 — post-publish curator NPS

### E11. Inngest ✅ WIRED (packet 26)
3 jobs: nudge-relationships, scrape-worker, webhook-logger. Net-new:
- **share-pack batch gen** post-publish (fan-out N platform variants — couples to A12 Batch API for cost)
- **Recipient drip campaign** (3 nudges over a week if they haven't picked)
- **Curator engagement** (anniversary of last peek → "build another?")
- **Affiliate revenue rollup** (nightly aggregate of Skimlinks/Sovrn revenue per curator → curator dashboard)

### E12. Sentry ✅ WIRED (packet 34)
Errors + breadcrumbs. M23 (CSP for Sentry/PostHog) closed.

### E13. Upstash Redis 🟡 KEYED-NOT-USED
BUGS.md M22 — env vars not on Netlify. Rate limit + idempotency fall OPEN. peek.gift use: rate limiting, idempotency, ephemeral session state, presence ("Frank is editing"), curator anon-turn cap per-IP (M05 carryover).

### E14. Netlify ✅ WIRED
Primary URL is now `vnext.peek.gift` (custom-domain alias). `peek-gift-vnext.netlify.app` still resolves. Cutover to `peek.gift` is a one-domain-add on the same project — see `CUTOVER.md`.

---

## F. NET-NEW MEDIA — voice, camera, video

### F1. Deepgram (STT — speech-to-text) 💡 NET-NEW
Streaming WebSocket STT. ~$0.0043/min. peek.gift use: curator talks the gift into being. Real-time transcription feeds Claude streaming. Drop-in for the mic button (CONCEPT-V2 §2). Latency ~150-300ms streaming.

### F2. ElevenLabs OR Cartesia (TTS — text-to-speech) 💡 NET-NEW
Streaming TTS. ElevenLabs $0.18-0.30 / 1k chars. Cartesia faster latency, similar pricing. peek.gift use:
- Narrator voice on cinematic reveal ("Happy birthday, Sarah, from your dad…")
- Optional voice-of-curator (clone curator's voice from a 30s sample → recipient hears curator read the note)
- Spoken card descriptions for accessibility

### F3. MediaRecorder API (browser-native) 💡 NET-NEW
Free. peek.gift use:
- Camera + mic capture in the chat surface (CONCEPT-V2 §2 `+` menu → Camera)
- **Recipient reaction capture** after reveal ("record your reaction" → uploads to Supabase Storage → embedded back in the page for the curator)
- Curator selfie for the personal-note card

### F4. LiveKit OR Daily.co (real-time voice rooms) 💡 NET-NEW (Tier 2)
WebRTC SaaS. ~$0.0023/min/participant. peek.gift use: real-time co-curation voice chat (curator + co-curator on a call while building together). Tier 2 — only after solo flow is perfect.

### F5. Mux OR Cloudflare Stream OR Bunny (video hosting) 💡 NET-NEW (Tier 1)
Bunny cheapest ($1/1000 min stored + delivered). peek.gift use: recipient reaction videos > 30s, longer-form thank-you messages. Supabase Storage handles short clips; switch to a real video host when length matters.

### F6. fal.ai video gen 💡 NET-NEW
See E3. Cinematic reveal upgrade — hero video instead of static image, LipSync to make hero photo "speak."

---

## G. NET-NEW INTEGRATIONS (verticals beyond core)

### G1. Spotify Web API 💡 NET-NEW (Tier 1)
Free OAuth. **Song cards.** Curator says "her favorite is Taylor Swift" → Spotify search → embedded song card with full player.

### G2. Apple Music API 💡 NET-NEW (Tier 2)
$99/yr Apple Developer. Same as Spotify for Apple users.

### G3. Mapbox OR Google Maps SDK 💡 NET-NEW (Tier 1)
Activity card rendering layer. "Dinner at Carbone" → mini-map with marker + neighborhood vibe. Place data sourced via the activity affiliate APIs (OpenTable, Viator, etc.) — no separate Places API dependency.

### G3a. Booking.com Partner Hub 💡 NET-NEW (Tier 1 — affiliate)
Hotel/lodging affiliate. Free signup. peek.gift use: travel-gift activity cards (honeymoon, anniversary trips). ~4% commission.

### G3b. Expedia Group Partner API 💡 NET-NEW (Tier 1 — affiliate)
Broader travel (hotels + flights + cars + activities). Free signup, harder approval. peek.gift use: cross-vertical travel gifting (honeymoon package, surprise weekend, family reunion).

### G3c. Airbnb Affiliate 💡 NET-NEW (Tier 1 — affiliate)
Via Skimlinks coverage (verify) or direct. peek.gift use: stay-gift cards (anniversary getaway, friend group trip).

### G3d. TripAdvisor Affiliate 💡 NET-NEW (Tier 1 — affiliate)
Reviews + bookings hybrid. peek.gift use: activity / restaurant / hotel cards with social-proof ratings baked in.

### G3e. GetYourGuide Partner 💡 NET-NEW (Tier 1 — affiliate)
Viator competitor, often better international commission. peek.gift use: international tour/experience gifting (European city tours, Asia day-trips).

### G3f. Amazon SiteStripe (Amazon Associates) 💡 NET-NEW (Tier 1 — affiliate)
Amazon is NOT in Skimlinks coverage. Direct integration required if Amazon links are wanted. peek.gift use: ubiquitous product cards (Amazon is where ~70% of US shoppers default to "is it on Amazon?").

### G3g. Apple Services Performance Partners 💡 NET-NEW (Tier 1 — affiliate)
App Store / iTunes / Music / Books / Podcasts affiliate. peek.gift use: digital cards (apps, songs, books, audiobooks, podcasts) with revenue.

### G3h. Walmart Affiliate Program (Impact-managed) 💡 NET-NEW (Tier 1 — affiliate)
Walmart is NOT in Skimlinks. Direct integration. peek.gift use: mass-market product reach (the recipient who shops Walmart, not Bloomingdale's).

### G3i. Target Affiliates Program (Impact-managed) 💡 NET-NEW (Tier 1 — affiliate)
Target NOT in Skimlinks. Direct integration. peek.gift use: same as Walmart — mass-market reach with Target's distinct catalog.

### G3j. Best Buy Affiliate 💡 NET-NEW (Tier 1 — affiliate)
Covered via Skimlinks (no separate signup needed; just verify on activation). peek.gift use: electronics product cards.

### G4. Viator API 💡 NET-NEW (Tier 1 — affiliate)
Tour/experience affiliate. peek.gift use: activity card affiliate wrap when curator picks a tour. Revenue.

### G5. OpenTable API 💡 NET-NEW (Tier 1 — affiliate)
Restaurant reservations + OpenTable Affiliate Network. peek.gift use: activity card → "reserve table" deeplink. Recipient accepts the gift AND books the table.

### G6. Ticketmaster / SeatGeek / Vivid Seats API 💡 NET-NEW (Tier 1 — affiliate)
Event ticket affiliate. peek.gift use: gift cards for shows/concerts/sports.

### G7. TMDB (movies/TV) 💡 NET-NEW (Tier 1)
Free API. **Movie cards.** "She loves The Notebook" → TMDB pulls poster, year, runtime → embed. Link to Apple TV / Prime affiliate for purchase.

### G8. YouTube oEmbed 💡 NET-NEW (Tier 1)
Free. Video card — curator drops a YouTube link → embed.

### G9. Pexels OR Unsplash 💡 NET-NEW (Tier 1)
Free APIs (Unsplash limits 50/hr). Hero fallback if fal.ai gen feels weak. Background textures for vibe styling.

### G10. **Tolt OR Rewardful (creator affiliate program)** 💡 NET-NEW (Tier 1 strategic)
Stripe-native referral SaaS. ~$49-99/mo. peek.gift use: refer-a-creator program. Power-curator brings 10 friends → gets 20% recurring on their first paid peek. Significant viral growth lever. Couples to C9 Stripe Connect for creator payouts.

### G11. Ayrshare OR Buffer (social outbound) 💡 NET-NEW (Tier 2)
$29-49/mo. Cross-platform social posting API. Per STATE packet 27 (drafted, never built). peek.gift use: published peek → "share to my Instagram story?" → posts via API. Power-curator marketing.

### G12. Pinterest API 💡 NET-NEW (Tier 2)
Free OAuth. Pull recipient's Pinterest mood-board for vibe extraction. Outbound — pin the published peek hero to curator's "Gifts" board.

### G13. Instagram Basic Display 💡 NET-NEW (Tier 2)
Pull a photo from curator's IG to use as hero or card image.

### G14. Canva API 💡 NET-NEW (Tier 2)
Power-curator can edit hero in Canva and import back.

### G15. Lottiefiles 💡 NET-NEW (Tier 1 — polish)
Free Lottie hosting. Cinematic reveal accents — sparkles, confetti, hero animations. Richer than CSS/Framer Motion for specific moments.

### G16. Resend Broadcasts / Audiences 💡 NET-NEW (Tier 2)
Marketing list. peek.gift use: re-engagement campaigns, launch announcements. Minimal vs. ad-driven traffic.

---

## H. ARCHITECTURAL QUESTIONS (need decision before spine packets)

### H1. Agent SDK vs raw Messages API
Currently raw (chat loop is our `chatTurn` per packet 17). Adopting Agent SDK → Skills + Memory + Managed Agents as first-class.
- **Pro:** Less orchestration code. Skills + Memory built-in.
- **Con:** Less control over the chat loop. Migration cost is real.
- **Recommendation:** Stay raw for now. Build Skills as system-prompt blocks (see A6). Revisit SDK migration as a focused architectural packet after Wave 2 lands.

### H2. Skills delivery model
- **A1 — Inline:** every chat turn ships ALL skills in the system prompt. Burns cache writes initially but caches well after first turn.
- **A2 — Conditional:** classify occasion type in turn 1 via Haiku, then load only the relevant `peek/occasion-templates/<type>` skill + common skills. Smaller per-turn payload.
- **Recommendation: A2.** Cache the common skills (`curator-protocol`, `vibe-direction`, `copy-house-style`) always. Add the occasion-specific skill once classified.

### H3. Voice latency budget
End-to-end loop: mic → Deepgram STT → text → Claude → ElevenLabs TTS stream → speaker. Target: <1.5s perceived from user-stop-speaking to first-TTS-byte. Sonnet streaming TTFT ~500-800ms. Deepgram STT ~150-300ms. ElevenLabs Flash ~300ms. Total ~1s. Workable.
- **Recommendation: Ship voice as Tier 0, but as a TOGGLE not default.** Type mode is faster for most curators; voice is a feature unlock for those who want it.

### H4. Camera capture flow
- **Recipient reaction:** MediaRecorder → blob → POST → Supabase Storage → CDN URL → store as `recipient_reaction_url` on peek
- **Curator selfie:** same flow. Use as note-card avatar or hero accent.
- **Privacy:** explicit consent toast before recording. Curator can disable recipient reaction in peek settings.

### H5. Co-curation in MVP scope?
CONCEPT-V2 §7 wants it. CONCEPT-INVENTORY §2 — STUB (schema only). **Recommendation: Tier 1, not Tier 0.** Solo-curator flow + checkout must be perfect first. Co-curation is a viral feature, not the core unlock. Schedule for post-Wave 2.

### H6. Affiliate suggestion UI (the absent feature)
CONCEPT-INVENTORY §4 — ABSENT. No "browse suggested products" panel; chat-driven only. BRAIN-DUMP / CONCEPT-V2 §8 wants "Pre-populated 'suggested item' cards." **Tier 0** — Frank explicitly wants this. Implementation: curator-side panel that the AI populates as the chat unfolds. AI calls `affiliate_search` tool → results render as a sidebar deck. Curator drag-and-drops into the card list.

### H7. Reveal mechanics — what "feeling"
Open: magazine-cover-opening / letter-unfolding / box-unwrapping / polaroid-developing. Default (unless Frank picks otherwise): hybrid — hero "lights up" (gentle desaturate → saturate + slow zoom), name "writes itself" (typewriter on short notes, fade on long — already per packet 14), then note, then cards fan in (deck-of-cards spread).

### H8. Voice on/off default
Tier 0 capability but Tier 0 default toggle: **off** for now. Curator opts in via the chat input's mic button. Eventually surface "Voice mode" in chat onboarding once UX is right.

### H9. Tailwind utility classes vs primitive Vibe components
Per prior conversation: **demote Tailwind, don't rip it.** Tailwind becomes layout glue only (flex/margin/positioning). All visual (color/spacing/shape/type) flows from vibe CSS variables via `<VibeText kind="display">`, `<VibeCard shape="organic">`, `<VibeStack gap="airy">` primitives. End state can be tailwind-free; we ship in pieces.

---

## I. TIERED PRIORITY (the dispatch shape)

### Tier 0 — Must integrate to unlock "fucking insane"

| # | Capability | Status | Refs |
|---|---|---|---|
| 1 | Anthropic Prompt Caching across system + tools + Skills | 🔴 | A4 |
| 2 | Anthropic Skills `peek/*` library (conditional load) | 💡 | A6 + H2 |
| 3 | Anthropic Memory tool (curator profile cross-session) | 💡 | A7 |
| 4 | Anthropic Server Web Search (price/availability mid-chat) | 💡 | A9 |
| 5 | Anthropic Files API (large uploads) | 💡 | A8 |
| 6 | Anthropic Extended Thinking (creative tool calls) | 💡 | A5 |
| 7 | **Affiliate search tool** (Skimlinks/Sovrn catalog search → suggestion UI) | 💡 | E7 + E8 + H6 |
| 8 | Activity card affiliate search (Viator + OpenTable + Ticketmaster direct; Stripe Address Element for any address autosuggest needs) | 💡 | G4 + G5 + G6 + C20 |
| 9 | **Voice** (Deepgram STT + ElevenLabs TTS, toggle off default) | 💡 | F1 + F2 + H3 + H8 |
| 10 | **Camera** (MediaRecorder + Supabase Storage) | 💡 | F3 + H4 |
| 11 | Clerk Passkeys + Apple/Google OAuth + magic link | 💡 | B4 + B5 + B2 |
| 12 | Stripe Link + Apple/Google Pay + Klarna/Afterpay/Affirm + customer portal | 💡 | C4 + C5 + C6 + C8 |
| 13 | Stripe `automatic_tax` + `adaptive_pricing` on session create | 🟡 | C2 + C3 (M01) |
| 14 | Supabase Realtime live preview (curator → co-curator → recipient) | 🟡 | D6 |
| 15 | PostHog session replay + flags + experiments | 🟡 | E10 |
| 16 | Share-pack generator (OG card + 6 platform variants, batched via A12) | 🟡 | E11 + A12 |
| 17 | Reaction capture (recipient post-reveal video back into the page) | 💡 | F3 |
| 18 | Twilio WhatsApp activation | 🔴 | E2 |
| 19 | Tailwind demotion → primitive Vibe components | 💡 | H9 |
| 20 | Custom card geometry per type (product / activity / aspirational / digital / joke each get distinct base form, vibe still tints) | 💡 | — |

### Tier 1 — Bells & whistles, high-value adds

- fal.ai video gen + LipSync (E3, F6)
- Spotify song cards (G1)
- Mapbox activity-card maps (G3)
- TMDB movie cards (G7)
- YouTube oEmbed video cards (G8)
- Viator + OpenTable + Ticketmaster affiliate (G4-G6)
- Travel affiliate stack: Booking.com + Expedia + Airbnb + TripAdvisor + GetYourGuide (G3a-G3e)
- Retailer direct affiliates (not in Skimlinks): Amazon + Apple + Walmart + Target (G3f-G3i)
- Best Buy + other Skimlinks-covered retailers — verify-and-flip, no separate signup (G3j)
- Clerk Organizations (co-curation) (B7 + H5)
- Stripe Connect (creator payouts when creator program launches) (C9)
- Anthropic Citations on aspirational cards (A11)
- Anthropic Batch API for nightly catalog enrichment + share-pack gen (A12)
- Twilio Voice + Lookup + Conversations (E2)
- Lottiefiles for reveal accents (G15)
- Pexels/Unsplash hero fallback (G9)
- Tolt or Rewardful creator referral program (G10)
- Mux/CloudflareStream/Bunny for longer reaction videos (F5)
- Google Calendar MCP Connector for repeat-curator nudges (A13)
- pgvector for "similar peeks" / "vibe-match cards" (D3)

### Tier 2 — Post-MVP / strategic

- Anthropic Agent SDK / Managed Agents migration (A14 + H1)
- Anthropic MCP Connectors — Drive, Gmail, Notion, Pinterest (A13)
- Anthropic Code Execution tool (A10)
- Anthropic WIF (A16)
- Ayrshare/Buffer social outbound (G11)
- Pinterest API (G12)
- Instagram Basic Display (G13)
- Canva API (G14)
- Stripe Subscriptions (recurring gifts) (C11)
- Stripe Invoices (corporate) (C12)
- Stripe Identity (KYC for Connect) (C10)
- Clerk B2B / SAML SSO (B12)
- LiveKit/Daily for real-time co-curation voice (F4)
- Twilio Studio (E2)
- Apple Music API (G2)
- Resend Audiences (G16, E1)
- Browserbase endpoint fix or drop (E4, BUGS M13)

---

## J. ACCOUNT / KEY SIGNUP CHECKLIST (Frank tasks)

Per PROD-PARALLEL POLICY in CLAUDE.md: **do NOT provision proactively**, surface and let Frank decide. Required to unlock Tier 0 / Tier 1.

| Service | Action | Tier | Why |
|---|---|---|---|
| Stripe Dashboard | Activate Tax + complete business profile + tax_code on prod + register origin state | 0 | Required for live checkout (STATE Stripe owner-tasks) |
| Clerk Dashboard | Confirm `vnext.peek.gift` AND `peek-gift-vnext.netlify.app` are authorized origins (URL audit will confirm) | 0 | Auth from both URLs |
| Netlify env | `GUEST_CLAIM_TOKEN_SECRET` ≥32 chars | 0 | Recipient HMAC fail-closed |
| Netlify env | `UPSTASH_REDIS_REST_URL` + `_TOKEN` (Upstash account first) | 0 | Idempotency + rate limit (BUGS M22) |
| Netlify env | Sentry DSN + org + project + auth token | 0 | Error visibility |
| Skimlinks | Account approval | 0 | Revenue — affiliate_search tool |
| Sovrn | Account approval | 0 | Affiliate fallback |
| Deepgram | Signup, key | 0 | Voice STT |
| ElevenLabs OR Cartesia | Signup, key | 0 | Voice TTS |
| Twilio | WhatsApp Business approval | 1 | International + WhatsApp share |
| Spotify | Web API developer signup (free) | 1 | Song cards |
| Mapbox OR Google Maps SDK | Account, key | 1 | Activity maps |
| Viator | Affiliate partner approval | 1 | Tour affiliate |
| OpenTable | Affiliate program signup | 1 | Restaurant affiliate |
| Ticketmaster Partner Network | Application | 1 | Event affiliate |
| Booking.com Partner Hub | Free signup | 1 | Hotel/lodging affiliate (~4% comm) |
| Expedia Group Partner API | Free signup, harder approval | 1 | Cross-vertical travel (hotels + flights + cars) |
| Airbnb Affiliate | Verify Skimlinks coverage first; else direct | 1 | Stay-gift cards |
| TripAdvisor Affiliate | Application | 1 | Reviews + bookings hybrid |
| GetYourGuide Partner | Application | 1 | Tours/experiences (better intl commission than Viator) |
| Amazon Associates (SiteStripe) | Application — NOT in Skimlinks; direct required | 1 | Amazon product cards (~70% of US shoppers' default retailer) |
| Apple Services Performance Partners | Application | 1 | App Store / iTunes / Music / Books / Podcasts digital cards |
| Walmart Affiliate (Impact) | Application — NOT in Skimlinks; direct required | 1 | Mass-market product reach |
| Target Affiliates (Impact) | Application — NOT in Skimlinks; direct required | 1 | Mass-market product reach |
| Best Buy Affiliate | Covered via Skimlinks — verify on activation, no separate signup | 1 | Electronics product cards |
| Tolt OR Rewardful | $49-99/mo | 1 | Creator referral |
| Ayrshare OR Buffer | $29-49/mo | 2 | Social outbound |
| Pinterest | Free OAuth | 2 | Inbound mood-board |
| Instagram | Basic Display app | 2 | Inbound photo |
| Mux OR Cloudflare Stream OR Bunny | Pay-as-you-go | 2 | Longer reaction videos |
| Canva | API access | 2 | Power-curator design import |
| Apple Developer | $99/yr | 2 | Only if Apple Music integration |

> **Affiliate signup principle:** Skimlinks + Sovrn cover MOST major retailers (Nordstrom, Macy's, Bloomingdale's, Sephora, Etsy, etc.) without separate signup — outbound link wrap auto-attributes. Only **Amazon, Apple, Walmart, Target** need direct integration because they're not in those networks. Travel/lodging (Booking, Expedia, Airbnb, TripAdvisor, GetYourGuide) need direct affiliate accounts because Skimlinks coverage is weak in travel. Tier 1 across the board because approval cycles are slow (1-6 weeks) — start applications in parallel as soon as the spine ships.

---

## K. WHAT'S NEXT (orchestrator's dispatch plan)

Build order to ship the spine:

1. **`SPINE/CURATOR_PROMPT.md`** *(next turn)* — Peek's system prompt. Mobile-first chat UI (text + mic + `+` attachment menu mirroring Claude mobile app). Identity, the fields it collects + WHY each (recipient / occasion / vibe / hero / cards / rules / note / countdown / share / collab / checkout), conversational rules (one Q at a time, mid-stream tool calls, propose-don't-lecture, surprise-don't-ask), house tone with "Peek would say X / would never say Y" examples (per BRAIN-DUMP open Q2). Bookends: landing/auth front, checkout back.

2. **`SPINE/SLUG_MODEL.ts`** *(next turn)* — one zod-validated schema. Discriminated union on card types. Vibe re-skins per occasion. Same shape for princess-bday → bachelorette → wedding → 80th-birthday.

3. **`SPINE/TOOL_MANIFEST.md`** *(next turn)* — every tool Peek can call, with zod schema + side effect + vendor routing. ~28 tools total (13 existing + ~15 new).

4. **`SPINE/skills/peek-*.md`** *(later — can dispatch to worker)* — the conditional skill library (9 files: curator-protocol, occasion-templates/*, vibe-direction, image-direction, copy-house-style, share-mechanics, reveal-mechanics, affiliate-strategy, rules-engine-patterns, voice-camera-protocol).

5. **Dispatch packets** — once spine lands, draft packets that implement piece-by-piece. Workers use the spine as canonical reference.

Order of dispatch (Tier 0 first, parallel where safe):

1. **Packet 40 — Prompt caching** (1-line system + tool prefix; massive cost win)
2. **Packet 41 — Anthropic surface expansion** (Memory + Files API + Web Search + Extended Thinking wiring)
3. **Packet 42 — Affiliate search + suggestion UI** (Skimlinks/Sovrn catalog search, curator sidebar deck)
4. **Packet 43 — Voice mode toggle** (Deepgram + ElevenLabs/Cartesia streaming pipe)
5. **Packet 44 — Camera capture** (MediaRecorder → Storage; reaction capture flow)
6. **Packet 45 — Stripe surface expansion** (Link + Apple/Google Pay + Klarna/Afterpay/Affirm + customer portal + Address Element for address autosuggest)
7. **Packet 46 — Clerk surface expansion** (Passkeys + magic link + social OAuth)
8. **Packet 47 — Realtime live preview** (Supabase Realtime → co-curator + recipient see edits live)
9. **Packet 48 — Share-pack batch gen** (Inngest fan-out + Batch API; 6 platform variants generated post-publish)
10. **Packet 49 — Tailwind demotion + primitive Vibe components** (long-running refactor; ship in pieces)
11. **Packet 50 — Custom card geometry per type** (ProductCard / ActivityCard / AspirationalCard / DigitalCard / JokeCard each get distinct base form)

Wave 2 BUGS items (per BUGS.md "Recommended next wave priorities") parallel to this — those keep the build serviceable while the spine ships.

---

_Source-of-truth ownership: this file is canonical. If any spine doc, packet, or worker brief contradicts this, the contradiction is wrong (or this file needs a follow-up update). Update on every meaningful capability addition or status change._
