# STACK-LOCK — post-bake-off decision (RECOMMENDED, pending Frank's key-turn)

_2026-05-28. Decided from 9 throwaway prototype probes + 1 salvage audit. This supersedes all prior SPINE stack notes; if anything else conflicts, this wins once Frank turns the key._

## Headline

**Moat substrate = plain CSS custom properties + CSS Modules.** No Tailwind, no CSS-in-JS, no compile-time theme lib.

Bake-off scores: **CSS-vars 9/10 > Panda 8 > vanilla-extract 7.5 > StyleX 6.**

Why it wins on principle, not just score: the moat is *AI-invents-the-vibe-at-runtime*. CSS custom properties are the **native, first-class runtime-theming primitive**. Every compile-time lib (vanilla-extract/Panda/StyleX) makes runtime-invented theming a **second-class path** and charges a compiler tax to buy build-time type-safety that **runtime-generated values can't use anyway**. The "never-broken" guarantee does NOT live in the styling lib — it lives in a **substrate-agnostic Zod + OKLCH validation/auto-repair layer** (the grammar). Factor that out and the substrate's only job is: best at runtime theming + RSC/SSR + lowest tax. That's plain CSS vars, natively, zero tax, RSC 10/10. Radical capability and simplicity converge — the tell that it's right.

## The locked stack

| Layer | Decision | Evidence |
|---|---|---|
| Language | TypeScript strict | floor |
| Shell | Next.js 16 App Router + React 19. Recipient page SSR/RSC (OG/unfurl/fast-paint); build surface = client island. | — |
| **Styling / moat** | **Plain CSS custom properties + CSS Modules. Tailwind DEAD.** Zod `VibeSpec` (10-dim, OKLCH, auto-repair, SAFE_DEFAULT) → `--vibe-*` on wrapper → pure RSC components read vars. Structure = finite enum of layout variants (`data-*` selects skeleton); paint = infinite runtime values. | dg-css-vars 9/10; grammar-spec |
| Design grammar | Variety = combinatorics of legal tokens, never free-form. Hero ×5 / story ×5 / product-set ×6 / divider ×4 / CTA ×4. OKLCH palette physically can't emit failing contrast. | grammar-spec (`grammar.ts`, tsc-clean) |
| Chat-loop compute | **Netlify Edge Functions** (Deno, SSE long-stream, upstream-wait-free). NOT standard Node fns. **VERIFIED GO** — SDK runs on Deno (zero `node:` deps), loop is network-bound, bursts <0.04ms. | backend-arch + edge-loop-verify |
| Infra | **Stay Netlify + Supabase. No Cloudflare/Durable Objects for v1.** A peek is single-client streaming + reactive state, not a distributed actor. DO is a later optimization only if true real-time multi-client collab becomes hard-required. | backend-arch keystone flip |
| Collab | Relay contribution → **no CRDT / no Yjs.** | backend-arch |
| Mobile | **PWA, not native.** Non-negotiables: shell sized to `visualViewport` (never `100vh`); never animate under a live backdrop-blur (suspend during diff-mark). | build-actor GO |
| Data | Supabase Postgres + Drizzle + Zod + pgvector. Keep schema DESIGN (normalized, addressable, RLS) as spec; regenerate clean migrations. Page-state = `{vibe, order[], sections{[id]}}`. | salvage |
| Catalog | Build product-graph schema now (`pg_products`/`pg_offers` + pgvector); fill opportunistically from scrapes; bulk-load affiliate feeds once live+approved (Rakuten first). Scrape = 4-provider fallback. Entity-res: GTIN→embedding, conservative threshold (false-merge is catastrophic). | product-graph |
| Metering | Extend existing `lib/usage`. 7 capability gates, all valves default WIDE OPEN, throttle-from-data via `cohort_overrides` DB upsert (no deploy). Log cost + conversion per cohort. | meter-spec |
| Auth | Clerk headless/Elements, 100% custom UI (zero Clerk branding). Keep the engine. | salvage solid-keep |
| Payments | Stripe Payment Element, custom UI. **Rebuild checkout fresh** (vNext's is broken); reference LEGACY peek.gift's working one. Country/currency/tax/method config already done. | Frank evidence |
| AI | Full Anthropic surface (Sonnet default, Opus opt-in), MCP, prompt caching. Curator-Sonnet = closed-objective copilot. 4.8: adaptive thinking (NOT `budget_tokens` — 400s on 4.7/4.8), mid-conversation system messages, eval-gated CI (Braintrust) pulled forward. | 4.8 docs |

## Build method

**Raze code, keep knowledge. Spine-then-blast.** Clean-room rebuild fed by: good schema design + the trap-list + legacy working references + these 9 prototype verdicts. Phase 1 = spine (one peek end-to-end: landing→auth→chat-builds-page→publish→recipient→checkout). Then fan hundreds of agents to fill, against a proven spine.

## Guardrails / lock-time verifications (not hedges — known unknowns to close during the spine)

1. **Test the Zod validation gate hard** — it's the *only* never-broken guarantee at runtime.
2. **ESLint rule:** components use only `var(--…)`, never literal colors (the one safety the compiler libs gave that we're forgoing).
3. **Anthropic loop on Edge/Deno: VERIFIED GO.** Hard build rule for the chat-loop phase: cap tool-result payloads to ≤~200 items (paginate catalog/scrape tools) to stay under 50ms-CPU/burst; flush headers before the first model call (beats the 40s header timeout, then runs indefinitely); persist turn-state to Supabase + SSE keep-alives so a dropped client can resume. Fallback to Node/Fly only if a tool needs >50ms *synchronous* CPU that can't be paginated.
4. **Retest mobile** (keyboard + blur FPS) on a physical iPhone + mid-Android before locking the build-actor approach (current data is throttled-emulation).

## Knowledge kept (from salvage — branches survive, code re-checkoutable)

- Schema design (normalized, addressable, RLS) → spec.
- Trap-list: `maxDuration=300` vs Netlify 26s (3 routes); 400-race tool-result repair; cookie-write-in-Server-Component.
- Legacy peek.gift = working checkout reference.
- Existing `lib/usage` (metering) + `lib/vibe/css-vars.ts` (the moat seed — already emits `--vibe-*`) → extend, don't reinvent.

## Prototype evidence (code on these branches, re-addable via `git worktree add`)

dg-css-vars `worktree-agent-a83faa0570c20e62c` · dg-panda `…a6e07c7c` · dg-vanilla-extract `…a2500a33` · dg-stylex `…a1caeea5` · build-actor `…a62ae6d6` · backend-arch `…a9fff542` · product-graph `…abcba516` · meter-spec `…aa1a7609` · grammar-spec `…a2ee8486`
