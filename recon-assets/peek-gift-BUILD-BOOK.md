# peek.gift — THE BUILD BOOK
### A cascading, gated prompt sequence for Claude Code. Foundation first, then build out the sub-levels.

This is not a spec to admire. It is an ordered set of prompts you paste into Claude Code, **one at a time, in order**. Each one ends in a GATE that must actually pass before the next one runs. The gate is the whole point: it is the thing that stops a confident-wrong agent from eating three days of work. Grains → pebbles → rock. Foundation gets forged solid before anything sits on it.

---

## OPERATING CONTRACT — paste this once, at the very start of the Claude Code session, before any chapter.

> You are building peek.gift. Read these rules. They override your defaults for this entire session.
>
> 1. **Prove, never claim.** You do not get to say a thing is done. A passing test, a route that returns 200, a real deploy, or a screenshot is what "done" means. Words are not evidence.
> 2. **Every prompt ends in a GATE.** Run the gate. Paste the actual output (test result, curl response, build log). If the gate cannot pass, **STOP. Do not proceed to the next prompt. Do not edit the gate to make it pass.** Report exactly what is blocking and wait.
> 3. **No skeletons, no lorem, no `// TODO: implement`.** If you write a function signature, you write the body, or you stop and say you can't.
> 4. **The repo is `glacialsips-site/grook-peekgift`.** Canonical docs live in `_packets/SPINE/`. Read `_packets/SPINE/SERVICES.md` before touching any external service — it is the source of truth for account state, env var names, and IDs.
> 5. **Small diffs.** One concern per commit. Show me the diff.
> 6. When in doubt about scope, do less and stop, not more and guess.

---

## STACK LOCK (decided — do not re-litigate, do not "upgrade" mid-build)

Deliberately robust, deliberately **proven**. No Effect, no Zero/Rocicorp — those are the two pieces that would tail-spin a multi-day build. Everything below is over-built where over-built pays, and battle-tested everywhere.

- **Monorepo:** Turborepo + pnpm, TypeScript `strict`.
- **The CORE (the durable asset):** a framework-agnostic package that knows nothing about rendering. It owns: the recipient-page **document model**, the **chat-operation schema**, the **design-token / VibeSpec model**, **item + spending-cap logic**, and typed clients for Clerk / Stripe / Anthropic. *This is what you never rebuild.*
- **The gate, at the data level:** the chat does **not** mutate the document directly. It emits **Zod-validated commands → events → state**. Lightweight event-sourcing. A malformed/insane AI op bounces at the boundary instead of corrupting a page. You get undo/history/reconstruct for free. (This is maker-checker done right — the thing the Revlon wire lacked.)
- **Contracts:** **Zod** as the *canonical* runtime definition of document/commands/tokens. **neverthrow** for typed errors. Types vanish at runtime; the AI's output *arrives* at runtime — guard it there.
- **Rendering:** a **pure function of `(document, theme)`**. Live preview, recipient page, and any future surface all derive from the same data. One rendering truth, no drift.
- **Web surface:** **Next.js App Router + React, TypeScript**, mobile-first, shipped as an installable **PWA**. SSR recipient + marketing pages with **`next/og`** unfurl. No native yet; structure so a future Expo surface is an *addition*, not a rewrite.
- **Theming:** **runtime design tokens** = a typed theme object driving **CSS custom properties**. **Never Tailwind.** (Tailwind is compile-time; the vibe engine swaps identities at runtime — wrong tool.)
- **Transport:** **tRPC** (end-to-end typesafe). Anthropic calls **server-side only**.
- **Data:** **Supabase** (you have it) + **Drizzle** + **pgvector**. **Yjs** only if/when true co-editing is real.
- **AI:** full Anthropic surface (streaming, Vision, web_search, prompt caching, extended thinking, Files, Batch). Your services exposed to the curator as **MCP tools**. **Braintrust** evals.

---

## SERVICES STATE (from `_packets/SPINE/SERVICES.md` — real IDs, real status)

