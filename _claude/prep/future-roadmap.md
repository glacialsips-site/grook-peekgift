# peek.gift — FUTURE ROADMAP + THE SEAMS THE v1 BUILD MUST EXPOSE NOW

> **Audience:** CTO. **Purpose:** the forward vision (what peek.gift becomes after the Tier-1 self-serve loop ships) and — for each future move — **the exact port/seam the v1 build must expose today so the future bolts on instead of forcing a rewrite.** This is what makes "overbuild" concrete: not speculative code, but *typed empty sockets* the v1 already has.
>
> **Method / sourcing:** read-only across `gallant-planck`, `studio-vnext`, `proof/config-swap`, `feat/brand-config`, `bold-feynman`, plus `/tmp/prep/*`. Every claim is cited `branch:path` with quoted text. Tags: **CURRENT** = exists in code/DB today · **LATER** = the forward move · **SEAM** = the socket v1 must expose now.
>
> **The single most important finding:** the v1 already has a framework-agnostic port surface — `git show origin/claude/gallant-planck-pu51x:packages/core/src/ports/ports.ts` defines `Ports = { llm, productSource, research, cardResolver, image, persistence, payment, auth, email, analytics, moderation, storage, botGate }`. Its own header states the overbuild thesis verbatim: *"Adding the 14th or 50th backend is one adapter that satisfies an existing interface — zero changes to core."* **Most of the future is already socketed.** This roadmap audits which sockets are sufficient and which must be **widened now** (all-optional fields, so the stub + current call sites compile unchanged) before the future arrives.

---

## 0. THE NORTH STAR (why every seam below exists)

**CURRENT — the v1 product** (`/tmp/prep/REQUIREMENTS_SPEC.md` §1–§8; `peek-jumpoff/reference/vision/CONCEPT_BREAKDOWN.md`): a chat-driven, single-recipient gift/invite **page** builder. Curator talks to a translucent chat over a live preview; an Opus model authors an art-directed page; recipient opens the link and picks from cards within curator-set rules; publish = $12 Stripe. **Tier-1 self-serve only** — the Creator fulfills.

**LATER — PerfectPurchase** (`REQUIREMENTS_SPEC.md` §12, quoted): *"a **supplier-neutral, cross-retailer commerce decision layer.** A user photographs a reef tank / dining room / outfit / yard; agents identify it … research it, assemble **price-tiered package options** across many retailers, **render them into the user's own space**, and present a **money button** that orders across stores … Thesis: **own the decision, not the catalog**."* And: *"The same architecture (agent proposes → structured checks verify → human backstops the tail) and the same normalized product graph underpin both products."*

The strategic chain (`recon-assets/PEEK_GIFT_BUILD_BRIEF.md`, `RECON_FINDINGS.md` XX.4): peek.gift (gifts) and GlacialSips (water filtration) are **revenue-generating stepping stones** to PerfectPurchase. The bet: **one engine, many verticals, one product graph.** Everything below is a load-bearing piece of that bet, and each has a seam the v1 must not foreclose.

---

## 1. PerfectPurchase — the cross-retailer commerce decision layer + the product graph

### 1.1 The vision, decomposed
From `REQUIREMENTS_SPEC.md` §12 + §14.1 + `recon-assets/peek-gift-BUILD-BOOK.md` Ch5 + `BUILD-BOOK-Ch3-8.md` Ch5. The decision layer has five organs:

1. **Identify** — a photo of a room/tank/yard/outfit → agents classify it (`"saltwater, ~125gal, SPS coral"`). **CURRENT:** the chat already takes camera/image input and runs vision extraction (`RECON_FINDINGS.md` XX.3: *"Camera input = photograph a product/thing → vision extracts it into a card"*; cost ladder *"prefer URL/screenshot before expensive API/LLM"*, model tiering *"Opus authors the design; cheaper models (Sonnet/Haiku) do the vision/screenshot/camera extraction"*).
2. **Research** — assemble candidate products across retailers. **CURRENT:** the `research` tier of the cascade is an **honest stub today** — `studio-vnext:apps/web/lib/ports/card-resolver.ts`: *"The research tier (fuzzy ask → real products) is the PerfectPurchase core and is NOT built yet — wiring it is the next big lever, not a patch."*
3. **Price-tier** — package options at multiple price points across many retailers. This is the **product graph**: one canonical product, many offers.
4. **Render-into-space** — show the chosen items in the user's own photo (CLIP/image-gen). **SEAM lives in the `image` port** (`ImageRequest.op` already includes `relight`, `edit` — `gallant-planck:packages/core/src/ports/ports.ts`).
5. **Money button** — order across stores: API where possible, browser-agent (Browserbase/Stagehand) where not. **SEAM lives in a not-yet-existing `fulfillment` port** (see §1.5).

