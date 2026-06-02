# peek.gift — BUILD
### Everything the build chat needs, in one file. Drop this in, paste the short prompt, go.

## ▶ HOW TO LAUNCH (Frank — 3 things)
1. **Cloud environment:** Name = `peek.gift build` · Network = **Full** · Environment variables = *(blank)* ·
   **Setup script** — leave it **blank** (the build chat installs deps itself in Chapter 0, after it's on the
   `atelier-integration` branch). If the field won't save empty, put `exit 0`. Do **not** put an `npm`/`cd`
   command here — the session boots on a branch without `atelier/` yet, so it would error and block startup.
2. **Start a fresh build chat** and either **drop this file into it**, or — if it can reach git — tell it to read
   `recon-assets/PEEK_GIFT_BUILD.md` on branch `claude/gallant-planck-pu51x`. (Same content either way.)
3. **Paste this as the first message** (this is all you paste):
   > Build peek.gift, live production. This file is your full brief — read it top to bottom: the operating
   > contract, the spec, where the salvage code lives, and the gated plan (Chapters 0–8). Work on branch
   > `atelier-integration` and push there (every push auto-deploys to vnext.peek.gift). Do **Chapter 0 (Ground
   > Truth) only**, then STOP at its gate and show me. Follow the operating contract.

---

# OPERATING CONTRACT (overrides your defaults for the whole session)
1. **Prove, never claim.** "Done" = a passing test, a 200, a real deploy, or a screenshot. Words aren't evidence.
2. **Every task ends in a GATE.** Run it; paste the real output. If it can't pass, **STOP** — don't proceed,
   don't edit the gate to pass. Report what blocks and wait.
3. **No skeletons, no lorem, no `// TODO: implement`.** Write the body or stop and say you can't.
4. **Small diffs** — one concern per commit, show the diff. Unsure of scope → do less and stop, not more and guess.
5. **Plan top-down.** Never frantically do random work in one turn. Never use the word "always" in a doc you write.
6. **Build for LIVE production.** No mock, no `PAY_MODE=mock`, no "wire it later" — wire the real adapters (Stripe
   live, Anthropic, Supabase, Clerk) from the start. The port stubs are only a zero-key fallback, never the plan.
7. **Keys:** you MAY request or discuss a key a feature genuinely needs. Do **not** lecture about secret
   best-practices (rotation, vaults, "don't commit") or send the owner re-fetching a key he already provided —
   he manages hygiene himself. If a service is unconfigured for a gate, ask once if truly required, else mark the
   gate UNVERIFIED and move on.
8. **You do all live-prod work via the connectors** — git commits/pushes, deploys, the final `peek.gift` cutover.
   The owner touches nothing live.
9. **No Tailwind** (runtime CSS-variable theming). **The model is the resolver** (the *chat*, not the framework —
   keep the chat lean, the framework robust). **Never paraphrase the IR / document** — it's the shared language.
10. The owner's current instruction outranks anything written here.

---

