# peek.gift / PerfectPurchase — Backend & Vendor Services

_Snapshot, **reviewed & re-prioritized 2026-05-29.** "In place" + key columns reflect the last successful Netlify env read this session (MCP gateway flaky since — not re-verified live). Planned/Candidate keys are TBD (no account). Latent capabilities are vendor-published, not recommendations._

**Status tiers (progress):** In place (keyed, working) → In flight (being keyed now) → Planned (identified need / advisable, not started) → Candidate (optional / speculative / alternative)
**Horizon (when needed):** Now · Near · Platform · Later · Scale
_(Status and Horizon are orthogonal: a thing can be **not started yet** but needed **Now**. Those are the dangerous ones.)_

---

> ### Launch reality — Tier 1 needs zero new vendors
> The core loop — **land → Clerk auth → Anthropic builds the page → $12 Stripe → Resend notifies you** — is fully closed by *In place* services. **Nothing below "In place" blocks a working Tier-1 launch.** The rest is the catalog moat (Platform+), hardening (Near), or features (Later). A 45-row inventory is not a 45-item to-do list.

> ### Next keys, in order
> 1. Finish wiring **fal** + **Upstash** (already in flight).
> 2. **Turnstile** (abuse/bot) **before the guest chat goes public** — open chat → Anthropic = live cost-burn the moment it's abused. Free.
> 3. **Image moderation** **before public publish goes live** — hard safety/legal gate.
> 4. A **multimodal embeddings** provider when the catalog work starts.
>
> Everything else genuinely waits.

---