### 1.2 The product graph — `pg_products` / `pg_offers` / pgvector / CLIP
**CURRENT (gap):** `REQUIREMENTS_SPEC.md` §14.1 (the real net-new moat): *"No `pg_products`/`pg_offers`, no entity resolution (UPC/GTIN + embeddings → one product, many offers), no hybrid/CLIP retrieval. pgvector not installed. This is the real net-new and the actual moat."* Confirmed in `/tmp/prep/GROUND-TRUTH.md` §C: `vector` 0.8.0 **available, `installed_version: null`** → `CREATE EXTENSION vector;` is a Ch 5 step.

**LATER — the build** (`BUILD-BOOK-Ch3-8.md` Ch 5, fully specified):
- **5.1** `CREATE EXTENSION vector;` + `pg_products` (one canonical product) + `pg_offers` (*"many offers per product: retailer, price, currency, url, commission_pct, affiliate_network, in_stock, checked_at"*) with RLS.
- **5.2** Entity resolution: *"UPC/GTIN exact-match first, then title+image embedding similarity (a multimodal embedding — Voyage/Cohere-v4/Jina-CLIP, NOT text-only)."* Gate fixture: *"the same item from 3 retailers … resolves to one product with three offers."*
- **5.3** Hybrid retrieval: *"structured filters (price/category/ship-to) + pgvector text + CLIP image similarity (the bridge to the photo-of-the-room PerfectPurchase vision). Expose it behind `ports.productSource.search`."* Gate: *"a query ('a barrel cactus under $40, ships to 90210') + a reference photo returns ranked offers."*
- **5.4** Freshness gate: *"before showing an item to a recipient, live-check price/stock … never a dead link / wrong price."*
- **5.5** Feed ingestion (feeds primary, scrape fallback) — see §6.
- **5.6** The compounding ranker: *"capture what recipients pick/convert per occasion … RAG over your own outcomes."*

The embeddings dependency is **hard and must be picked correctly the first time** (`BACKEND_SERVICES.md`): *"Pick a multimodal model — NOT text-only `text-embedding-3-small`. The photo-of-room / reef-tank feature needs image vectors; choosing text-only now = re-picking later."*

### 1.3 The "money button" via Browserbase / Stagehand
**CURRENT:** Browserbase is **keyed but a stub** (`GROUND-TRUTH.md`: STUB/KEYED, `PROJECT_ID=5221d287-…`, no successful runs). The intent is explicit (`BACKEND_SERVICES.md`, latent uses): *"Browserbase Stagehand → AI agent for retailer checkout/fulfillment automation (the PerfectPurchase money button)."* And `RECON_FINDINGS.md` (A8 refinement): *"Browserbase's real role is the Stagehand browser-agent (the PerfectPurchase checkout/fulfillment 'money button'), running as scrape-#2 only is 'premature spend.'"*

### 1.4 SEAMS the v1 must expose now for PerfectPurchase

| Seam | Status today | What v1 must guarantee |
|---|---|---|
| **`ports.productSource`** (`ProductSourcePort.search/fromUrl`) | **CURRENT, sufficient.** Defined in core; `studio-vnext` has a LIVE `url_scrape` adapter (JSON-LD→OG→title→ZenRows). `search` is a stub. | Keep `search(query, {limit})` returning `CardData[]`. The product-graph retrieval (5.3) drops in as the real `search` adapter — **zero upstream change.** |
| **`ports.cardResolver`** (the configurable cascade) | **CURRENT, sufficient and proven config-driven.** `gallant-planck:packages/core/src/ports/ports.ts`: `DEFAULT_RESOLVER_ORDER = ["retailer_api","url_scrape","research"]`; `makeCardResolver` iterates the order and returns the first tier that yields a card, tagged `via`. Overridable per-call (`resolve({strategy:[...]})`) or per-construction (`order`). | **Do not hardcode tier order anywhere else.** The tier order being **data** is the seam — the catalog (retailer_api) becomes primary and scrape/research demote to fallback **by config flip**, exactly as §6 wants. |
| **`ports.research`** (`ResearchPort.resolveFromDescription({query, constraints, images})`) | **CURRENT shape exists, body is an honest stub** (`studio-vnext` card-resolver). Already accepts `images[]` — the photo-of-room input is *already in the signature*. | Keep the `images?: string[]` + `constraints` fields. This is the PerfectPurchase "fuzzy ask → real products" socket; wiring its body is "the next big lever." |
| **`ports.image`** (`ImageRequest.op` incl. `relight`/`edit`) | **CURRENT, sufficient.** Render-into-space (item composited into the user's photo) maps onto `op:"edit"`/`"relight"` with `from:` the user photo. | Keep the op union open (it's `"generate"|"search"|"edit"|"upscale"|"removeBg"|"relight"`); add ops, never re-shape the port. |
| **`ports.fulfillment`** (the money button) | **DOES NOT EXIST.** No fulfillment port in core today. `BACKEND_SERVICES.md`: *"Fulfillment / order-routing … no backend today; Tier 1 punts to curator. Pairs with Browserbase/Stagehand for the automated path."* | **NET-NEW SEAM TO ADD NOW (stub only).** See §5.4 — define the interface so Concierge/Atelier/PerfectPurchase order-routing bolt in. |
| **pgvector / `pg_products` / `pg_offers`** | **Not installed, not created.** | No v1 obligation to *build* it, but **`PersistencePort` must not assume the relational `cards`/`peeks` tables are the only store** — the catalog is a separate schema queried through `productSource`, not through `persistence`. The seam is the clean split between *document persistence* and *catalog retrieval*. Already correct in core. |

