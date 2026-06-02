# peek.gift — BUILD BRIEF
### The single, settled source of truth for the build chat. Current state only — no correction trail.

> This consolidates ~22 recon addenda into the **decisions as they now stand** (de-duplicated, nothing
> superseded). The full investigation + how each decision was reached is archived in `RECON_FINDINGS.md`
> (provenance only — you don't need it to build). Read **this**, the two **BUILD-BOOK** files (the gated
> plan), and `REQUIREMENTS_SPEC.md` (the product spec). Companion: `BUILD-CHAT-LAUNCH-KIT.md` (how to start).
> Owner: Frank — product/design. You: tech. Frank's current word outranks any doc here.

---

## 1. What peek.gift is
A **Creator** builds a personal, art-directed **gift page** for one **Recipient**. The page *is* the gift:
a hero, a personal note, and a curated set of **picks** the Recipient chooses from, inside rules the Creator
sets. The Creator makes the emotional frame; the Recipient gets agency inside it. It kills the generic gift
(the wrong-guess present, the gift card that's just an errand). Two page types share one structure: **gift
page** (primary) and **invite**. Mobile-first (social traffic), desktop-compatible. North star (later):
**PerfectPurchase** — a cross-retailer commerce decision layer on the same IR + product graph.

**v1 scope = "Studio" (self-serve):** the Creator builds + pays the page fee + shares; the Recipient picks;
the **Creator fulfills**. Higher tiers — **Concierge** (peek.gift orders/ships from retailers) and **Atelier**
(peek.gift assembles + ships a physical package) — are **later**; they add an operations/fulfillment layer and
are the bridge to PerfectPurchase. Build the self-serve loop now; design the seams so the tiers bolt on.

## 2. The experience (this is the product's heart)
**One page: a transparent chat floating over a live preview of the page building behind it.** The keyboard
collapses to reveal the full page. There is **no step-wizard and no drawers / manual controls** — the *only*
interface is the conversation.
- The Creator gives sparse, casual input (text, a pasted URL, an uploaded image, a **camera** photo, **voice**).
  The model infers the rest; it asks **at most one** question, only when a detail is taste-critical and
  unguessable.
- The chat **does the artwork *and* the arranging**: it authors the theme, writes the copy, creates the cards,
  and **forms the categories, carousels, and rules itself** — minimal user effort, "something a typical user
  could never make on their own."
- The Creator refines by **just asking** ("darker," "different font," "group these," "make it pick-one,"
  "add a soup option") — the chat turns that into changes. Users don't want to *do* anything.
- The quality bar is the design seat's **sample pages** (real animations, characterful fonts) — they beat any
  vibe-engine, drawer, or anything a user would conceive. That caliber is the moat; **generic is the only
  failure.** Publish is offered as soon as the page is *useful*, not perfect.

## 3. The page model (the IR / document)
The page is a **validated structured document — never raw HTML — and it's versioned.** The chat authors and
mutates it; one generic renderer paints it into both the live preview and the published recipient page.
It carries: page type · recipient/occasion/from metadata · the **concept** (the anti-generic lock) · the
**theme** (type system + palette + scene/motifs/frame + space/radius/motion + "loud" decorative tokens) ·
the **hero** (a media slot) · ordered **sections** · **cards** · **variant_groups** · the **note** · the **CTA**
· spending **caps**. Media is a **slot**: a resolved URL *or* a directive (generate / search / edit / remove-bg
/ upscale); the renderer shows a themed placeholder until it resolves.

**Layout intent (current mission):** as cards are added they fall into the page; items that share a category
(the chat decides this) wrap into a **horizontal carousel with the rule applied at the carousel level**; the
next category sits below; **experiences render as an itinerary** (date + place + ordered steps) — *not* a card
and *not* a scheduler. (The design drifted toward "schedulers" once; pull it back to gift-card carousels, with
itinerary reserved for experiences, at sample caliber.)

**Card kinds:** retail product (multi-source) · activity/experience · aspirational/"taunt" · digital · custom/
homemade · IOU · donation · joke/gag · manual. Retail cards carry image/source-label/title/price + a selection
control; custom ones may have a user photo + free text and no price.

## 4. The rules / selection engine (the genuinely novel, defensible core)
The Creator defines **how the Recipient may choose**, and the rendered control must **reflect the active rule**
(single-select / multi-select / locked) — never a uniform "got it" badge.
- **Variant groups**: `pick_one` / `pick_any` / `pick_all`.
- **Lock / unlock**: `beg`-to-unlock (with a prompt) · `date_after` · `event`.
- **Caps**: hard + soft; fill **by $ / by count / by both**; a recipient-facing **fill-bar / thermometer**;
  **hard-stop** vs **allow-over** vs **allow-over-with-a-note (request)**; show/hide value to the Recipient.
- Rule defaults are **item-aware** (a $900 item shouldn't get a blind $200 cap).
- The recipient surface **enforces** the rules (server-validated picks).

## 5. The architecture (DECIDED — do not re-litigate)
A deliberately robust, **proven** stack — "overbuild the *framework*, keep the *chat* loose." No Effect, no
Zero/Rocicorp (the two tail-spin bets, cut on purpose).
- **Monorepo:** Turborepo + pnpm, TypeScript `strict`.
- **`packages/core` (the durable asset):** framework-agnostic (zero Next/React/UI imports — enforce with a
  lint/dependency-cruiser rule that fails the build on a framework import). It owns the **document model**, the
  **command schema**, the **theme/token model**, **item + cap logic**, and **typed service-client interfaces**.
- **The gate, at the data level (the maker-checker):** the chat does **not** mutate the document directly — it
  emits **Zod-validated Commands → Events → state** (lightweight event-sourcing). `decide(doc, cmd) →
  Result<Event[], Err>` (**neverthrow**) + pure `apply(doc, event) → doc`; the document is the fold of its
  events → **undo / history / replay free**, and a malformed AI op bounces at the boundary instead of
  corrupting a page.
- **Contracts:** **Zod** canonical + runtime-validated (the AI's output arrives at runtime — guard it there).
- **Rendering:** a **pure `render(document, theme)`** — one truth for the live preview, the recipient page, and
  any future surface.
- **Web:** Next.js App Router + React, mobile-first, **PWA**; SSR recipient + marketing pages with **`next/og`**
  unfurl. Structure so a future **Expo** surface is an addition, not a rewrite.
- **Theming:** **runtime design tokens → CSS custom properties. Never Tailwind** (compile-time can't re-theme
  at runtime).
- **Transport:** **tRPC**; Anthropic calls **server-side only**.
- **Data:** **Supabase + Drizzle + pgvector**; **Yjs** only when true co-editing is real.
- **AI:** full Anthropic surface (streaming, Vision, web_search, prompt caching, extended thinking, Files,
  Batch); your services exposed to the chat as **MCP tools**; **Braintrust** evals.
- This **is** Frank's "spine + modules/boltons" model: the **event-sourced core = the spine**, the **ports/
  adapters = the boltons** (auth, draft-persistence, palette-extract, scrape, screenshot-extract, API-search,
  manual-entry, rules, notifications, checkout, share, slug). His "drafts persist as you move back and forth"
  is **native to event-sourcing** (the draft is the fold of its commands).
- **Document naming:** the canonical state is the **`PeekDocument`**; the chat speaks **Commands**, never
  mutating directly. (The salvaged `PeekIR` content model + its 16 tools map onto this: tools → the Command
  union, the reducer → `decide`/`apply` + an event log.)

## 6. The design method (the model is the resolver)
The model authors the design **freely from taste** — no fixed template set, no constrained enumeration, **no
deterministic design engine**. The renderer accepts arbitrary, model-authored output.
- **Method:** find the emotional core → commit to **one concept specific enough to exclude things** → cascade
  it into every choice → **vary the display font per page** (the #1 anti-generic lever) → borrow the real
  genre's codes → make it unmistakably *this* recipient → finish the seams (reveal, hover, empty state).
- **Feed the chat the parts-bin as CACHED context** (the toolkit §1–§9: the ~211-font personality taxonomy
  + "pairs with," the **type-art CSS library** — glitch/holo/chrome/outline/gradient-clip/`textPath`/letterpress
  = the "loud" vocabulary, the 20 palettes, the 10 worlds, the color-harmony schemes). It's a **pantry the model
  draws from but is never limited to** — not a frozen rulebook, not a generator. (Biggest quality-per-effort
  lever; the missing type-art CSS is the renderer's known "loud" gap.)
- **The "vibe engine" is a safety net, not a generator:** an OKLCH palette repair (contrast-derive-until-AA),
  the coherence invariants (≤2 families + 1 script accent, ornament budget, one dominant accent), and a
  **human-rated aesthetic eval gate** (Braintrust per occasion — "valid but ugly loses"). The hero image's
  extracted palette **seeds** the theme the model then art-directs ("do nothing → it already looks good").
- **The bar = the mockups** (`reference/original-mockups/*` + `mockups/*`); the samples are **few-shots and a
  conformance bar, not templates to hardcode and not the format the chat emits.**
- **The system prompt is LEAN:** the Peek voice + the design method + the tools (what to collect · the
  guardrails: stay on the gift-page task, don't get derailed · how the design seat made the samples). Not a
  rigid 500-line rulebook — that lowers output quality.

## 7. Checkout — full international from day one, Stripe-native
Use a **Stripe Checkout Session** (embedded), which delegates the i18n to Stripe:
`adaptive_pricing` (local-currency presentment — every currency) · `automatic_tax` + `tax_id_collection`
(every jurisdiction) · `billing_address_collection` (Stripe's **Address Element**, which has **Google Places
built in** — so the standalone Google Places API is redundant, drop it) · `allow_promotion_codes` (native
coupons). The **$12 publish** = price `price_1TapZICEKPUsVee1ddG4n14M`, `PAY_MODE=live`. The chat emits a
**ready** intent; the **route** (a bookend concern) opens checkout — never the reducer. The **webhook**
(`payment_intent.succeeded` / `checkout.session.completed`, idempotent) **publishes** the document + **notifies
the Creator** (Resend now; Twilio when keyed). **Reference implementation:** `claude/feat-stripe-embedded-checkout:
atelier/app/api/checkout/route.ts`. Do **not** build a custom currency/tax/coupon layer — Stripe owns it.

## 8. Auth + landing (the bookends — built, isolated, lift them)
- **Auth:** full custom **headless Clerk** (email+password · email-code passwordless · Google OAuth · 2FA ·
  forgot-password · a Clerk→Supabase user webhook). **Deferred / guest auth:** build with low friction; the
  auth wall comes later, gated by workflow. Authenticated Creators get a dashboard of saved drafts.
- **Landing:** full marketing (hero · how-it-works · showcase · why-different · final-CTA · footer), pure
  CSS/tokens, trivially liftable.
- **Bookend isolation (Frank's deliberate strategy):** the core imports Clerk/Stripe **only** via
  `AuthPort` / `PaymentPort`; the bookends attach at those ports + the `mark_ready` seam; the core **builds,
  deploys, and demos without them** (stub auth, `PAY_MODE=mock`). This prevents the break-fix cycle where
  touching the core broke auth/checkout and vice-versa. These bookends live on the atelier lineage,
  **low-coupled** (they hit Supabase `peek_v2` directly, no entanglement with the scrapped engine) → lift them
  onto the build, moving their direct DB writes behind `ports.persistence`. A **recipient growth loop**
  (Recipient invited to make an account → send their own page → credits/discounts) is a later mechanic.

## 9. Inputs + the model tiering (why the stack has scrapers + vision)
"Add something" is one intent with four roads that all normalize into an **editable card**, behind
`ports.cardResolver` (a configurable cascade): **URL** (scrape) → **screenshot/camera image** (vision extract)
→ **search/API** (LLM + web search) → **manual** (the road for IOU/donation/joke/experience/handmade). **Camera**
= photograph a real thing → vision makes a card. **Mic** = the non-technical mobile user just talks. Cost ladder:
URL/screenshot **before** paid API/LLM. **Model tiering:** **Opus 4.8** is the artist (authors the page) —
**day one**, with a Sonnet step-down as a later A/B behind the LLM port once it's functional; **Sonnet/Haiku**
are the cheap hands for **vision/screenshot/camera extraction + classification** (don't burn Opus to read a
price tag). Every external capability is a **typed port + stub**; the app runs end-to-end on stubs with no keys.

## 10. The source map — build from these, drop those
**Framework base = the `atelier-integration` lineage** (it already has Drizzle, the **event-sourced
`peek_mutation_log`** = the command→event gate, the **bookends**, and `_packets/SPINE/`). NB it's currently a
single Next 16 app under `atelier/` (npm) — **BUILD-BOOK Ch 1.1 monorepo-izes it.**
- **Salvage from `bold-feynman`:** `lib/peek-chat/*` (the lean Opus streaming chat + the LEAN system prompt +
  the tool set) · `lib/peek-render/*` (the renderer — a **strict superset** of every prior renderer: all
  section kinds + mockup-caliber shell) · `lib/ir/*` (the content model → `PeekDocument`) · the whole
  `peek-jumpoff/` design package + mockups + samples.
- **Salvage from the design export (`recon-assets/`):** the **parts-bin** (toolkit §1–§9) as cached vocabulary.
- **Checkout reference:** `feat-stripe-embedded-checkout` (§7).
- **DROP (rejected / superseded):** the deterministic design engines (`engine-parametric-REJECTED/*`, jolly's
  `vibe-resolve` + `vibe-genome`, atelier's `lib/vibe/*` grammar/template engine) · atelier's **rigid Sonnet
  chat** · the **drawers / manual controls** (no manual UI) · feynman's `lib/peek/*` first-cut · the standalone
  Google Places API · the "feynman is canonical / vision docs are dated" framing (it misdirected the whole
  effort) · `ARCHITECTURE.md`'s Kafka/K8s fantasy (its companion `STACK_INTEGRATION.md` is the corrected stack).

## 11. Services + environment (real status)
**Live (keys in the Netlify vault — the canonical secret store; never commit them):** Anthropic · Clerk
(`clerk.peek.gift`) · Stripe (`acct_1T4xnbCEKPUsVee1`, $12 gate, NJ tax active, webhook → `vnext.peek.gift/api/
stripe/webhook`) · Supabase (`ewqpujqerdnrkjqlpobo`, schema `peek_v2`, ~14 RLS tables incl. `cards`/
`variant_groups`/`picks`/`peek_collaborators`/`relationships`/`curator_memory`; bucket `peek-v2-assets`;
**pgvector available, not installed** — `CREATE EXTENSION vector;` at Ch 5) · Resend · ZenRows · **Browserbase**
(the Stagehand agent is the PerfectPurchase fulfillment play, not just scrape-#2) · **fal** (Flux image gen) ·
PostHog · Upstash. **In flight:** Sentry (DSN blocked — code no-ops until keyed), Inngest (jobs:
`nudge-relationships`/`scrape-worker`/`webhook-logger`). **Gates (not started; needed for public launch):**
**Turnstile** before the first guest LLM call (open chat = open wallet), **image moderation** before public
publish, **multimodal embeddings** (Voyage/Cohere-v4/Jina-CLIP — *not* text-only) for the catalog. **Keys are
Frank's domain — do not raise key handling;** the build runs on stubs.

## 12. The build plan + deploy
**The plan is the BUILD-BOOK**, a gated top-down cascade (`recon-assets/peek-gift-BUILD-BOOK.md` = the operating
contract + stack-lock + Ch 0–2; `recon-assets/BUILD-BOOK-Ch3-8.md` = Ch 3–8). Each prompt ends in a **GATE**
(a passing test / a 200 / a real deploy / a screenshot); a gate that can't pass is a **STOP**, not a
workaround. Order: **Ch 0** ground-truth (verify, don't trust) → **Ch 1** the monorepo core + the event gate +
pure render + the token system (anti-Tailwind CI check) → **Ch 2** the chat over live preview → **Ch 3** the
vibe layer + the aesthetic eval gate → **Ch 4** the recipient page (carousels + rules + itinerary + caps +
`next/og` unfurl) → **Ch 5** the catalog moat → **Ch 6** MCP → **Ch 7** the gates ($12 publish + Sentry +
evals) → **Ch 8** cutover.
**Deploy:** Netlify auto-builds the **production branch** on push. **Build on a branch off `atelier-integration`
and make that branch the Netlify production (or branch-deploy) branch** — then `git push` = deploy, and the old
"code never reached the deploy branch" failure is gone. Confirm the git↔Netlify link is live. Ch 8 handles
legacy `peek.gift` → `vnext.peek.gift`.

## 13. Known issues to clear early
- **atelier CI is red** (PR #9): the workflow sets `NODE_ENV=production`, so `npm install` skips devDeps and
  `tsc --noEmit` can't find `vitest`/`drizzle-kit`/`tailwindcss` (~28 `TS2307`). **Fix:** install dev deps in
  CI (drop `NODE_ENV=production` from that job, or `npm ci --include=dev`). Also bump the Node-20 `checkout`/
  `setup-node` actions (deprecation). A Ch 0/Ch 1 task.
- **Renderer gaps** (in the salvaged `lib/peek-render`): **(1)** the **rules engine** — `variant_groups` render
  as independent tiles with a uniform badge; build rule-aware grouped affordances (this is the defensible core
  — highest priority, Ch 4.3). **(2)** **activity-as-itinerary** is dropped — render the plan (Ch 4.4).
  **(3)** `palette.glow:true` doesn't reach the hero headline (a `theme.ts` one-liner — the var is always set
  to `'none'`, dead-coding the fallback). **(4)** the tool enum can't author `stats`/`lede` sections (the
  renderer supports them).
- **Studio:** the only chrome is the chat + preview (no drawers); the "transparent floating" feel = a
  `visualViewport` keyboard-collapse reveal (the studio currently collapses via a manual chevron only).
- **DQ-11 cleanup:** remove the `lib/peek/*` + `/peek` first-cut.
- The **end-to-end loop** (create → theme → publish $12 → recipient picks within caps → Creator notified) has
  **never run** — Ch 8.2's gate is the real milestone; every gate before it exists to reach it without a
  tail-spin.

## 14. Frank's hard rules (operating contract — they override defaults)
**Top-down planning, always.** **No skeletons / no lorem / no `// TODO`.** **Prove, never claim** — the
artifact (test / deploy / diff) is the only evidence. **Every step ends in a gate; a gate that can't pass is a
STOP.** **Small diffs**, one concern per commit, show the diff. **Avoid the word "always"** in instruction
docs. **No Tailwind.** **The model is the resolver** (the *chat*, not the framework — keep the chat lean, the
framework robust). **Never paraphrase the IR / document** — it's the shared language. **Keys/secrets are
Frank's call — don't mommy him about them.** Frank's current instruction outranks anything written here.

---
*Provenance for any decision above is in `RECON_FINDINGS.md` (archive). To start the build session, use
`recon-assets/BUILD-CHAT-LAUNCH-KIT.md`.*
