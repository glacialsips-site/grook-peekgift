# peek.gift — BUILD BOOK, Chapters 3–8 (fleshed out)
### Continuation of `peek-gift-BUILD-BOOK.md` (Ch 0–2). Same rules, same gated form.

> Written to extend Frank's BUILD-BOOK after the **BUILD-BOOK-monorepo decision** (Addendum XVII):
> framework = the atelier Turborepo + event-sourced `command→event→state` core; the lean Opus chat +
> the `lib/peek-render` renderer + the design method are **salvaged from `bold-feynman`**; the
> auth/checkout/landing **bookends are lifted from `atelier-integration`**; the rigid Sonnet chat +
> the governed grammar/vibe template engine + the deterministic resolvers (jolly `vibe-resolve`,
> `engine-parametric-REJECTED`) are **dropped**.
>
> The **OPERATING CONTRACT and STACK LOCK from Ch 0–2 still apply** — paste them once at session start.
> Every prompt below ends in a GATE. A gate that can't pass is a **STOP**, not a workaround. No
> skeletons. Prove, never claim. Small diffs. Do less and stop, not more and guess.
>
> **One reconciliation to hold through Ch 3 (important):** the project decision is **"the model is the
> resolver."** So the "vibe engine" below is **NOT** a deterministic design generator. The Opus chat
> authors the `ThemeSpec` freely from taste (Ch 2). The Ch 3 engine is a **validation + repair +
> aesthetic safety net under that free authoring** (contrast-correct it, enforce invariants, score it),
> plus a **cached pantry** the model may draw from but is never limited to. If any Ch 3 step starts
> generating the design instead of guarding/scoring it, stop — that's the rejected lookup-table engine.

---

# CHAPTER 3 — THE VIBE LAYER (free authoring + a safety/aesthetic net)
*Intent: the page looks drastically cool/on-vibe off a few inputs (princess birthday ↔ bachelor party). Validity is the floor; the existential question is "is it actually beautiful and on-vibe," which math can't prove — so this chapter ends in a human-rated aesthetic gate. The model authors; this layer guarantees it never ships broken or ugly.*

### Prompt 3.1 — `ThemeSpec` as the canonical Zod theme model (in `packages/core`)
> In `packages/core`, define the theme the chat authors as a Zod schema, porting **`bold-feynman:lib/ir/contract.ts` `ThemeSpec`** (TypeSystem incl. `displayTracking/eyebrowTracking/displayCase/scaleRatio`, structured `Palette`, `scene/motifs[]/frame`, `radius{card,pill}`, `space`, `motion`, the additive `loud` tokens, `cssVars` escape hatch) plus the **12-dim Design-DNA descriptor** from `recon-assets/peek-gift-…` toolkit §10.2 (`formality/energy/whimsy/era/warmth/luminosity/saturation/contrast/ornamentation/density/texture/motionIntensity`) as an OPTIONAL `vibe` field the model may set to drive refinements. Zod is the source of truth; derive the TS type. Keep `ThemeSpec` the thing the chat emits via the `APPLY_THEME` command (Ch 1.3); the DNA vector is advisory, never required.
>
> **GATE:** unit tests prove (a) `bold-feynman`'s three sample IR themes (`dad-60th`, `charity-gala`, `el-taquito`) parse unchanged through the new schema (port the samples), (b) the legacy `radius:6` / missing-`space` shapes normalize to canonical. Paste the green run.

### Prompt 3.2 — OKLCH palette safety-net (contrast-derive-until-it-passes)
> In `packages/core`, add `ensureAccessiblePalette(palette) -> palette` using **OKLCH** math (salvage the color math from `jolly-mccarthy:packages/vibe-harmony` — the one thing worth taking from jolly; do NOT bring its `vibe-resolve` generator). It takes the **model-authored** palette and, only where a pairing fails **WCAG AA (≥4.5:1 body, ≥3:1 large)**, nudges lightness in OKLCH until it passes — preserving hue/intent. It never invents a palette; it repairs one. Pure, deterministic, no Date/random.
>
> **GATE:** tests prove (a) an already-AA palette passes through byte-identical, (b) a deliberately low-contrast ink/bg pair is repaired to ≥4.5:1 with hue drift < a small ε, (c) the function is pure. Paste it.

