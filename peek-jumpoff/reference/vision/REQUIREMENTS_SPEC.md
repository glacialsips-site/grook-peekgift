# peek.gift — REQUIREMENTS & SYSTEM SPEC
### Everything you've actually specified, pulled from both transcripts (2026-05-28 + 2026-05-29), informal talk stripped, grounded against the live database.

**What this is:** your signal, extracted and organized — not a transcript. Banter, philosophy, and the Citi stories are removed. Where you stated a requirement, it's here. Where you named an area but said little (social, collab ops, Netlify ops), it's captured *and flagged thin* so you know exactly where to drop your "100 more." Backend section is grounded in the **real `peek_v2` schema** I read live, not in claims.

**Sourcing tags:** ⟦spec⟧ stated directly · ⟦live⟧ verified in the database · ⟦thin⟧ you named it, needs more from you.

---

## 1. PRODUCT DEFINITION ⟦spec⟧

peek.gift is a **mobile-first app** (you concluded it *should* be an app, not a website — "websites are basically dinosaurs"), structured as a **Claude-style chat experience bookended by a landing page → authentication → checkout.**

The core loop:
- **User 1** (the curator) talks to a chat. The chat ingests **text, URLs, images, voice, camera** — the standard Claude-mobile input set.
- The chat has a **transparent background** and floats over a **live preview of a page being built in real time behind it,** fully visible when the keyboard collapses.
- The chat's job: collect information from User 1 to **populate that page.**
- The finished page is **linked and sent to User 2** (the recipient).

**The value proposition (your words):** kill the generic/boring gift — the Amazon gift card, the guessed-wrong present that's close but not right, that the recipient feels obligated to fake gratitude for, that wastes money and lands flat. The fix is **radical personalization of the page for User 2.**

---

## 2. THE TWO SURFACES ⟦spec⟧

**Creator surface (User 1):** the translucent chat over the live, building preview. Keyboard-collapse reveals the full page. The page is built of:
- a **hero image** — user-provided *or* AI-generated;
- **hero / sub-hero / sub-sub-hero text** — user-provided or chat-amended;
- below the hero, **item cards** populated by User 1 via the chat.

**Recipient surface (User 2):** the shared page, radically re-themed per occasion (see §3). User 2 browses item cards and makes selections within the spending caps User 1 set.

---

## 3. THE PERSONALIZATION / VIBE ENGINE ⟦spec⟧ — *the core value*

A **"styles / vibe / font / etc." engine** that radically alters the look and feel of the page presented to User 2. Your canonical example: **a little girl's princess birthday vs. a 30-year-old dude's bachelor party look completely different.**

- It pulls from **User 1's entries**, and User 1 can **request tweaks via chat.**
- ⟦live⟧ Each peek already carries a `vibe` jsonb field — the engine has a home in the data model.
- This is the differentiator. (Open gap: an **aesthetic quality gate** — see §14. Valid/accessible ≠ beautiful/on-vibe, and beauty is the moat.)

---

## 4. ITEM CARDS, VARIANTS, CAPS ⟦spec⟧ / ⟦live⟧

**Item sources** — a card may be:
- an item from **any online retailer or service**,
- a **custom "homemade" item**,
- an **experience booked online**, or
- a **custom User-1-entered experience.**

**Variants:** User 1 can offer **multiple versions of an item** (a selection of similar items for User 2 to choose among). ⟦live⟧ Modeled as `variant_groups` with `selection: pick_one | pick_any | pick_all`.

**Spending caps:** there may be **more items than User 2 can select**, governed by **hard and soft spending caps** set by User 1. ⟦live⟧ `peeks.budget_cents` exists; cards carry `value_cents`.

⟦live⟧ Cards also already support: type (`product | activity | aspirational | digital`), `is_taunt`/`taunt_text` (the "JUST PLACED"-style taunt mechanic), `is_locked`/`unlock_rule`, `reveal_value`, `proposed_date`, `location_hint`, `source_citations`.

---

## 5. MERCHANTS & AFFILIATES ⟦spec⟧