| Service | Status | Horizon | Role / usage | Key(s) / ID | Notes |
|---|---|---|---|---|---|
| Anthropic | In place | Now | LLM — chat loop, vision, Zod tools, edge client | `ANTHROPIC_API_KEY` | Sonnet 4.6 live; Opus 4.8 opt-in; web_search enabled; latent: Batch, Citations, Skills, Files, caching |
| Clerk | In place | Now | Auth — sessions, sign-in/up, webhooks | `CLERK_SECRET_KEY`, `*PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, sign-in/up URLs, `ADMIN_CLERK_USER_IDS` | Live, shared w/ legacy; planned: headless custom UI, OAuth; latent: Orgs/SAML, MFA, passkeys |
| Stripe | In place | Now | Payments — $12 Checkout Session, webhook (12 events), Tax, Adaptive Pricing | `STRIPE_SECRET_KEY`, `*PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `PAY_MODE`, `STRIPE_ADAPTIVE_PRICING`; `acct_1T4xnb…`; `we_1Tb7Ph…` | Live; planned: custom Payment Element, BNPL, Connect (creator payouts), Subscriptions, Invoices |
| Supabase | In place | Now | DB/storage — peek_v2 (**14 tables**, RLS), Storage, Drizzle | `SUPABASE_URL`, `NEXT_PUBLIC_*`, `SERVICE_ROLE_KEY`, `DATABASE_URL`, bucket vars; `ewqpujqerdnrkjqlpobo` | 14th table = `curator_memory` (Anthropic Memory backing store). pgvector available, not installed; planned: pgvector (graph), Realtime (collab); latent: Edge Fns, pg_cron, branching |
| Resend | In place | Now | Email — transactional | `RESEND_API_KEY`, `NOTIFICATIONS_FROM` | DKIM verified; latent: Audiences/Broadcasts |
| ZenRows | In place | Now | Scrape — primary in fallback chain | `ZENROWS_API_KEY` | latent: JS render, residential proxies, CAPTCHA |
| Browserbase | In place | Platform | **Browser agent (Stagehand)** — checkout/fulfillment automation; scrape fallback only secondary | `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID` | proj `5221d287…`. **Real value is the Stagehand agent (the PerfectPurchase "money button"), not scrape-#2.** Running it today purely as fallback behind ZenRows is premature spend unless ZenRows is actually missing pages — park the cost, keep the intent |
| PostHog | In place | Now | Analytics — events wired | `NEXT_PUBLIC_POSTHOG_KEY`, `_HOST` | org peekgift, proj `434015`; planned: replay, flags, experiments, LLM observability, meter cohorts |
| Google Places | In place | Now | Address autosuggest (legacy, unused in vNext) | `GOOGLE_PLACES_API_KEY`, `VITE_*` | kept for glacialsips; planned: drop (Stripe Address Element) |
| Netlify | In place | Now | Deploy host; Edge Fns for chat loop | env store; site `932646db…` | `vnext.peek.gift`; latent: Blobs (KV), Background Fns, Image CDN |
| GitHub | In place | Now | Source control — repo, branches, PRs (MCP) | OAuth; `glacialsips-site/grook-peekgift` | latent: Actions CI |
| fal.ai | In flight | Now | Image gen — code wired, no-op until key | `FAL_KEY` | key pasted in chat, not rotated per Frank; planned: hero/card gen, video, LipSync |
| Upstash Redis | In flight | Now | Rate-limit / idempotency — not yet wired | `UPSTASH_REDIS_REST_URL`, `_TOKEN`; `probable-lemur-138225` | Chrome agent assigned; planned: meter counters, rate limit, webhook idempotency, presence; latent: Vector, QStash, Kafka |
| Bot / abuse protection | **Planned** | **Now** | Protect free guest chat from abuse / API cost-burn | TBD (Cloudflare **Turnstile** / hCaptcha) | **GATE before the public guest chat.** Open chat calling Anthropic = a live financial wound the moment a bad actor finds it. Turnstile is free — not optional, just cheap |
| Content moderation | **Planned** | **Near (gate)** | Screen curator text + images before public publish | TBD (Anthropic/OpenAI text; **Hive / AWS Rekognition** image) | text partly coverable via Anthropic; **image moderation is the gap.** **Hard gate before "public publish" goes live** — one bad image on a public shareable link = legal/brand event. Doesn't block coding; blocks launch of public pages |
| Sentry | In flight | Near | Error tracking — build-wrapped, runtime no-op | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `_AUTH_TOKEN`, `_ORG`, `_PROJECT` | org peekgift `4511426433646592` |
| Inngest | In flight | Near | Background jobs — not yet wired | `INNGEST_EVENT_KEY`, `_SIGNING_KEY` | no account yet; planned: nudge emails, scrape retries, webhook logger |
| Embeddings provider | Planned | Near | Generate text **+ image** vectors (**multimodal**) | TBD (**Voyage multimodal / Cohere Embed v4 / Jina CLIP**) | **hard dep** — pgvector only *stores*; Anthropic provides none. **Pick a multimodal model — NOT text-only `text-embedding-3-small`.** The photo-of-room / reef-tank feature needs image vectors; choosing text-only now = re-picking later |
| Secrets manager | Planned | Near | Scoped, audited secrets vault | TBD (Doppler / Infisical) | advisable post-leak; not a hard dep (Netlify env works) |
| Product data sourcing | Planned | Platform | Catalog the advisor recommends from | TBD (Shopping Content API, Shopify `/products.json`, GTIN lookup) | required for PerfectPurchase; scrape + affiliate feeds partial. See affiliate rows — some aggregator feeds double as this |
| Fulfillment / order-routing | Planned | Platform | "Supplier ships direct, zero inventory" | TBD (dropship / supplier APIs) | no backend today; Tier 1 punts to curator. Pairs with Browserbase/Stagehand for the automated path |
| Domains / DNS automation | Planned | Platform | Programmatic domain per vertical | TBD (Cloudflare / Netlify domains API) | 700-site scale |
| AI gateway | Candidate | Near | Multi-model routing, fallback, cost/cache | TBD (Portkey / OpenRouter / CF AI Gateway / LiteLLM) | optimization once on multiple models |
| Ad pixel / Conversions API | Candidate | Near | Conversion tracking/attribution for ads | TBD (Meta Pixel+CAPI, TikTok Pixel) | Instagram is the channel; server-side CAPI for post-iOS attribution; distinct from PostHog |
| Twilio | Candidate | Later | SMS / WhatsApp share | `TWILIO_*` | 10DLC vetting takes weeks; latent: Voice, Verify, Lookup |
| Deepgram | Candidate | Later | Voice STT (mic mode) | `DEEPGRAM_API_KEY` | $200 credit |
| ElevenLabs / Cartesia | Candidate | Later | Voice TTS (reveal narration) — pick one | `ELEVENLABS_API_KEY` or `CARTESIA_API_KEY` | Cartesia lower latency; ElevenLabs more voices |
| LiveKit / Daily | Candidate | Later | Real-time voice/video (co-curation) | TBD | — |
| Mux / CF Stream / Bunny | Candidate | Later | Video hosting (reaction clips) | TBD | Bunny cheapest |
| Advisor grounding search | Candidate | Later | Product research grounding | TBD (Exa / Tavily) | complements Anthropic web_search |
| Link shortener | Candidate | Optional | Clean share links + click analytics | TBD (Dub.co — OSS) | small, peek.gift-relevant |
| Translation / i18n | Candidate | Later | Multi-language gift pages + advisor | TBD (DeepL / Google Translate) | pairs with Stripe Adaptive Pricing (international) |
| Dedicated search | Candidate | Scale | Search beyond pgvector | TBD (Typesense / Algolia / Turbopuffer) | — |
| Image optimization | Candidate | Scale | Serve/optimize user+generated images | TBD (Cloudinary / imgix) | Netlify Image CDN partial |
| Jina Reader | Candidate | Later | Scrape fallback (markdown) or embeddings | TBD | free tier; overlaps embeddings row (Jina also does CLIP multimodal) |
| Mapbox / Maps SDK | Candidate | Later | Activity-card maps | TBD | — |
| Lottiefiles | Candidate | Later | Reveal accents (sparkle/confetti) | TBD | — |
| Tolt / Rewardful | Candidate | Later | Creator referral SaaS | `TOLT_API_KEY` | likely replaced by Stripe Connect |
| Klaviyo / Customer.io | Candidate | Later | Lifecycle/marketing email | TBD | overlaps Resend Audiences |
| EasyPost / Shippo | Candidate | Platform | Shipping rates/labels/tracking | TBD | only if fulfillment owned |
| Motherduck / BigQuery | Candidate | Scale | Warehouse + BI (cross-vertical $) | TBD | overlaps PostHog Data Warehouse |
| Gorgias / Intercom | Candidate | Later | Support inbox | TBD | — |
| Axiom / Better Stack | Candidate | Scale | Logs / APM / uptime | TBD | overlaps Sentry/PostHog partially |
| Affiliate — aggregators | Candidate | Post-traffic (money) / Platform (data) | **Two jobs:** (1) auto-attribution link-wrap *revenue*; (2) **product-data feeds for the catalog** | `SKIMLINKS_PUBLISHER_ID`+`_WEBHOOK_SECRET`, `SOVRN_API_KEY`; others TBD | Skimlinks+Sovrn cover ~80% incl. Etsy. Also Awin ($5 dep), Impact, CJ, Rakuten. **Monetization** needs live + traffic + manual review (post-traffic). But Skimlinks/Impact/CJ also expose **product catalogs/APIs** — that *data* need is separate and may justify feed access earlier, with the catalog build |
| Affiliate — direct retailer | Candidate | Post-traffic | Per-retailer programs | TBD | Amazon Associates (180-day/3-sale probation; only truly-separate add), eBay (instant approval), Apple (limited), Walmart+Target (via Impact), Etsy (via Awin) |
| Travel / experiences | Candidate | Later | Activity/booking cards | TBD | Viator, GetYourGuide, OpenTable, Booking, Expedia, Airbnb, TripAdvisor |
| Events / tickets | Candidate | Later | Ticket cards | TBD | Ticketmaster, SeatGeek, StubHub |
| Content cards | Candidate | Later | Music/movie/social embeds | TBD | Spotify (free OAuth), Apple Music ($99/yr), YouTube oEmbed (no key), TMDB (free), Pinterest, Instagram, Canva |