**Bottom line for §1:** of the five PerfectPurchase organs, **four already have correct sockets** (`productSource`, `research` with `images`, `cardResolver` config-order, `image` edit/relight). The **one missing socket is `fulfillment`** — add it stubbed now.

---

## 2. Multi-vertical / GlacialSips — and the config-swap proof that it already works

### 2.1 The story
**LATER — the thesis** (`REQUIREMENTS_SPEC.md` §12; `recon-assets/PEEK_GIFT_BUILD_BRIEF.md`): peek.gift, GlacialSips (water filtration), and PerfectPurchase are **one engine, many verticals**. `RECON_FINDINGS.md` Add. VIII confirms the shared infra is real, not aspirational: the GlacialSips water vertical lives in the **same Stripe account** (*"the other ~18 active products in the account are GlacialSips/PerfectPurchase water-filtration hardware"* — `RECON_FINDINGS.md` V.1), shares **Google Places keys** (*"legacy, unused in vNext, kept for glacialsips — confirms the shared account/infra with the water vertical"*), and reuses **GlacialSips marketing coupons** (V.2).

### 2.2 The config-swap proof (the actual artifact)
**CURRENT — proven in code on `proof/config-swap`.** The branch carries a runnable proof: `atelier/scripts/render-config-swap-proof.tsx` + the rendered outputs `atelier/scripts/proof-out/config-swap-{gift,water,index}.html`. Its header states the thesis under test verbatim:

> *"VERTICAL-AGNOSTIC PROOF — ONE engine, TWO verticals, ZERO engine changes. … the peek.gift design grammar + renderer **is** the PerfectPurchase platform engine — swap the config/page-state, get a radically different branded commerce page from the SAME engine, with NO changes to the grammar (`lib/vibe/grammar/`) or the renderer (`components/renderer/`)."*

It renders the **real production path** (`SlugRenderer` + `fromGeneration`, *"the exact production path `/g/[slug]` uses"*) against two hand-authored page-states:
- **A. Gift Peek** — "Priya turns 30", warm/playful (`paletteSeed: analogous baseHue 25`, `displayRole: script`, `motif: confetti`, voice effusive).
- **B. GlacialSips water filtration** — "Whole-home water, engineered", dark/serious (`paletteSeed: monochrome baseHue 225 dark muted`, `displayRole: sans / bodyRole: mono`, `motif: none`, voice restrained), four systems (Drift/Bedrock/Neve/Serac) with spec copy, NSF/ANSI test claims, GPM ratings — *"A totally different brand from the SAME engine."*

The proof is **disciplined about the seam**: *"if a renderer assumption forces gift-flavored output, that is recorded as a FINDING … never hacked around."* It deliberately stress-tests the gift-coupling: *"The 'note' slot is repurposed as a positioning / spec paragraph. No gift language — this is where the gift-coupling of the note slot gets tested."* It exits non-zero if the a11y/contrast gate fails on either vertical — so the proof is a **gate**, not a screenshot.

`feat/brand-config` carries the same proof, trimmed (the diff vs `proof/config-swap` is a 4-file simplification of `page-state.ts`/`sections.tsx`).