| Service | Status | Key facts |
|---|---|---|
| Anthropic | 🟢 LIVE | org `ebe4a13c…`. **Frank action: enable Web Search** at platform.claude.com → Settings → Privacy. |
| Clerk | 🟢 LIVE | `clerk.peek.gift`, instance `ins_3D5VaoJxcxztJvjkHUanDEMdFWG`. Custom UI, no Clerk branding. |
| Stripe | 🟢 LIVE | acct `acct_1T4xnbCEKPUsVee1`. **$12 publish gate** = price `price_1TapZICEKPUsVee1ddG4n14M`. `PAY_MODE=live`. NJ tax active. Webhook → `vnext.peek.gift/api/stripe/webhook`. |
| Supabase | 🟢 LIVE | project `ewqpujqerdnrkjqlpobo` (us-east-1, PG 17.6). Schema `peek_v2`, **13 RLS tables**. Bucket `peek-v2-assets`. **pgvector AVAILABLE but NOT installed** → `CREATE EXTENSION vector;` when Ch 5 ships. |
| Resend | 🟢 LIVE | `info@peek.gift`, DKIM verified. |
| ZenRows | 🟢 LIVE | handles ~100% of scrape today. |
| fal.ai | 🟢 LIVE | Flux image gen via `lib/image-gen/fal.ts`. |
| PostHog | 🟢 LIVE | project `434015`, host `us.i.posthog.com`. |
| Upstash Redis | 🟢 LIVE | rate-limit, Stripe webhook idempotency, presence. |
| Netlify | 🟢 LIVE | site `peek-gift-vnext` = `932646db-e8be-42f1-a94b-a57bb733e308`. URL `vnext.peek.gift`. Env vault. `CUTOVER.md`. |
| Sentry | 🔴 BLOCKED | org `peekgift` (`4511426433646592`), **no DSN keyed**. Frank: grab DSN + auth token. Code no-ops without it. |
| Twilio | ⚪ TBD | SMS/WhatsApp share returns `sms_not_configured` until keyed. |
| Inngest | ⚪ TBD | jobs `nudge-relationships`, `scrape-worker`, `webhook-logger` no-op without keys. app `peek-gift-vnext`. |

---

# THE CASCADE — chapter map