# THE SPEC — what peek.gift is
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
  builds and deploys independently of them** (it depends only on the port interfaces, not on Clerk/Stripe
  internals). This decoupling — not a mock mode — prevents the break-fix cycle where touching the core broke
  auth/checkout and vice-versa. These bookends live on the atelier lineage,
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
price tag). Every external capability is a **typed port + adapter** — wire the **live** adapters from day one; a
stub exists only as a zero-key fallback, never the plan.

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
**Live (keyed and running in the deploy environment):** Anthropic · Clerk
(`clerk.peek.gift`) · Stripe (`acct_1T4xnbCEKPUsVee1`, $12 gate, NJ tax active, webhook → `vnext.peek.gift/api/
stripe/webhook`) · Supabase (`ewqpujqerdnrkjqlpobo`, schema `peek_v2`, ~14 RLS tables incl. `cards`/
`variant_groups`/`picks`/`peek_collaborators`/`relationships`/`curator_memory`; bucket `peek-v2-assets`;
**pgvector available, not installed** — `CREATE EXTENSION vector;` at Ch 5) · Resend · ZenRows · **Browserbase**
(the Stagehand agent is the PerfectPurchase fulfillment play, not just scrape-#2) · **fal** (Flux image gen) ·
PostHog · Upstash. **In flight:** Sentry (DSN blocked — code no-ops until keyed), Inngest (jobs:
`nudge-relationships`/`scrape-worker`/`webhook-logger`). **Gates (not started; needed for public launch):**
**Turnstile** before the first guest LLM call (open chat = open wallet), **image moderation** before public
publish, **multimodal embeddings** (Voyage/Cohere-v4/Jina-CLIP — *not* text-only) for the catalog. **Keys:**
the build chat may request a key a feature genuinely needs; it must **not** lecture about secret best-practices
(rotation/vaults/"don't commit") or send the owner re-fetching keys. Build **live**, not on stubs. All live-prod
work (git, deploys, the final URL cutover) is **Claude's via the connectors** — Frank touches nothing live.

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


---

# THE BUILD PLAN — Chapters 0→8 (gated; do them in order, each ends in a STOP-gate)
> Paste these to yourself one prompt at a time as you clear each gate. Ch 0–2 are fully written; Ch 3–8 too.
> **Reconciliation for Ch 3:** the "vibe engine" is a validation / repair / aesthetic **safety-net** under the
> model's free authoring (contrast-repair, invariants, the aesthetic eval) — **never a generator.** If a Ch 3
> step starts *producing* the design from a lookup table instead of guarding/scoring it, STOP — that's the
> rejected engine.

# CHAPTER 0 — GROUND TRUTH
*Intent: the entire two-day lesson is "don't believe the claim, verify the artifact." So before building anything, the agent verifies what's actually real in the repo. This is the anti-tail-spin opener.*

### Prompt 0.1 — Audit the repo against SERVICES.md
> Clone/open `glacialsips-site/grook-peekgift`. Read `_packets/SPINE/SERVICES.md` and every file in `_packets/SPINE/`. Then produce a file `_packets/SPINE/GROUND-TRUTH.md` that, for each of the 13 services, states: (a) is the env var actually present in the Netlify env for site `932646db-e8be-42f1-a94b-a57bb733e308`, (b) is there code that reads it, (c) does that code path actually run or silently no-op. Do not infer "works" from the presence of a file. Where you cannot verify, write "UNVERIFIED" — do not guess.
>
> **GATE:** `GROUND-TRUTH.md` exists and every one of the 13 rows is marked VERIFIED-LIVE / WIRED-BUT-NOOP / BLOCKED / UNVERIFIED with the evidence you used. Paste the file. If you cannot determine a row, it stays UNVERIFIED — that is a passing gate; a guess is a failing one.

### Prompt 0.2 — Build & boot, for real
> From a clean checkout: install, build, and run the app locally. Capture the actual output.
>
> **GATE:** paste the real build log and the dev-server boot log. If the build fails, STOP and paste the first error — do not patch around it silently.

### Prompt 0.3 — Map what exists vs. what this book builds
> Produce `_packets/SPINE/BUILD-MAP.md`: a two-column list — LEFT = modules/routes/schemas that already exist and work (verified in 0.1/0.2), RIGHT = the chapters of this book that are not yet built. The point is to never rebuild a working thing.
>
> **GATE:** `BUILD-MAP.md` exists; nothing appears on the RIGHT that was proven working on the LEFT. Paste it.

---

# CHAPTER 1 — THE FOUNDATION
*Intent: forge the durable core so nothing downstream welds business logic into a framework. Over-built where it pays: typed core, command→event→document gate, runtime-validated contracts, pure rendering.*

### Prompt 1.1 — Monorepo + the framework-agnostic core package
> Establish the Turborepo + pnpm workspace if not already present. Create `packages/core` — a TypeScript package with **zero** imports from Next, React, or any UI/runtime framework. It will hold the document model, command schema, token model, item/cap logic, and service-client interfaces. Add a lint rule (or dependency-cruiser config) that **fails the build if `packages/core` imports any framework**.
>
> **GATE:** `pnpm build` passes; the no-framework-import rule is active and demonstrably fails when you add a throwaway `import React` to a core file (show that failing, then remove it). Paste both.

### Prompt 1.2 — The recipient-page document model (Zod canonical)
> In `packages/core`, define the recipient-page document as a **Zod schema** (`PeekDocument`): hero (image, headline, subhead, CTA), an ordered list of **sets** (each set = title, a `linkStyle: "separate" | "threaded"`, and an ordered list of **item cards**), item card (title, attributes, image, price, offer ref, optional badge: `"NEW" | "JUST_PLACED"`), and spending caps (`hardCap`, `softCap`). Zod is the source of truth; derive the TS type from it. Add a `pure` function `emptyDocument()`.
>
> **GATE:** unit tests prove valid docs parse and three specific malformed docs (missing hero, negative price, cap < 0) are rejected with typed errors. Paste the green test run.

### Prompt 1.3 — The command → event → state gate
> In `packages/core`, define a Zod-validated `Command` union (e.g. `SET_HERO`, `ADD_SET`, `ADD_ITEM`, `MOVE_ITEM`, `SET_CAP`, `APPLY_THEME`, `SET_BADGE`, `LINK_SET`). Define `Event` types and a pure reducer `apply(document, event) -> document`. Define `decide(document, command) -> Result<Event[], CommandError>` using **neverthrow** — invalid commands return an `Err`, never throw, never partially apply. The document is always the fold of its events.
>
> **GATE:** tests prove (a) a valid command produces events and a new document, (b) an invalid command (e.g. ADD_ITEM that breaks the hard cap) returns `Err` and the document is **unchanged**, (c) replaying an event log reconstructs an identical document. Paste the green run. This reducer is the maker-checker — it must be bulletproof.

### Prompt 1.4 — Pure rendering contract
> Define the render boundary as a pure function `render(document, theme)`. Implement it minimally (return a normalized view-model, not yet React). The live preview, the recipient page, and any future surface all consume this same view-model.
>
> **GATE:** test proves `render` is deterministic — same `(document, theme)` in, byte-identical view-model out, no side effects, no `Date.now()`/random. Paste it.

### Prompt 1.5 — The runtime token system (kills Tailwind on contact)
> Define a Zod `Theme` = a typed token object (color roles, type scale, spacing, radius, motion, surface treatments). Implement `themeToCSSVars(theme) -> Record<string,string>`. The web surface will apply these as CSS custom properties at the root. **No Tailwind anywhere.** Add a check that fails CI if a `className` containing Tailwind utility patterns appears in the repo.
>
> **GATE:** test proves a `Theme` → CSS-vars mapping round-trips and that swapping two themes changes only variable values, not structure. The anti-Tailwind check is active. Paste both.

### Prompt 1.6 — Typed service-client interfaces in core
> In `packages/core`, define **interfaces** (not implementations) for the Clerk, Stripe, and Anthropic clients the app needs — so the core depends on contracts, and the Next surface provides the concrete server-side implementations. Anthropic interface must make it impossible to call from the client (server-only types).
>
> **GATE:** `pnpm build` passes; core has no concrete network code; a test double satisfies each interface. Paste it.

---

# CHAPTER 2 — THE CHAT (the crown jewel — built out first, per top-down)
*Intent: the signature UI from the screenshots — a multimodal chat with a translucent surface over a LIVE preview of the page being built behind it; keyboard-collapse reveals the full page; the assistant pings the sections it just touched. The chat is a document editor that speaks only in validated commands.*

### Prompt 2.1 — Next App Router shell + PWA + token root
> Stand up the Next.js (App Router, TS) app as a thin surface over `packages/core`. Install as a PWA (manifest, service worker, installable). Apply the Ch 1 token system at the root via CSS custom properties. Mobile-first.
>
> **GATE:** app builds, runs, installs as a PWA on a real phone (paste a screenshot of the install prompt / installed icon), and a theme swap visibly changes the root vars. 

### Prompt 2.2 — The translucent-chat-over-live-preview composition
> Build the creator screen: a full-screen **live preview** (rendered from `render(document, theme)`) with a **translucent chat surface** floating over it. Input bar reads "Tell Claude what to change…". When the keyboard opens, the chat docks to it; when it collapses, the full preview is revealed. Implement keyboard/viewport handling with the **`visualViewport`** API. This composition was spike-verified on real mobile — match it.
>
> **GATE:** on a real phone, paste two screenshots — keyboard up (chat over preview) and keyboard dismissed (full preview), matching the reference. The blur/backdrop must not break on keyboard transition.

### Prompt 2.3 — Multimodal input rail
> Wire the input affordances shown in the reference: text, URL paste, image upload, camera, voice (mic), and the share/mail action. Voice → transcription; image/camera → Vision-ready attachment; URL → fetch-for-context. These feed the curator turn in 2.4.
>
> **GATE:** each input type produces a structured message payload the chat turn can consume; paste a test exercising all five. Voice and camera degrade gracefully if a permission is denied (no crash).

### Prompt 2.4 — The curator turn: Anthropic (server) → tool-use → validated commands
> Server-side only: a streaming Anthropic turn (use the existing edge lib if present from Ch 0; else build `lib/anthropic-edge`). The model is given the current document + the user's multimodal message and **may only act by calling tools that map 1:1 to the Ch 1 `Command` union**. Every tool call is parsed through the command's Zod schema and run through `decide()` before any event is applied. A malformed tool call is rejected and the model is told why — it never touches the document directly. Default model Sonnet 4.6; Opus 4.8 opt-in. Stream tokens to the chat.
>
> **GATE:** integration test: a normal request ("add a wool throw to The Drop, mark it NEW") produces a valid `ADD_ITEM` + `SET_BADGE`, the preview updates; a request that would blow the hard cap is rejected at the boundary and the document is unchanged. Paste both. **This is the gate from the operating contract, living in the product.**

### Prompt 2.5 — "Pinged the sections I just touched"
> After a turn applies events, the preview visually flags exactly the sections that changed (the reference says: "Pinged the sections I just touched so you can spot the changes"). Derive the flagged regions from the emitted events, not from a diff guess.
>
> **GATE:** test proves the flagged region set equals the set of sections referenced by the turn's events. Paste it; include a screenshot of a change being highlighted.

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