### 2.3 SEAMS the v1 must expose now for multi-vertical
| Seam | Status | What v1 must guarantee |
|---|---|---|
| **Engine ⟂ config split** (grammar + renderer never reference "gift") | **CURRENT, proven by the config-swap script.** The renderer consumes a flat `PageContent` + a `GenerationOutput` vibe; "gift" lives only in the data. | **Treat the proof as a regression gate.** Any renderer change must keep `render-config-swap-proof.tsx` green for *both* verticals. The day GlacialSips/PerfectPurchase ships, it's a new `PageContent`, not a new renderer. |
| **`ThemeSpec` is data, model-authored** (not a gift-template engine) | **CURRENT.** `PROJECT_SUMMARY.md` §2: *"the model is the resolver — no mandatory deterministic design engine."* The vibe is a generic descriptor (palette/typography/spatial/shape/depth/texture/motion/voice), not gift-specific. | Keep the vibe descriptor vertical-neutral. A water-filtration page is just a different vibe + page-state. |
| **No gift vocabulary baked into slots** | **CURRENT, but watch it.** The proof's explicit FINDING-discipline guards against `note`/`signature` slots assuming gift semantics. | When adding section kinds, name them by *function* (`story`, `productSet`, `cta`, `footer`) not by *occasion* — as the proof already does. |
| **`brand-config` / domain → vertical** (programmatic site per vertical) | **LATER, not built.** `BACKEND_SERVICES.md`: *"Domains / DNS automation … Programmatic domain per vertical … 700-site scale."* | No v1 obligation, but the **multi-tenant seam is "which config loads for this host."** Keep host→config resolution a single function the SSR entry calls; don't sprinkle `peek.gift` literals through the app. |

---

## 3. Collaboration — `peek_collaborators` roles + pooled contributions

### 3.1 The vision
**CURRENT (modeled, never exercised)** — `REQUIREMENTS_SPEC.md` §6: *"User-1-type users can collaborate … Modeled as `peek_collaborators` with `role: organizer | co_organizer | contributor`, invite tokens, accept flow (table exists, 0 rows — built, not yet exercised)."* `CONCEPT_BREAKDOWN.md` §7: *"Invite other users to add items · Combines pages built by each collaborator into one · Hero locked by the creator."*

**Schema is real** (`proof/config-swap:atelier/db/migrations/0000_next_kylun.sql`):
```sql
CREATE TYPE "peek_v2"."collaborator_role" AS ENUM('organizer', 'co_organizer', 'contributor');
CREATE TABLE "peek_v2"."peek_collaborators" (
  id uuid PK, peek_id uuid NOT NULL, user_id text, invited_email text,
  role "collaborator_role" NOT NULL, invite_token text,
  accepted_at timestamptz, created_at timestamptz, ...
  UNIQUE(invite_token), UNIQUE(peek_id, user_id) );
```
RLS is enabled on it (`0005_enable_rls_default_deny.sql`). An **old-v0 partial flow exists but is off the IR** (`RECON_FINDINGS.md` A7): `app/api/contributors/route.ts` mints an invite token → `/build/join/[token]`, *"There is no collaboration concept in `lib/ir` and no role-merge logic."* Live DB: `peek_collaborators = 0`.

**LATER — pooled contributions** (the money side of collaboration). `RECON_FINDINGS.md` Add. VII.2 + V.5 establish the second checkout kind: `PaymentPort.createCheckout({…, kind: "publish" | "contribution"})` — `kind:'contribution'` **already exists in the core port** but is *"otherwise unbuilt."* The proposed `contribution` block: `{ contributorId?, targetCents?, remainingCents? }` (multiple givers pool money toward a peek/card).

> ⟦thin⟧ `REQUIREMENTS_SPEC.md` §6 flags the rules as unspecified: *"who can edit what, invite/approval flow, multi-organizer caps, conflict handling. Drop detail here."* This is a product-decision gap, not a code gap — but the seams below absorb whatever rules are chosen.

### 3.2 SEAMS the v1 must expose now for collaboration
| Seam | Status | What v1 must guarantee |
|---|---|---|
| **`peek_collaborators` table + `collaborator_role` enum** | **CURRENT, live, RLS-on.** | Don't drop it. Keep the three-role enum; conflict/edit rules layer on top later without a schema change. |
| **`ports.auth.currentUserId` + `currentUser`** | **CURRENT.** `AuthPort.currentUser?(req): AuthUser{id,email,displayName,avatarUrl}`. | Multi-organizer needs *identity per actor* — `currentUser` (added beyond `currentUserId`) is the seam. Keep it. |
| **The command→event log carries `actorId`** | **PARTIAL / must enforce now.** The architecture is event-sourced (`GROUND-TRUTH.md` §F; `peek-gift-BUILD-BOOK.md` Ch 1.3). | **Every `Command`/`Event` must record *who* emitted it.** Collaboration = many actors folding into one document; without `actorId` on events, multi-organizer attribution and "who can edit what" are unbuildable later. This is the one collaboration seam that is *cheap now, expensive to retrofit*. |
| **`ports.payment.createCheckout` `kind:"contribution"` + `contribution` block** | **PARTIAL.** `kind` union has `"contribution"` in core today; the `contribution:{contributorId,targetCents,remainingCents}` fields are the **recommended widening** (VII.2), not yet merged. | **Widen `createCheckout` now with all-optional contribution fields** (compiles unchanged against the stub). Pooled gifting then needs no port reshape. |
| **`ports.payment.verifyWebhook` returns enough to reconcile** | **GAP — must widen now.** `RECON_FINDINGS.md` V.5: today returns only `{event, peekId?}` — *"drops session_id/amount/currency/customer/kind, so the core can't reconcile which checkout (publish vs which contribution, how much) settled. For group-gift … peekId alone is insufficient."* | **Add `session_id`, `amount_cents`, `currency`, `kind`, `customer?`, `metadata?` to the webhook result now.** Without this, pooled contributions can't be attributed to contributors. |
| **Stripe Connect (creator/contributor payouts)** | **LATER, latent.** `BACKEND_SERVICES.md` latent uses: *"Stripe Connect → creator-affiliate payouts (no new vendor)."* Collapse-on-sight: *"Stripe Connect instead of Tolt/Rewardful for creator payouts."* | No new vendor — Connect is a config of the existing Stripe account. The seam is that **payouts route through `ports.payment`**, not a separate service. |