- **Ch 0 — Ground truth** (audit reality; don't trust the status, verify it)  ← *written in full below*
- **Ch 1 — The foundation** (the over-built typed spine + core + the gate)  ← *written in full below*
- **Ch 2 — The chat** (the crown jewel: translucent chat over live preview)  ← *written in full below*
- **Ch 3 — The vibe engine** (cool/animated pages from few inputs + the aesthetic gate)  ← *prompt slots laid*
- **Ch 4 — The recipient page** (HEMLOCK / The Drop / bundle carousels / unfurl)  ← *prompt slots laid*
- **Ch 5 — The catalog moat** (normalized product graph, entity resolution, retrieval)  ← *prompt slots laid*
- **Ch 6 — MCP** (expose your own services to the curator)  ← *prompt slots laid*
- **Ch 7 — The gates** (Braintrust eval, aesthetic eval, Sentry, publish gate)  ← *prompt slots laid*
- **Ch 8 — Cutover** (legacy → vnext, publish→notify→fulfill, Twilio)  ← *prompt slots laid*

> Foundation chapters (0–2) are fully forged below. Chapters 3–8 have their **named prompt slots** laid so the whole cascade is visible and ordered — say the word and I flesh any chapter into full droppable prompts with gates. That is the top-down build *you* described: foundation in the can, sub-levels forged out from it as we go.

---

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

# CHAPTER 3 — THE VIBE ENGINE *(prompt slots — say the word, I flesh these)*
*The thing that makes pages look drastically cool/animated/fancy off a few inputs (princess birthday vs bachelor party). Validity is already handled — the gap I flagged as existential is **whether it's actually beautiful and on-vibe**, which validity math can't prove. So this chapter ends with a human-rated aesthetic gate.*

- **3.1** — VibeSpec grammar (the ~10-dimension occasion descriptor) as a Zod schema in `packages/core`.
- **3.2** — OKLCH palette engine: VibeSpec → palette via OKLCH math; **contrast-derive-until-it-passes** so every pairing is ratio-correct.
- **3.3** — Zod **auto-repair** gate: any generated theme that violates an invariant is repaired or rejected, never shipped broken.
- **3.4** — Presets + occasions library; composition automaton with the R1–R8 invariants.
- **3.5** — Motion/animation layer driven by VibeSpec (so "fancy/animated" is data, not hand-coded per page).
- **3.6 — THE AESTHETIC EVAL GATE (do not skip):** a Braintrust eval set of generated pages per occasion, scored by **human aesthetic rating**, not just validity. GATE = a human-rated aesthetic score threshold per occasion before a vibe ships. *Personalization is the moat; "valid but ugly" loses.*

---

# CHAPTER 4 — THE RECIPIENT PAGE *(prompt slots)*
- **4.1** — Hero block (HEMLOCK reference: collection eyebrow, editorial headline, subhead, CTA) from `render`.
- **4.2** — **Bundled horizontal carousels** per set ("The Drop · 03 pieces", cards like Cordura·slate / 24oz·brushed / merino), horizontally scrollable.
- **4.3** — Badges: "NEW · updated by claude", "JUST PLACED" chip.
- **4.4** — The bundle-link decision: render `linkStyle: "threaded"` as the **dashed-thread circle-link** between related kit cards vs `"separate"`. (Your open question — this implements both, theme picks.)
- **4.5** — Recipient selection within `hardCap`/`softCap`; soft-cap warning, hard-cap block.
- **4.6** — `next/og` dynamic unfurl so the link previews as a themed card in iMessage/WhatsApp. GATE = paste a real unfurl screenshot from a phone.

---

# CHAPTER 5 — THE CATALOG MOAT *(prompt slots — this is PerfectPurchase's decision layer at the data level)*
- **5.1** — `CREATE EXTENSION vector;` on Supabase; schema `pg_products` + `pg_offers` (one canonical product, many offers: retailer, price, link, commission).
- **5.2** — **Entity resolution**: dedupe feeds by UPC/GTIN + title+image embedding similarity → one product, many offers.
- **5.3** — Hybrid retrieval: structured filters + pgvector text + **CLIP image embeddings** (the bridge to the photo-of-the-room vision).
- **5.4** — **Freshness gate**: feeds for discovery, live price/stock check on the specific items right before showing. Never a dead link or wrong price in front of a recipient.
- **5.5** — Feed ingestion. Primary sources (flip the model — feeds primary, scrape/web_search fallback): the aggregators on your list **plus the ones you were missing** — Google **Shopping Content API / Merchant Center**, Shopify **`/products.json`** + Storefront API (your non-Amazon differentiation), **Etsy + Faire**, Amazon **PA-API** for structured data.
- **5.6** — Compounding ranker: capture what gets picked/converts per occasion; RAG/ranker over your own outcomes so it curates from accumulated taste.

---

# CHAPTER 6 — MCP *(prompt slots)*
- **6.1** — Wrap the catalog query + matcher (Ch 5) as **MCP tools**.
- **6.2** — Wrap your live services (Stripe publish state, Resend/Twilio share, fal image gen) as MCP tools.
- **6.3** — Point the curator turn (2.4) at the MCP menu so it queries your own platform off a labeled list instead of you praying it remembers the capability exists.

---

# CHAPTER 7 — THE GATES & OBSERVABILITY *(prompt slots — live before real users)*
- **7.1 — Braintrust eval-gate (BRIEF 05) in CI:** curator turns must pass an eval set before deploy.
- **7.2 — Aesthetic eval** (from 3.6) wired into the same gate.
- **7.3 — Unblock Sentry:** Frank keys the DSN + auth token (org `peekgift`); confirm `withSentryConfig` reports a real error.
- **7.4 — The $12 publish gate:** Stripe price `price_1TapZICEKPUsVee1ddG4n14M`, `PAY_MODE=live`; on success → publish doc + notify User1 (Resend now, Twilio when keyed).
- **7.5 — Inngest jobs** (`nudge-relationships`, `scrape-worker`, `webhook-logger`) keyed and durable.

---

# CHAPTER 8 — CUTOVER *(prompt slots)*
- **8.1** — Follow `CUTOVER.md`: legacy peek.gift (Vite) → `vnext.peek.gift`.
- **8.2** — End-to-end gate: create a peek in the chat → theme it → publish ($12) → recipient opens the unfurled link → picks within cap → User1 notified. Paste the full run.
- **8.3** — Twilio SMS/WhatsApp share keyed; share path no longer returns `sms_not_configured`.

---

### The discipline that makes this safe
Every prompt has a gate. A gate that can't pass is a **STOP**, not a workaround. That single rule is what turns "100 cascading prompts run over days" from your worst nightmare into something that physically cannot tail-spin: the artifact — the test, the deploy, the screenshot — overrides the model's confidence at every step. That's the maker-checker you said the Revlon wire never really had. Now it's yours, at the document level and at the build level.

**Tell me which chapter to forge out next (3 → 8), and I write its prompts in the same full, gated form as 0–2.**