### Prompt 3.3 — The Zod theme auto-repair / reject gate (the §10.5 invariants)
> In `packages/core`, add `validateTheme(theme) -> Result<Theme, ThemeError[]>` (neverthrow) enforcing the coherence invariants from toolkit §10.5: **AA contrast** (via 3.2), **≤ 2 type families + 1 script accent**, **script never as body**, **ornament budget = round(ornamentation×4)** motifs max, **one dominant accent** (a second hue only if a real `accent2`), era consistency. Violations are **auto-repaired where safe** (drop over-budget motifs, demote a 3rd family) or **rejected** with a typed error — never shipped broken. This runs on every `APPLY_THEME` event before it folds into the document (wire into Ch 1.3 `decide`).
>
> **GATE:** tests prove a 3-family / 6-motif / low-contrast theme is repaired to within invariants (or rejected), and a clean theme is untouched. A malformed theme **cannot** enter the document. Paste the run.

### Prompt 3.4 — The design pantry as CACHED model context (not a gate)
> Stand up the parts-bin as **reference the chat is shown**, not a constraint: from `recon-assets/peek-gift-…` toolkit §1–§9 + `bold-feynman:peek-jumpoff/engine/parts.js`, assemble `packages/core/pantry/` — the font taxonomy (17 personality groups, "pairs with"), the 20 named palettes, the 10 WORLD bundles, the scene/motif/frame menu, and **the §2.2 type-art CSS library** (glitch/holo/chrome/outline/gradient-clip/`textPath`/letterpress — the "loud vocabulary" the renderer needs). Expose it to the Ch 2 curator turn as **prompt-cached context** (a stable suffix on the cached system block). The system prompt stays lean (method, not rulebook); the pantry is a menu the model may draw from or override.
>
> **GATE:** prove (a) the pantry is injected as a cache breakpoint (a second turn shows `cache_read_input_tokens > 0`), (b) the chat can produce a theme using a pantry font AND a theme inventing a non-pantry font (a test of each), proving it's a floor not a ceiling. Paste both.

### Prompt 3.5 — Motion as data (VibeSpec → animation tokens)
> Port `bold-feynman:lib/peek-render` motion (scene loops, scroll-reveal stagger, count-ups, the `--peek-ease-*` tokens) so "fancy/animated" is driven by `theme.motion.intensity` + scene, not hand-coded per page. Gate ambient loops on intensity; honor `prefers-reduced-motion` always.
>
> **GATE:** test proves a high-intensity theme emits the ambient/loop classes and a `reduceMotion`/intensity-0 theme emits none; a screenshot/DOM check shows the neon-rave scene animating and the restrained work-order still. Paste it.

### Prompt 3.6 — THE AESTHETIC EVAL GATE (do not skip — the moat)
> Build a **Braintrust** eval set: N occasions (the 10 original + 5 new mockups as the bar) → cold chat runs → rendered pages. Score each on the **10-axis rubric** (`recon-assets/…DESIGN_DIRECTOR_AGENT` §5: concept/bold-move/hierarchy/restraint/type/color/authenticity/copy/specificity/slop) by **human aesthetic rating**, not validity. Capture the IR + a screenshot per run.
>
> **GATE:** the eval runs and produces a per-occasion **human-rated aesthetic score**; a vibe/theme change does not ship unless it clears the per-occasion threshold. Paste the eval report + two side-by-side (render vs mockup) screenshots. *"Valid but ugly" is a failing gate.*

---

# CHAPTER 4 — THE RECIPIENT PAGE (one renderer, two surfaces)
*Intent: the published page the recipient opens — same `render(document,theme)` as the live preview (no fork). Port `bold-feynman:lib/peek-render` (a strict superset of every prior renderer); it already paints all section kinds + the mockup-caliber shell. The work here is the recipient-specific interactions + the share unfurl + caps.*