---

## 4. Social / viral — sharing, OG unfurl, referral

### 4.1 The vision
**CURRENT (named, thin)** — `REQUIREMENTS_SPEC.md` §7: *"Named twice as a significant feature ('don't forget about the social media aspect'). ⟦thin⟧ No specifics given yet — share-to-social, social login, social discovery/virality, OG-card sharing, referral mechanics are all undefined."* `CONCEPT_BREAKDOWN.md` §9: *"Plugin already in hand — to experiment with later · Likely surfaces at recipient-selection moments."*

**The viral growth loop is specified** (`RECON_FINDINGS.md` XX.4): *"Recipient growth loop: after finalizing, the Recipient may be invited to make an account → send their own page → credits/discounts (the viral mechanic). Product/config, not core identity — but a real growth lever."*

### 4.2 What already exists
- **OG unfurl — CURRENT, built.** `proof/config-swap:atelier/app/g/[slug]/opengraph-image.tsx` (`next/og`, 1200×630, themed from the page's `vibe`, renders recipient_name/occasion/hero). `BUILD-BOOK-Ch3-8.md` Ch 4.6 gates it on *"a real unfurl screenshot from a phone (iMessage/WhatsApp) … themed to the page."*
- **Share send — CURRENT, partial.** `proof/config-swap:atelier/app/api/share/send/route.tsx` sends email (Resend) + SMS/WhatsApp (Twilio, unkeyed → `sms_not_configured`), with rate-limit + origin checks + usage metering.
- **Social login — latent.** `BACKEND_SERVICES.md`: Clerk *"planned: headless custom UI, OAuth; latent: Orgs/SAML."* OAuth is a Clerk config flip, not new code.
- **Conversions API / ad pixel — LATER.** `BACKEND_SERVICES.md`: *"Ad pixel / Conversions API … Instagram is the channel; server-side CAPI for post-iOS attribution; distinct from PostHog."*
- **Link shortener — LATER optional.** `BACKEND_SERVICES.md`: *"Dub.co (OSS) — Clean share links + click analytics."*

### 4.3 SEAMS the v1 must expose now for social/viral
| Seam | Status | What v1 must guarantee |
|---|---|---|
| **`next/og` per-page themed unfurl** | **CURRENT, built.** | Keep the OG image a pure function of `(published document, theme)` — same data the renderer uses. Every share surface (email/SMS/social) reuses the one OG image. |
| **`ports.email` + share route abstraction** | **CURRENT.** `EmailPort.send({to, template, data})`. Share route already multi-channel (email + Twilio). | Keep share channels behind ports (email today, Twilio when keyed, social later) so a new channel is one adapter. |
| **Referral attribution on the event log + `peeks.giver_names[]`/`recipient_profile`** | **PARTIAL — needs a referral seam now.** The viral loop (recipient → makes account → sends own page → credit) needs a **"referred_by" link** from a new peek back to the originating peek/recipient. | **Reserve a `referredByPeekId` / `referrerUserId` on peek creation + a `referral` event kind now.** The growth loop is "product/config" (XX.4) but the *attribution chain* must exist at creation time or it can't be reconstructed. Cheap now (one nullable column + one event kind), impossible to backfill. |
| **`ports.analytics` (PostHog) for viral funnels** | **CURRENT.** `AnalyticsPort.capture(event, props)`. | Keep recipient lifecycle events (`opens/selects/submits/finalizes` — XX.4 notification taxonomy) flowing through `analytics` so the viral funnel is measurable from day one. |
| **OAuth social login** | **LATER, Clerk config.** | No code seam needed — Clerk is already the `auth` port; OAuth is a dashboard flip. Don't build a custom social-login path. |

---

## 5. Tiers (Studio → Concierge → Atelier) + fulfillment

### 5.1 The vision — fulfillment tiers (NOT the usage-metering tiers)
**Important disambiguation:** there are **two unrelated "tier" concepts** in the codebase. Do not conflate them.
- **Usage tiers — CURRENT, built.** `proof/config-swap:atelier/lib/usage/tier-config.ts` + `tiers.ts`: cost-metering limits (`period_hours`, `hard_cents`, `soft_cents`) backed by the `tier_config` table. This caps Anthropic spend per user; it is *not* the fulfillment model.
- **Fulfillment tiers — LATER, the business expansion.** `RECON_FINDINGS.md` XX.4 (quoted): *"Service levels = FULFILLMENT TIERS (Studio / Concierge / Atelier): **Studio** = self-serve (Creator fulfills); **Concierge** = peek.gift orders/ships from retailers on the Creator's behalf; **Atelier** = peek.gift assembles a physical package + ships. Affects pricing, checkout, contact/shipping capture, notifications, fulfillment. This is the business-model expansion toward PerfectPurchase fulfillment."*

**Scope is decided** (`RECON_FINDINGS.md` XXII, Frank's answer to Q1, quoted): *"**v1 = Studio (self-serve) only.** Concierge (peek-fulfilled) and Atelier (peek-assembled) are later fulfillment tiers. So the build scopes the self-serve loop (Creator fulfills); the ordering/shipping/packaging operations layer is deferred (it's the PerfectPurchase/Ch 5+ horizon)."* Confirmed in `recon-assets/BUILD-CHAT-LAUNCH-KIT.md`: *"v1 = 'Studio' self-serve; Concierge/Atelier are later tiers."*

### 5.2 What Tier-1/Studio fulfillment is today
`REQUIREMENTS_SPEC.md` §8: *"Tier 1: the product emails/SMSs User 1 the confirmation of User 2's selections; **User 1 handles fulfillment themselves.** A nominal flat fee."* The $12 publish gate + the Resend/Twilio notify is the whole fulfillment surface today; `picks` carries `fulfilled_at`, `fulfillment_notes` (the curator's manual record).

### 5.3 What Concierge/Atelier need (the deferred operations layer)
`BACKEND_SERVICES.md`: *"Fulfillment / order-routing … 'Supplier ships direct, zero inventory' … no backend today; Tier 1 punts to curator. Pairs with Browserbase/Stagehand for the automated path."* Plus `EasyPost/Shippo` (Platform horizon, *"only if fulfillment owned"*) for shipping rates/labels/tracking when Atelier owns physical assembly.

### 5.4 SEAMS the v1 must expose now for tiers + fulfillment
| Seam | Status | What v1 must guarantee |
|---|---|---|
| **`ports.fulfillment`** — the missing port | **DOES NOT EXIST.** No fulfillment interface in core. | **ADD A STUBBED `FulfillmentPort` NOW.** Even though v1 = Studio (Creator fulfills), define the interface — e.g. `route(peekId, picks[]) → PortResult<{orders: {retailer, externalOrderId, status}[]}>` and `track(orderId) → status`. The Studio adapter is trivial: *"notify the curator, mark for manual fulfillment."* Concierge (retailer-API/Stagehand order-routing) and Atelier (Shippo labels) then bolt in as new adapters with **zero change to the publish→pick→notify loop.** This is the single most important *new* socket to add for the future, alongside the catalog. |
| **`users.tier` / fulfillment-tier on the peek** | **PARTIAL.** `users` has a `tier` field (`REQUIREMENTS_SPEC.md` §9). | Make fulfillment tier a **property the publish/checkout path reads** (`peek.fulfillmentTier` defaulting to `"studio"`), so Concierge/Atelier change pricing + which `fulfillment` adapter fires — not the loop's shape. |
| **`ports.payment.createCheckout` carries tier-aware pricing** | **PARTIAL.** Today $12 flat (`priceRef` recommended in VII.2). | Keep `amount_cents`/`priceRef` open so Concierge ($12 + cost-of-goods + service fee) and Atelier (assembly fee) are pricing config, not a checkout rewrite. The widened `createCheckout` (VII.2) already covers this. |
| **Shipping/contact capture at checkout** | **LATER.** `RECON_FINDINGS.md` XX.4: fulfillment tiers affect *"contact/shipping capture."* | The widened `createCheckout` already has `billingAddress?` (VII.2). When Concierge ships, recipient shipping address capture is a checkout-config addition, absorbed by the open request shape. |
| **`relationships` + Inngest nudges → repeat fulfillment** | **CURRENT (modeled), Inngest unkeyed.** `relationships` table (birthday/anniversary/last_peek_id) feeds `nudge-relationships`. | Keep the `nudge-relationships` Inngest job + `relationships` table — higher tiers monetize repeat-occasion nudges. The seam is that nudges go through `ports.email`/the job runner, not bespoke code. |

---

## 6. The affiliate / feed catalog moat

### 6.1 The vision — feeds become primary, scraping demotes to fallback
**CURRENT (modeled, demoted)** — affiliate fields are live on the schema (`cards.affiliate_url/affiliate_network/commission_pct`; `affiliate_revenue` table with `network/external_txn_id/amount_cents/commission_cents/status/raw_payload`, UNIQUE on `external_txn_id`). A working **Skimlinks webhook** exists (`proof/config-swap:atelier/app/api/webhooks/skimlinks/route.ts` — HMAC-verified, idempotent, writes `affiliate_revenue`). But affiliates are **demoted**: `SERVICES_atelier.md` #16 quotes Frank (2026-05-28): *"we don't have affiliates right now."* The `affiliate-strategy` skill (`proof/config-swap:atelier/lib/anthropic/skills/affiliate-strategy.ts`) states the live contract: *"`affiliate_search` is NOT available … The fallback `web_search` IS the primary product-discovery tool … scrape → web_search → place_search_v2 → propose-from-patterns."*

**LATER — the strategic upgrade** (`REQUIREMENTS_SPEC.md` §5, quoted): *"these aren't just link-wrappers — they expose product feeds/APIs. Ingest them into one normalized product graph you own; feeds become primary, scraping/web_search drop to fallback for the long tail."* `BACKEND_SERVICES.md` splits affiliates into **two jobs**: *"(1) auto-attribution link-wrap revenue [post-traffic]; (2) product-data feeds for the catalog [Platform — earlier, with the catalog build]."*

The source list (`REQUIREMENTS_SPEC.md` §5): aggregators (Skimlinks ~25k retailers, Sovrn, Impact, CJ, Rakuten) + direct (Amazon Associates/PA-API, Apple, Walmart/Target via Impact, eBay) + travel/experiences (Viator, OpenTable, Booking, Expedia, GetYourGuide, etc.) + the **big missing data sources** (Google Shopping Content API, Shopify `/products.json`, Etsy/Faire, Amazon PA-API).

### 6.2 Why it's a moat
`BUILD-BOOK-Ch3-8.md` Ch 5.6 + `REQUIREMENTS_SPEC.md` §14.1: the moat is **the normalized graph you own + the compounding outcome ranker** — *"capture what gets picked/converts per occasion; RAG/ranker over your own outcomes so it curates from accumulated taste."* The feeds are commodity; the **entity-resolved graph + the taste data** is the defensible asset. *"Own the decision, not the catalog."*

### 6.3 SEAMS the v1 must expose now for the affiliate/feed moat
| Seam | Status | What v1 must guarantee |
|---|---|---|
| **`ports.productSource` adapter-per-feed** | **CURRENT, sufficient.** `BUILD-BOOK-Ch3-8.md` Ch 5.5: *"Ingest the affiliate/product feeds behind adapters satisfying `ports.productSource` … Each is one adapter; the cascade picks them up by config."* | Keep `productSource` the single source seam. Each feed (Skimlinks, Shopify `/products.json`, PA-API, …) is one adapter — **no upstream change** when adding the 5th or 50th. |
| **`cardResolver` tier order = data** (catalog→primary by config) | **CURRENT.** (See §1.4.) | The day feeds go primary, flip `DEFAULT_RESOLVER_ORDER` to `["retailer_api","url_scrape","research"]` with `retailer_api` backed by the graph — config, not code. |
| **Affiliate link-wrap on card insert** | **CURRENT, partial (demoted).** The scrape tool already wraps source URLs through `wrapAffiliateLink()` with a `peekId:cardId` customId (`affiliate-strategy` skill). | Keep the wrap seam at card-insert so revenue attribution lights up the moment a network is keyed — no recode. |
| **`affiliate_revenue` + webhook ingest** | **CURRENT, built (Skimlinks), idempotent.** `cards` carries `affiliate_url/network/commission_pct`; `affiliate_revenue` UNIQUE on `external_txn_id`. | Keep the table + the `parseClickCustomId` → `affiliate_revenue` path. Adding CJ/Impact/Rakuten = one webhook route each, same shape. |
| **`pg_offers.commission_pct/affiliate_network`** | **LATER (graph not built).** Ch 5.1 puts commission on the offer row. | When the graph ships, commission lives on `pg_offers`, so the ranker can optimize *both* taste and margin. The seam is that retrieval (`productSource.search`) returns offers carrying commission — already compatible with `CardData`. |
| **The compounding ranker over own outcomes** | **LATER.** Ch 5.6. | The seam exists already: pick/convert events flow through `ports.analytics` + the `events`/`picks` tables. **Keep logging pick/convert per occasion now** so the ranker has training data when built — the outcome history is the moat and can't be backfilled. |

---

## 7. CONSOLIDATED SEAM LEDGER — what v1 must do *now* (the overbuild checklist)

Ordered by *cost-now vs cost-to-retrofit*. The cheap-now/expensive-later items are the dangerous ones.

| # | Seam | Today | Action for v1 | Why now |
|---|---|---|---|---|
| 1 | **`actorId` on every Command/Event** | event-sourced core, attribution unconfirmed | **Stamp who emitted each event.** | Collaboration (multi-organizer) is unbuildable later without it; cannot backfill. |
| 2 | **`ports.payment.verifyWebhook` widened** | returns `{event, peekId?}` only | **Return `session_id, amount_cents, currency, kind, customer?, metadata?`.** | Pooled contributions + tier pricing can't reconcile which checkout settled (RECON V.5). |
| 3 | **`ports.payment.createCheckout` widened (all-optional)** | `{peekId, amount_cents, kind}` | **Add `currency, priceRef, customer, locale, billingAddress, promotionCode, contribution{}, metadata, idempotencyKey`.** | Multi-currency/tax/coupon checkout, contributions, tier pricing — all non-breaking (VII.2). |
| 4 | **`ports.fulfillment` (new, stubbed)** | does not exist | **Define `FulfillmentPort.route()/track()`; Studio adapter = notify-curator.** | Concierge/Atelier/PerfectPurchase money-button bolt on; the publish→pick→notify loop never reshapes. |
| 5 | **`referredByPeekId` / `referrerUserId` + `referral` event** | not present | **Reserve the attribution chain at peek creation.** | Viral growth loop (XX.4) needs the referral graph from creation; can't reconstruct later. |
| 6 | **Keep logging pick/convert per occasion** (`events`/`picks`/`analytics`) | events stream live | **Don't drop occasion-tagged outcome events.** | The compounding ranker + aesthetic moat train on this history; not backfillable. |
| 7 | **`cardResolver` order stays DATA** | already config-driven | **Never hardcode tier order outside `DEFAULT_RESOLVER_ORDER`.** | Catalog-primary flip is a config change, not a rewrite (§1, §6). |
| 8 | **Multimodal embeddings choice deferred but constrained** | none keyed | **When embeddings are picked, multimodal only (Voyage/Cohere-v4/Jina-CLIP).** | Photo-of-room/CLIP needs image vectors; text-only = re-pick (BACKEND_SERVICES). |
| 9 | **config-swap proof = regression gate** | green on `proof/config-swap` | **Keep `render-config-swap-proof.tsx` green for gift + water on every renderer change.** | Multi-vertical / PerfectPurchase reuse depends on the engine staying vertical-neutral. |
| 10 | **Engine/slot naming stays functional, not gift-specific** | already functional | **Name section kinds by function (`story/productSet/cta`).** | Verticals are config, not forks. |

**Already-sufficient sockets (no action, just don't regress):** `ports.productSource` (catalog + feeds), `ports.research` (already takes `images[]` for photo-of-room), `ports.image` (`edit`/`relight` for render-into-space), `ports.auth.currentUser` (multi-actor identity), `ports.email`/share route (multi-channel), `ports.analytics` (viral funnels), `next/og` themed unfurl, `peek_collaborators` + `collaborator_role` enum, `affiliate_revenue` + Skimlinks webhook, `users.tier`/`relationships`/Inngest nudges.

---

## 8. THE BIGGEST GAP (for the CTO)

**The missing socket is `ports.fulfillment` — and it is the one seam with no stub today.** Four of the five PerfectPurchase organs already have correct ports (`productSource`, `research` with `images[]`, config-ordered `cardResolver`, `image` edit/relight), and the catalog/embeddings/graph are *known* net-new work with a written build plan (BUILD-BOOK Ch 5). But **fulfillment/order-routing has no interface at all** (`BACKEND_SERVICES.md`: *"no backend today; Tier 1 punts to curator"*), so Concierge, Atelier, and the PerfectPurchase "money button" (Browserbase/Stagehand) currently have **nowhere to plug in.** Adding a stubbed `FulfillmentPort` now (Studio adapter = notify-and-mark-manual) is the cheapest possible insurance against a rewrite when the business climbs the tier ladder.

The second-order gap is **the four cheap-now/expensive-later seams that touch data created at runtime** (#1 `actorId`, #2/#3 payment-webhook reconciliation, #5 referral attribution, #6 outcome logging). These cannot be backfilled — if v1 ships without them, collaboration, pooled gifting, the viral loop, and the compounding ranker each require a data migration or are simply lost. Everything else in the future is additive adapter work the existing port surface already absorbs.