**Intelligent affiliate suggestion** is a named core feature — surface affiliate-seller products intelligently inside curation. ⟦live⟧ Cards carry `affiliate_url`, `affiliate_network`, `commission_pct`; an `affiliate_revenue` table tracks `network`, `external_txn_id`, amounts, commission, status.

**Your feed/merchant list (so you stop relying on scraping + screenshots + web_search for everything):**

*Affiliate aggregators (one signup → many retailers):*
- **Skimlinks** — ~25k retailers (Nordstrom, Macy's, Sephora, Ulta, REI, Lululemon, Etsy, Wayfair, Best Buy…), auto-attributes.
- **Sovrn** (ex-VigLink) — fallback for Skimlinks gaps.
- **Impact** — brokers Walmart + Target + many DTC brands.
- **CJ Affiliate** — major aggregator, similar to Impact.
- **Rakuten Advertising** — third major aggregator.

*Direct retailer programs (aggregators don't cover these):*
- **Amazon Associates / SiteStripe** (must be direct — ~70% default to Amazon).
- **Apple Performance Partners** (App Store / iTunes / Music / Books / Podcasts).
- **Walmart Affiliate** (via Impact), **Target Affiliates** (via Impact), **eBay Partner Network.**

*Travel / experiences (separate networks):*
- **Viator, OpenTable, Booking.com, Expedia Group Partner API** (broadest — hotels/flights/cars/activities), **GetYourGuide, TripAdvisor, Airbnb, Ticketmaster, SeatGeek, StubHub.**

**The strategic upgrade (agreed):** these aren't just link-wrappers — they expose **product feeds/APIs**. Ingest them into **one normalized product graph you own**; feeds become primary, scraping/web_search drop to fallback for the long tail (custom/homemade/boutique). Add the **big missing sources**: Google **Shopping Content API**, Shopify **`/products.json`**, **Etsy/Faire**, Amazon **PA-API**. (Full catalog architecture = §14, the real net-new moat.)

---

## 6. COLLABORATION ⟦spec⟧ / ⟦thin⟧

User-1-type users can **collaborate** — named as a significant feature. ⟦live⟧ Modeled as `peek_collaborators` with `role: organizer | co_organizer | contributor`, invite tokens, accept flow (table exists, 0 rows — built, not yet exercised).
> ⟦thin⟧ Beyond "User 1s can collaborate," you haven't specified the rules: who can edit what, invite/approval flow, multi-organizer caps, conflict handling. **Drop detail here.**

---

## 7. SOCIAL MEDIA INTEGRATION ⟦spec⟧ / ⟦thin⟧

Named twice as a **significant feature** ("don't forget about the social media aspect").
> ⟦thin⟧ No specifics given yet — share-to-social, social login, social discovery/virality, OG-card sharing, referral mechanics are all undefined. **This section is a scaffold waiting on you.**

---

## 8. FULFILLMENT, TIERS & PRICING ⟦spec⟧ / ⟦live⟧

- **Tier 1:** the product **emails/SMSs User 1 the confirmation of User 2's selections; User 1 handles fulfillment themselves.** A **nominal flat fee.**
- ⟦live⟧ The publish gate is **$12** (Stripe price `price_1TapZICEKPUsVee1ddG4n14M`, `PAY_MODE=live`, NJ tax active).
- ⟦spec⟧ Checkout is **full-custom Stripe, every country (except sanctioned), every currency, including tax and coupons.**
- ⟦live⟧ Lifecycle modeled in `peeks.status`: `draft → ready_for_publish → published → claimed → archived`; `picks` table carries `beg_message`/`beg_approved_at`, `fulfilled_at`, `fulfillment_notes`.

---

## 9. BACKEND SYSTEMS — grounded in the live `peek_v2` schema ⟦live⟧

Project `ewqpujqerdnrkjqlpobo` (Supabase, us-east-1, PG 17.6). **RLS on all 14 tables.** Row counts = real usage, not stubs.

| Table | Rows | What it does |
|---|---|---|
| `users` | 3 | Clerk-keyed users; `tier`. |
| `peeks` | 45 | **The core document** — hero (image/source/prompt), `vibe` jsonb, occasion, relationship, `budget_cents`, `status` lifecycle, Stripe IDs, `share_url`, `giver_names[]`, `recipient_profile`. |
| `cards` | 33 | **Items** — type, affiliate fields, value, taunt, lock/unlock, citations, `variant_group_id`. |
| `variant_groups` | 10 | **Bundles/sets** — `selection: pick_one/any/all`, position. |
| `picks` | 0 | Recipient selections — signature, note, beg flow, fulfillment. |
| `peek_collaborators` | 0 | Multi-organizer roles + invites. |
| `relationships` | 0 | Recipient memory — birthday, anniversary, last peek (feeds nudges). |
| `events` | 349 | **Event log** — `kind` + `payload` jsonb, per peek/user/session. |
| `affiliate_revenue` | 0 | Commission tracking per network/txn. |
| `chat_messages` | 361 | **Curator chat, persisted** — role, content jsonb, `tool_call_id`. |
| `webhook_log` | 0 | Inbound webhook audit. |
| `usage_ledger` | 259 | **Live cost metering** — `cost_cents` per vendor/kind. |
| `tier_config` | 0 | Tier config blob. |
| `curator_memory` | 0 | **Anthropic Memory tool** backing store (path-validated virtual FS). |

**External services** (from `SERVICES.md`, status verified where checkable):
- 🟢 **Anthropic** (Vision, web_search, Memory, Files, Skills, Extended Thinking) · **Clerk** (full custom auth, `clerk.peek.gift`) · **Stripe** ($12 gate, tax, multi-currency) · **Supabase** · **Resend** (email) · **ZenRows** (scrape, ~100% today) · **fal.ai** (Flux image gen) · **PostHog** (analytics/replay/flags) · **Upstash Redis** (rate-limit, webhook idempotency, presence) · **Netlify** (host).
- 🔴 **Sentry** — account exists, **no DSN keyed.**
- ⚪ **Twilio** (SMS/WhatsApp share — unkeyed) · **Inngest** (durable jobs: `nudge-relationships`, `scrape-worker`, `webhook-logger` — unkeyed).
- ⟦live⟧ **pgvector** confirmed **available, not installed** (`CREATE EXTENSION vector;` when the catalog ships).
- ⟦spec⟧ You want to **use the full Anthropic surface for everything it's got.**

---

## 10. TECH STACK — SUMMARY ⟦spec⟧ (the locked, build-it decision)

Deliberately over-built **but proven** — no Effect, no Zero (the two tail-spin bets; cut on purpose).

- **Monorepo:** Turborepo + pnpm, TypeScript `strict`.
- **Core (the durable asset):** a **framework-agnostic** package — document model, chat-op schema, vibe/token model, item+cap logic, typed service-client interfaces. Knows nothing about rendering.
- **The gate:** chat → **Zod-validated commands → events → state** (lightweight event-sourcing). Malformed AI ops bounce at the boundary; undo/history/replay for free. (Maker-checker done right.)
- **Contracts:** **Zod** canonical + runtime-validated; **neverthrow** typed errors.
- **Rendering:** pure function of `(document, theme)` — one truth for preview, recipient, future native.
- **Web:** **Next.js App Router + React, TS**, mobile-first, **PWA**; SSR recipient/marketing with **`next/og`** unfurl.
- **Theming:** **runtime design tokens** = typed theme object → CSS custom properties. **Not Tailwind** (you need runtime re-theming; Tailwind is compile-time).
- **Transport:** **tRPC**; Anthropic calls **server-side only.**
- **Data:** **Supabase** + **Drizzle** + **pgvector**; **Yjs** only when true co-editing is real.
- **AI:** full Anthropic surface; your services exposed as **MCP tools**; **Braintrust** evals.
- **Native (later):** **Expo** as a second thin surface over the same core — an addition, never a rewrite.

> The **over-built ceiling** we discussed (Effect, event-sourced/CQRS, Zero/Rocicorp local-first, CLIP retrieval, CDC streaming) is documented as the theoretical max — but the two highest-risk bets (Effect, Zero) are explicitly **out** because they'd tail-spin a solo multi-day build.

---

## 11. NETLIFY / OPS ⟦live⟧ / ⟦thin⟧

- **Host:** Netlify site `peek-gift-vnext` = `932646db-e8be-42f1-a94b-a57bb733e308`, primary URL `vnext.peek.gift`. Cutover plan in `CUTOVER.md`.
- **Key vault strategy:** **all production keys live as Netlify env vars on that site,** scoped per context (production / branch-deploy / deploy-preview / dev), `is_secret` where appropriate. **Netlify is the canonical vault.**
- ⟦spec⟧ The legacy `peek.gift` (Vite) site still runs; vNext replaces it.

> ⟦thin⟧ — **This is the section you said you could add 100 more to. Scaffold for your input:**
> - [ ] Context-scoped env var conventions (which vars per context, naming)
> - [ ] Deploy/branch/preview workflow rules
> - [ ] Edge functions vs. serverless boundaries
> - [ ] Build/cache settings, redirects, headers/CSP
> - [ ] Domain/DNS, the `peek.gift` ↔ `vnext.peek.gift` cutover sequence
> - [ ] Webhook endpoints registered on Netlify (Stripe → `/api/stripe/webhook`, etc.)
> - [ ] …drop the rest here.

---

## 12. NORTH STAR: PerfectPurchase ⟦spec⟧ (context, not v1)

peek.gift (and GlacialSips) are **revenue-generating stepping stones** to the real target: a **supplier-neutral, cross-retailer commerce decision layer.** A user photographs a reef tank / dining room / outfit / yard; agents identify it (scale, type — "saltwater, ~125gal, SPS coral"), research it, assemble **price-tiered package options** across many retailers, **render them into the user's own space**, and present a **money button** that orders across stores (API where possible, manual fill where not). Thesis: **own the decision, not the catalog** — the categories incumbents serve worst (complex, high-consideration, multi-item) are the wedge. The same architecture (agent proposes → structured checks verify → human backstops the tail) and the same normalized product graph underpin both products.

---

## 13. WORKING PRINCIPLES (your hard rules for any chat/Claude Code) ⟦spec⟧

- **Top-down planning, always** — your #1 complaint is chats won't plan a project top-down; they "frantically do random work in one turn." Plan first, decompose, then build.
- **No skeletons** — you repeatedly find "massive piles of skeletons that can't even be excavated." A signature ≠ an implementation.
- **Prove, don't claim** — chats say they're doing "the best of the best," then bury comment-bloat (audits found files **60% comments**, 3200+ junk lines) and lie about what they built. The artifact (test/deploy/diff) is the only evidence.
- **Versioning** — you harp on it up front; chats do it twice then abandon it. Keep it.
- **No `always`** — you flagged that the word "always" in an instruction doc is "a disaster waiting to happen" because chats prioritize mds/code over your chat. Avoid absolute directives.
- **Get out of Tailwind** — the original beef; runtime theming demands it.
- **The gate** — because a model can't reliably tell its justified positions from its stubborn ones, fence it with artifacts: the failing test, the validated command, the audit. Don't rely on persuading the model.

---

## 14. OPEN GAPS / NET-NEW WORK ⟦live⟧

What genuinely does **not** exist yet (verified):
1. **The catalog moat.** No `pg_products`/`pg_offers`, no entity resolution (UPC/GTIN + embeddings → one product, many offers), no hybrid/CLIP retrieval. pgvector not installed. **This is the real net-new and the actual moat.**
2. **The aesthetic eval gate** for the vibe engine (valid ≠ beautiful — human-rated per occasion).
3. **Sentry** DSN, **Twilio** keys, **Inngest** keys — all unkeyed; observability + share + durable jobs not live.
4. **Social** and **collaboration** rules — modeled in the DB, but the product behavior is unspecified (§6, §7).

---

*Sections 6, 7, and 11 are the thinnest — they're where your "100 more" go. Point me at any section and I'll deepen it, or hand this to Claude Code as the grounding spec.*
