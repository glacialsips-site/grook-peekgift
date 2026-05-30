# peek.gift — The Spine (tight)

The whole product is **5 pages + popups.** Everything serves one loop:
**land → auth → build (chat → engine → live preview) → checkout (publish) → slug (live peek).**

## Pages
1. `/` — **Landing.** Public, SSR/SSG, SEO. "Build" CTA → **auth popup** (Clerk).
2. `/build/[peekId]` — **Builder.** The chat-over-live-preview (what we're building). Authed, real-time. Chat (Anthropic agent) patches IR + Genome → preview re-renders live. Popups: share · settings · model.
3. `/checkout` — **Checkout.** Stripe ($12 publish/unlock). Popup: payment.
4. `/account` — **Account.** Your peeks · billing · settings.
5. `/g/[slug]` — **Slug.** The published peek. Public, SSR (SEO + share cards).

**One renderer, two contexts:** the *preview* (page 2) and the *slug* (page 5) render the **same IR + Genome through the same `ir-render-web`.** No preview-vs-real fork — that's a classic ceiling, refused.

## Tightened architecture — one app + the engine + 5 spine contexts
- `apps/web` — **ONE** Next.js app (App Router). RSC/SSR for landing + slug (SEO); client + streaming for build. **Popups = modals, not routes.**
- `packages/` (the engine — built/building): `site-ir` · `vibe-genome` · `vibe-harmony` · `vibe-resolve` · `ir-render-web` · `armory/*`. Serves preview **and** slug.
- **5 spine contexts** (each a port → an existing vendor as the adapter):
  - **identity** → Clerk (auth popup, sessions)
  - **composition** → the peek store: IR + Genome persistence + mutation log (event-sourced) + versions → Supabase
  - **generation** → the chat agent: Anthropic (via gateway) → typed tools that patch IR + Genome (synthesize / alternatives / tweak) → emits events
  - **commerce** → Stripe (checkout / $12 publish)
  - **publishing** → slug resolve + render + cache (custom domains later)
- Cross-cutting: PostHog (analytics) · Sentry (errors) · the **vision judge** (Anthropic vision + Braintrust) gating vibe quality.

## What I CUT to tighten it
- The generic builder's ~13 bounded contexts (auctions / events / ticketing / …) were from the **demo**, not peek.gift. Collapsed to the **5 above.**
- The **affiliate/revenue ledger** is real but post-traffic (your own doc): **seam now, build later** — IDs + the event log already carry it, so it's never a rewrite to add.
- Deploy = **modular monolith** (one Next app + edge/serverless fns), not 13 deployed services. Split only if scale demands.

## Verdict
Tight: 5 pages · one app · one renderer · 5 contexts · every vendor a swappable adapter. **Good to go as the skeleton** — the engine packages slot straight in; the app shell just wraps them. The only thing I'd still watch: the Builder's real-time IR+Genome sync (CRDT) is the one genuinely-hard seam in this list; everything else is plumbing.
