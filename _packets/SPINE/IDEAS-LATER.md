# IDEAS-LATER — speculative capabilities deferred from CAPABILITY_INVENTORY

Trimmed from `CAPABILITY_INVENTORY.md` 2026-05-28 per Frank: "all killer no filler." Not blocking the build; not currently keyed; not aligned with the in-flight surface. Keep the thinking — bring back when the product surface that needs it is being tested.

**Rules to graduate something back to `CAPABILITY_INVENTORY.md`:**
- Frank wants it; OR
- A packet in flight needs it; OR
- A product surface is shipping that depends on it.

---

## Travel APIs (all deferred — no affiliate accounts, not in roadmap)

- **Viator API** — tour/experience affiliate. Activity cards.
- **OpenTable API** — restaurant reservations affiliate. Activity cards with "reserve table" deeplinks.
- **Booking.com Partner Hub** — hotel/lodging affiliate (~4% comm).
- **Expedia Group Partner API** — broader travel (hotels + flights + cars + activities).
- **Airbnb Affiliate** — stay-gift cards.
- **TripAdvisor Affiliate** — reviews + bookings hybrid.
- **GetYourGuide Partner** — Viator alternative, better international comm.
- **Ticketmaster Partner Network** — event ticket affiliate.
- **SeatGeek Affiliate** — Ticketmaster alternative.
- **StubHub Affiliate** — Ticketmaster alternative.

Bring back when: activity-card surface ships AND Frank wants direct affiliates beyond Skimlinks-covered.

---

## Major-retailer direct affiliate signups (slow approval, not blocking ship)

- **Amazon Associates / SiteStripe** — Amazon product cards. NOT in Skimlinks; direct integration required. ~70% of US shoppers default here.
- **Apple Performance Partners** — App Store / iTunes / Music / Books / Podcasts digital cards.
- **Walmart Affiliate (via Impact)** — mass-market product reach.
- **Target Affiliates (via Impact)** — mass-market product reach.
- **eBay Partner Network** — eBay listings.

Bring back when: catalog scope demands beyond Skimlinks coverage.

---

## Music / video integrations (digital-card surface, not Tier 0)

- **Spotify Web API** — song cards. Free OAuth, 5-min signup.
- **Apple Music API** — same as Spotify for Apple users. $99/yr Apple Dev required.
- **YouTube oEmbed** — free, video card embed.
- **TMDB** — free, movie/TV cards.
- **Pinterest API** — pull recipient's mood-board for vibe extraction.
- **Instagram Basic Display** — pull a photo from curator's IG.
- **Canva API** — power-curator design import.

Bring back when: card types beyond product/activity/aspirational/digital matter.

---

## Real-time voice / video hosting (Tier 2 — post-MVP)

- **LiveKit / Daily.co** — WebRTC for real-time co-curation voice. ~$0.0023/min/participant.
- **Mux / Cloudflare Stream / Bunny** — video hosting for recipient reaction videos > 30s. Bunny cheapest.

Bring back when: co-curation voice or long-form video unlocks.

---

## Polish / fallback (low priority)

- **Lottiefiles** — free Lottie hosting for cinematic reveal accents (sparkles, confetti).
- **Mapbox / Google Maps SDK** — activity-card maps. Stripe Address Element covers autosuggest needs.

Bring back when: reveal polish phase OR map rendering needed for an activity card.

---

## Anthropic Tier 2

- **Code Execution tool** — sandboxed Python. Date math, currency conversion, CSV exports for corporate bulk gifting. Tier 2 — not Tier 0.

Bring back when: corporate / bulk-gift product surface ships.

---

## Stripe product-surface deferrals

- **Stripe Connect** — creator marketplace payouts. Couples to a creator-affiliate program.
- **Stripe Subscriptions** — recurring gifts ("give Mom a monthly peek for a year").
- **Stripe Invoices** — corporate gifters, bill-me invoicing.
- **Stripe Identity** — KYC for Connect creators.