## Collapse-on-sight (don't let these become parallel line items)
- One TTS (ElevenLabs **or** Cartesia)
- One replay tool (Sentry Session Replay **vs** PostHog Replay)
- One vector store (pgvector **vs** Upstash Vector)
- One image-moderation vendor (Hive **vs** Rekognition — don't run both)
- Stripe **Connect** instead of Tolt/Rewardful for creator payouts
- Resend Audiences may cover Klaviyo/Customer.io for v1

## Latent uses of services already in place
- **Stripe Connect** → creator-affiliate payouts (no new vendor)
- **Browserbase Stagehand** → AI agent for retailer checkout/fulfillment automation (the PerfectPurchase money button)
- **Supabase Realtime** → live collab + "recipient is viewing" presence
- **Anthropic code_execution** → currency/date math, CSV exports (corporate bulk gifting)
- **fal video / LipSync** → hero photo "speaks" in the reveal
- **Netlify Blobs** → simple KV without standing up Upstash

---

### What changed in this revision
- Added **Launch reality** + **Next keys, in order** callouts up top.
- Promoted **Bot/abuse protection** to **Now** + flagged it and **image moderation** as hard launch **gates** (Status/Horizon are orthogonal — these are "not started but needed now").
- Sharpened **Embeddings** to **multimodal** (ruled out text-only `text-embedding-3-small`).
- Reframed **Browserbase** as the **Stagehand agent** play, not scrape-#2 (park the spend).
- Split **affiliate aggregators** into their two jobs — link-wrap *revenue* (post-traffic) vs. *product-data feeds* (catalog, earlier).
- Corrected Supabase **13 → 14 tables** (`curator_memory`).
- Kept your structure, the collapse-on-sight / latent-uses sections, and the self-dated staleness flag.