### Prompt 4.1 — Recipient route on the shared renderer (kill the old `/g/[slug]`)
> Build `/g/[slug]` (SSR) that loads the published `PeekDocument` (Drizzle, `peek_v2`) and renders it with the **same `render(document,theme)`** as the preview, surface=`recipient`. **Delete** the old v0 recipient view (`bold-feynman:app/g/[slug]` reads `peek.vibe`, not the IR) — do not carry it. Hero = the HEMLOCK reference (collection eyebrow, editorial headline, subhead, CTA).
>
> **GATE:** a published sample document renders at `/g/<slug>` byte-equivalent (same view-model) to its live preview; the page is server-rendered (view source shows content). Paste the SSR HTML head + a screenshot.

### Prompt 4.2 — Bundled carousels + badges
> Render each set as a **horizontal carousel** ("The Drop · 03 pieces", edge-peek snap), porting the renderer's `giftgrid`/`rail` treatments. Wire the live badges: "NEW · updated by claude", "JUST PLACED" chip — derived from the document's events (Ch 2.5), not a diff guess.
>
> **GATE:** test proves badge regions equal the set referenced by the last turn's events; screenshot of a populated carousel + a freshly-placed card chip. Paste both.

### Prompt 4.3 — The selection RULES engine (the defensible core — highest priority)
> This is the product's genuinely novel part (REQUIREMENTS §4, CONCEPT §6) and the renderer GAP my recon flagged (Add. II GAP 1). Render `variant_groups` as **grouped, labeled** sets with **rule-aware affordances**: `pick_one` → single-select; `pick_any`/`pick_all` → multi-select; `is_locked`+`unlock_rule` (beg / date_after / event) → locked-until-unlocked with the gate UI. The control MUST reflect the active rule — never a uniform "Got it" badge. The recipient surface **enforces** it (server-validated picks).
>
> **GATE:** integration test across all rule kinds: a `pick_one` group rejects a 2nd pick; a `beg` card stays locked until a beg is approved; a `date_after` card unlocks only past its date. Paste the run + a screenshot of each affordance. (No uniform badge anywhere.)