Bring back when: creator program, recurring gifts, or corporate gifting ships.

---

## Marketing / outbound deferrals

- **Resend Audiences / Broadcasts** — marketing list, re-engagement campaigns.
- **Ayrshare / Buffer** — cross-platform social posting API. ~$29-49/mo.
- **Twilio Studio** — visual flow builder for recipient outreach campaigns.

Bring back when: marketing surface or power-curator outbound matters.

---

## Creator affiliate / referral

- **Tolt / Rewardful** — Stripe-native referral SaaS. ~$49-99/mo. Refer-a-creator program.

Frank's call (2026-05-28): "we don't have affiliates right now." Bring back when: creator program ships.

---

## Capability ideas captured but not active

(Anything below this line is preserved from prior brainstorms. Not blocking. Not on the roadmap. Remove if/when it becomes irrelevant.)

### Affiliate signup principle (preserved context)

Skimlinks + Sovrn cover MOST major retailers (Nordstrom, Macy's, Bloomingdale's, Sephora, Etsy, etc.) without separate signup — outbound link wrap auto-attributes. Only **Amazon, Apple, Walmart, Target, eBay** need direct integration because they're not in those networks. Travel/lodging (Booking, Expedia, Airbnb, TripAdvisor, GetYourGuide) need direct affiliate accounts because Skimlinks coverage is weak in travel. Approval cycles slow (1-6 weeks).

### Anthropic MCP Connectors (post-MVP catalog of options)

Anthropic-hosted connectors that exist but aren't yet integrated: Google Drive, Calendar, Gmail, Slack, GitHub, Asana, Linear, Notion, Box, Canva, Atlassian, PayPal, Plaid, Salesforce, Stripe, Zapier. Most compelling for peek.gift:
- **Google Calendar** — auto-detect anniversaries/birthdays from curator's calendar. Repeat-buyer engagement loop.
- **Google Drive** — pull a photo album for hero/card image selection.
- **Gmail** — reference an old email thread for a memory card.
- **Notion** — power-curator pulls from a planning doc.
- **Pinterest (if connector exists)** — recipient's mood board for vibe signal.

Bring back when: power-curator engagement loop is the focus, OR when calendar-triggered repeat purchases become a measurable KPI.

### Anthropic Agent SDK / Managed Agents

First-class agent infra (Skills + Memory as native). Reduces orchestration code; less control over chat loop. Currently raw `chatTurn` per packet 17. Revisit as focused architectural packet post-Wave 2.

### Anthropic WIF (Workload Identity Federation)

Removes long-lived keys from deploy surface. Per-environment keys reduce blast radius. Useful once prod/staging traffic separation matters.

### Twilio extras

- **Voice** — outbound call (recipient gets a phone call announcing the gift). Novelty mode.
- **Verify** — alternative auth (Clerk primary; Verify as backup).
- **Lookup** — phone number validation, carrier check before sending.
- **Conversations** — cross-channel messaging (SMS + WhatsApp + chat single thread).

### Browserbase

BUGS.md M13 — endpoint guessed wrong; every call 404s. Decision: fix endpoint OR drop. ZenRows handles ~100% of real traffic today. Defer until session-aware scraping is actually needed.

### Pexels / Unsplash

Free image APIs (Unsplash 50/hr limit). Hero fallback if fal.ai gen feels weak. Background textures.

### pgvector

Installed but unused. peek.gift use: embedding search for "find similar peeks" or "what cards work for this vibe." Enable when semantic search ships.

### Clerk B2B / SAML SSO

Corporate gifting product surface (post-MVP).

### Clerk Impersonation

Support tool — Frank/team impersonates a stuck curator to debug.

### Supabase Edge Functions

Low-latency endpoints. Could host realtime presence ("X is editing"). Probably skip — Next routes serve well.

### Supabase pg_cron / Database webhooks

Cheaper than Inngest for simple periodic jobs. Probably skip — Inngest already wired.
