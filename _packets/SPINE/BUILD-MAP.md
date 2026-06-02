# BUILD-MAP — exists-and-works vs. to-build (BUILD-BOOK Chapter 0.3)

> Rule: nothing on the RIGHT that was proven working on the LEFT. Evidence for the LEFT is in GROUND-TRUTH.md.

## LEFT — exists and works (verified; reuse, do not rebuild)
- **Supabase `peek_v2` schema** — 14 RLS tables, live, holding real rows. Reuse as the persistence target.
- **The IR + Zod schema** (`lib/ir/{contract,schema,ports}.ts`) — sound; **lift verbatim** into `packages/core`.
- **The renderer** (`lib/peek-render/*`) — 18 section kinds + mockup-caliber shell; reuse as the view layer
  (with the 4 documented gap fixes — those are RIGHT-side work).
- **The lean Opus chat + 16 tools** (`lib/peek-chat/*`) — the "model is the resolver" path; reuse the system
  prompt + tool set, re-pointed through the new command gate.
- **The design package** (`peek-jumpoff/*` + 3 `samples/*.ir.json`) — few-shots, conformance fixtures, method.
- **Bookends on `atelier-integration`** — custom Clerk auth, landing, the webhook→`publishPeek` path. Reuse via ports.
- **The i18n checkout reference** (`feat-stripe-embedded-checkout:atelier/app/api/checkout/route.ts`) — the
  Stripe **Checkout Session** shape to adopt (drop atelier's custom PaymentIntent/coupon/currency layer).
- **Stripe $12 gate** (price + one succeeded charge) and **deploy pipeline** (Netlify ← `atelier-integration`).

## RIGHT — to build (by BUILD-BOOK chapter)
- **Ch 1 — the foundation:** Turborepo monorepo; framework-agnostic `packages/core`; the **command→event→state
  maker-checker** (`decide`/`apply`, neverthrow) — *net-new* (today's `events` table is telemetry, not
  command-sourcing); the runtime token system (`themeToCSSVars`, **+ the glow fix**); a pure `render(document,
  theme)` view-model; typed service ports (Auth/Payment/Persistence/LLM/cardResolver/image/scrape/notify).
  *(Ch 1.1 scaffold + spine + anti-framework guard: DONE & gated.)*
- **Ch 2 — the chat:** the single-page **translucent chat over a live preview**, no wizard, **no drawers**,
  `visualViewport` keyboard-collapse reveal; multimodal rail (text/URL/image/camera/voice); the curator turn =
  Anthropic (server) → tool-use → Zod-validated Commands → `decide()` → events; "pinged the sections I touched".
- **Ch 3 — the vibe safety-net:** ThemeSpec is already in the IR; add the OKLCH AA-repair, the auto-repair
  gate, the cached design pantry as model context, motion-as-data, and the **human-rated aesthetic eval gate**.
- **Ch 4 — the recipient page:** **rules-aware grouped controls** (read `VariantGroup.selection`),
  experience-as-**itinerary**, caps (hard/soft, fill-bar), server-enforced picks, `next/og` unfurl. Closes the
  `picks`=0 gap.
- **Ch 5 — the catalog moat:** `CREATE EXTENSION vector`; product/offer graph; entity resolution; hybrid +
  CLIP retrieval; freshness gate; feed ingestion.
- **Ch 6 — MCP:** expose catalog + live services to the curator as MCP tools.
- **Ch 7 — gates/observability:** Braintrust eval gate, aesthetic gate, **unblock Sentry**, the **$12 live
  publish** via `PaymentPort` (Checkout Session), Inngest jobs.
- **Ch 8 — cutover:** legacy peek.gift → vnext; the **end-to-end** create→theme→publish($12)→recipient
  picks→creator notified run (the never-yet-completed loop); Twilio share.