### Prompt 4.4 — Activity-as-itinerary + the bundle-link style
> Render `activity` cards as an **itinerary** (date + location + ordered steps), not a product tile (recon Add. II GAP 2 — promote `itinerary` to a first-class activity field). Implement both `linkStyle` values: `"threaded"` = the dashed-thread circle-link between related kit cards; `"separate"` = independent tiles. Theme picks (Frank's open question — ship both).
>
> **GATE:** an activity card with 3 itinerary steps renders the plan (not a tile); a threaded set shows the dashed link, a separate set doesn't. Screenshots of each. Paste them.

### Prompt 4.5 — Recipient selection within caps + the claim mechanic
> Enforce `hardCap`/`softCap` (REQUIREMENTS §4): soft-cap → a non-blocking warning; hard-cap → block the over-limit pick. Wire the claim mechanic (`picks` table: signature, note, beg flow) through `ports.persistence`. The running-total bar reflects live selections.
>
> **GATE:** test proves selecting past `softCap` warns, past `hardCap` blocks; a claim persists a `picks` row and flips the document state appropriately. Paste the run.

### Prompt 4.6 — `next/og` share unfurl
> Generate a themed `next/og` image per published page so the link unfurls as a branded card in iMessage/WhatsApp (uses the page's actual theme tokens).
>
> **GATE:** paste a **real unfurl screenshot from a phone** (iMessage/WhatsApp) of a published slug, themed to the page. (Per the BUILD-BOOK: a real phone screenshot, not a localhost render.)

---

# CHAPTER 5 — THE CATALOG MOAT (PerfectPurchase's decision layer, at the data level)
*Intent: the real net-new moat (REQUIREMENTS §14.1) — a normalized product graph you own, so feeds become primary and scrape/web_search drop to the long-tail fallback. Build behind the existing `ports.productSource`/`ports.cardResolver` cascade so nothing upstream changes.*

### Prompt 5.1 — pgvector + the product graph schema
> `CREATE EXTENSION vector;` on Supabase `ewqpujqerdnrkjqlpobo` (it's available, not installed). Add Drizzle schema `pg_products` (one canonical product) + `pg_offers` (many offers per product: retailer, price, currency, url, commission_pct, affiliate_network, in_stock, checked_at) with RLS.
>
> **GATE:** migration replays clean on a real PG instance; `\d pg_products`/`pg_offers` show the columns + a vector column + indexes + RLS enabled. Paste the migration output.

### Prompt 5.2 — Entity resolution (one product, many offers)
> Dedupe ingested feed items into canonical products by **UPC/GTIN** exact-match first, then **title+image embedding similarity** (a multimodal embedding — Voyage/Cohere-v4/Jina-CLIP, NOT text-only; REQUIREMENTS §14). Same product across retailers → one `pg_products` row, many `pg_offers`.
>
> **GATE:** test fixture: the same item from 3 retailers (2 sharing a GTIN, 1 differing title) resolves to **one** product with **three** offers. Paste the run.

### Prompt 5.3 — Hybrid retrieval
> Implement retrieval = structured filters (price/category/ship-to) + **pgvector text** + **CLIP image** similarity (the bridge to the photo-of-the-room PerfectPurchase vision). Expose it behind `ports.productSource.search`.
>
> **GATE:** a query ("a barrel cactus under $40, ships to 90210") + a reference photo returns ranked offers; the cascade (Ch via `ports.cardResolver`) tries `retailer_api`(this) → `url_scrape` → `research` in config order. Paste the ranked result + the tier that fired.

### Prompt 5.4 — The freshness gate (never a dead link / wrong price)
> Feeds power discovery, but before showing an item to a recipient, **live-check price/stock** on the specific offer. A stale/dead offer is dropped or refreshed, never rendered.
>
> **GATE:** test proves an offer whose live price ≠ stored price is refreshed (or dropped) before render; a dead URL never reaches a card. Paste the run.

### Prompt 5.5 — Feed ingestion (feeds primary, scrape fallback)
> Ingest the affiliate/product feeds behind adapters satisfying `ports.productSource`: Skimlinks/Sovrn/Impact/CJ/Rakuten + the missing big sources — Google **Shopping Content/Merchant Center**, Shopify **`/products.json`** + Storefront, **Etsy/Faire**, Amazon **PA-API**. Each is one adapter; the cascade picks them up by config. Scrape (ZenRows) + web_search drop to long-tail fallback.
>
> **GATE:** at least one real feed adapter ingests N products into `pg_products`/`pg_offers` end-to-end (or, if a key is unset, a recorded-fixture adapter proves the pipeline). Paste the row counts + a sample resolved card.

### Prompt 5.6 — The compounding ranker
> Capture what recipients pick/convert per occasion; build a ranker/RAG over your own outcomes so curation improves from accumulated taste (the moat compounds).
>
> **GATE:** test proves pick/convert events are logged per occasion and the ranker re-orders suggestions using them (a before/after on a fixture). Paste it.

---

# CHAPTER 6 — MCP (expose your own platform to the curator chat)
*Intent: the curator turn (Ch 2.4) queries your platform off a labeled MCP menu instead of you praying it remembers a capability exists.*

### Prompt 6.1 — Wrap the catalog as MCP tools
> Expose the Ch 5 retrieval + matcher as **MCP tools** (search_products, get_offers, resolve_card).
>
> **GATE:** an MCP client lists the tools and a call returns real catalog data. Paste the tool list + a call result.

### Prompt 6.2 — Wrap live services as MCP tools
> Expose Stripe publish-state, Resend/Twilio share, fal image-gen as MCP tools (each already behind a `port`).
>
> **GATE:** each MCP tool call hits its port (stub or real) and returns a typed result; a denied/unkeyed service degrades gracefully (no crash). Paste the calls.

### Prompt 6.3 — Point the curator turn at the MCP menu
> Wire Ch 2.4's Anthropic turn to the MCP tool menu so the model selects platform capabilities from a labeled list (still mapped through `decide()` — MCP tool calls that mutate the document go through the Command gate, never direct).
>
> **GATE:** integration test: "find a wool throw under $80 and add it to The Drop" → an MCP `search_products` call + an `ADD_ITEM` command through `decide()`, preview updates, hard-cap still enforced. Paste it.

---

# CHAPTER 7 — THE GATES & OBSERVABILITY (live before real users)
*Intent: the artifact-gates that keep a confident-wrong model from shipping garbage to real users + real money.*

### Prompt 7.1 — Braintrust eval-gate in CI
> Curator turns must pass an eval set (correct command emission, cap enforcement, no document corruption) before deploy. Wire into CI.
>
> **GATE:** CI fails on a regression (prove it: introduce a bad change, watch the gate block, revert). Paste the failing + passing runs.

### Prompt 7.2 — Wire the aesthetic eval (Ch 3.6) into the same gate
> The human-rated aesthetic threshold (3.6) blocks a vibe ship below par.
>
> **GATE:** a deliberately-degraded theme fails the aesthetic gate; the baseline passes. Paste both.

### Prompt 7.3 — Unblock Sentry
> Frank keys the DSN + auth token (org `peekgift` `4511426433646592`). Confirm `withSentryConfig` reports a real error (it currently no-ops without the DSN). *(Key handling is Frank's; the code just needs to light up once keyed.)*
>
> **GATE:** a thrown test error appears in Sentry. Paste the event link/screenshot. (If the DSN isn't keyed yet, mark UNVERIFIED and STOP — don't fake it.)

### Prompt 7.4 — The $12 publish gate (real money path)
> Wire `mark_ready`/the publish CTA → the **atelier checkout** (lifted per recon Add. XV: PaymentIntent + Payment Element + the custom coupon route) behind `ports.payment` with the corrected result shape (`client_secret`, not a redirect url). On `payment_intent.succeeded` (webhook → `/api/stripe/webhook`, idempotent) → publish the document (status `published`, `published_at`, `share_url`) → **notify the curator** (Resend now; Twilio when keyed). Price `price_1TapZICEKPUsVee1ddG4n14M`, `PAY_MODE=live`.
>
> **GATE:** end-to-end in test mode: ready → pay (test card) → webhook publishes the document → curator gets the notification → `/g/<slug>` is live. Paste the full run incl. the webhook log. *(Confirm with Frank whether multi-currency/tax beyond the as-built single-currency-USD/coupon path is in scope here — recon Add. XV.2.)*

### Prompt 7.5 — Inngest durable jobs
> Key + wire `nudge-relationships` (the `relationships` table → birthday/anniversary nudges), `scrape-worker`, `webhook-logger`.
>
> **GATE:** each job runs durably (a scheduled nudge fires against a fixture relationship). Paste the run. (Unkeyed → mark UNVERIFIED + STOP.)

---

# CHAPTER 8 — CUTOVER (legacy → vnext, end-to-end)
*Intent: flip the live site to the new build and prove the whole loop with one real run.*

### Prompt 8.1 — Cutover per `CUTOVER.md`
> Follow `_packets/SPINE/CUTOVER.md`: legacy peek.gift (Vite) → `vnext.peek.gift`. Confirm the Netlify production branch is the branch this build lives on (so `git push` auto-deploys — recon Add. XVII.4) and the git↔Netlify link is live.
>
> **GATE:** a push to the production branch produces a real Netlify deploy of THIS build; `/studio`, `/g/<slug>`, `/sign-in`, the landing all serve the new app. Paste the deploy log + the four live URLs.

### Prompt 8.2 — The full end-to-end gate (the one that matters)
> One real run, no stubs: create a peek in the chat → theme it → publish ($12) → recipient opens the **unfurled** link → picks within cap (rules enforced) → curator is notified.
>
> **GATE:** paste the full run — chat transcript + the published `/g/<slug>` + the unfurl screenshot + the pick + the curator notification. This is the product. *(This is the path that, per recon §2, has literally never run end-to-end — getting it green is the milestone.)*

### Prompt 8.3 — Twilio share
> Key Twilio; the SMS/WhatsApp share path stops returning `sms_not_configured`.
>
> **GATE:** a real share SMS/WhatsApp arrives on a phone. Paste it. (Unkeyed → UNVERIFIED + STOP.)

---

### The discipline (unchanged from Ch 0–2)
Every prompt has a gate. A gate that can't pass is a **STOP**, not a workaround. The artifact — the test, the deploy, the screenshot — overrides the model's confidence at every step. Foundation (Ch 0–2) before sub-levels (3–8); each chapter composes on the one below it. Salvage working code (feynman chat/renderer, atelier framework/bookends); never rebuild a thing Ch 0.3's BUILD-MAP proved already works.
