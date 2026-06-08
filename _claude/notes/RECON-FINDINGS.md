# RECON FINDINGS — verified intelligence (2026-06-08)

Produced by a 7-agent parallel recon (infra + 6 branch surveys). "Verified" = checked
against the live service or the actual code, not the docs. The owner is ex-fintech;
precision matters.

## The codebase reality (the "mess" decoded)
There are THREE+ parallel peek.gift codebases, which is why it felt unrecoverable:
1. **Legacy `peek.gift` (Vite + Netlify Functions)** — a SEPARATE repo. **The only thing
   that has ever made money: 31+ real $12 Stripe charges** (metadata `product:'peek.gift'`).
   The live Stripe webhook still points here.
2. **vNext (this repo, `grook-peekgift`, Next.js/atelier lineage)** — DEPLOYED at
   vnext.peek.gift (Netlify, deploy `ready`). Live Supabase has **50 peeks, 380 chat
   messages, 277 usage rows… and 0 picks, 0 payments, 0 webhook events. The loop has
   never closed once.** `product:'peek.gift_vnext'` = 0 charges.
3. **The SEAT zips (vanilla JS + Netlify Edge)** — the owner's 06-07 deployed snapshot;
   freeform live-AI page generation; no auth/persistence/payment (bookends stripped on
   purpose).

**The pattern: the original made a trickle; every rebuild since (vNext → atelier →
studio → SEAT) has earned $0 because none ever shipped the money path.** Not "can't
build it" — "keeps rebuilding and never crosses the line."

## The rebuild lineage converged on two finalists
- **`gallant-planck-pu51x` (06-02)** — a real pnpm/turbo MONOREPO matching the
  BUILD-BOOK's ideal: `packages/core` with Zod `PeekDocument` + neverthrow
  `decide/apply` event-sourcing + **17 passing tests**; `apps/web` Next app on `@peek/core`;
  streaming Opus loop routed through the validated command gate. **Closes all 3 renderer
  gaps** bold-feynman left open (rule-aware variant clusters, activity→itinerary,
  glow→hero). Embedded $12 Stripe present. STRUCTURED-IR philosophy (the page is a
  validated document). Carries dead duplicate `lib/*` to prune.
- **`clean-slate` (06-04, NEWEST)** — the freeform-HTML PIVOT. Clean monorepo
  (`apps/web` + trimmed `packages/core`; ~167 legacy files + ~1200 lines bloat removed).
  Claude authors the gift page as **freeform HTML in a sandboxed iframe** — same magic as
  the SEAT zips, inside the framework. Working chat-over-live-preview Studio; recipient
  `/g/[slug]` serves authored HTML; pick route + `decidePick` caps real server-side.
  Uses `paymentConfigured()` (key presence), dropped `PAY_MODE`. **GAP: the studio UI has
  NO publish→pay CTA (Phase 3b unbuilt); the Stripe lib is real but unreachable from the
  client. No `/api/curator` middleware (paid Opus endpoint is open).** Loop ~65%, money
  path ~40% (server ready, client trigger missing).

bold-feynman (06-01) = the proven lib substrate gallant re-architected from (~75%, KEEP
as reference). build/peek-vnext = duplicate of atelier-integration (DROP). peek-clean =
atelier minus cruft. atelier-integration = deployed base, real Clerk(headless: pwd +
email-code + Google/Apple/GitHub OAuth + 2FA) + real Stripe, BUT the BUILD-BOOK's
`peek_mutation_log` gate + AuthPort/PaymentPort are DOCS-not-CODE on it (auth/payment
hardcoded; mutation-log only on unmerged `lt/mutation-log-schema`).

## The money path (verified, scattered, ~90% built, never assembled)
- **Best checkout: `feat-stripe-embedded-checkout`** — only branch delegating full i18n to
  Stripe: `adaptive_pricing` (local currency), `automatic_tax`, `tax_id_collection`,
  Address Element, promo codes = the "every non-sanctioned country" requirement, basically
  done.
- **Best webhook: `wave1-stripe-async-payments`** — adds async_payment_succeeded/failed +
  reverts peek to draft on failure (embedded-checkout's webhook only handles
  `checkout.session.completed`).
- **Universal traps:** every branch defaults `PAY_MODE='mock'` and the mock path SILENTLY
  marks the peek published with ZERO charge (gives the product away). **No branch sends a
  creator notification from the webhook** (the email template exists, never sent from the
  hook). Webhook route is `/api/stripe-webhook` (code) vs `/api/stripe/webhook` (doc) —
  confirm the Stripe-side endpoint.

## Standout asset
`_packets/SPINE/skills/vibe-direction.md` — a cached-every-turn design "pantry"
(per-occasion seed palettes princess/bachelorette/condolence, font taxonomy mapped to
intent, dial vocabulary) framed as model context, not a generator. The single best
anti-generic lever in the whole repo. ELEVATE it.

## Design-engine keep/drop (verified)
KEEP: runtime CSS-variable theming (atelier `lib/vibe/*` → `--peek-*`), node-vibrant
palette extraction, and `packages/vibe-harmony` (OKLCH + WCAG-AA contrast repair, via
culori) as an accessibility safety-net. DROP: `vibe-resolve`/`vibe-genome` deterministic
knob expansion — the defect is the FIXED VOCABULARY (caps the divergence the moat needs),
not "deterministic." Model must author the vibe FREELY; math only repairs.

## Verified blockers to the first vNext dollar
1. Money is mock-gated / publish CTA unwired in the Studio client (Phase 3b).
2. Webhook is narrow (no async) + sends no creator notification.
3. Live Stripe webhook still targets the LEGACY site (cutover needed — CUTOVER.md).
4. Stripe account live-readiness UNVERIFIED (needs owner OAuth: charges-enabled, price
   active, currencies, tax).
5. Sentry wired-but-dead (no project/DSN). CI red (last runs failed on
   atelier-integration 05-28; none on recent branches). `/api/curator` middleware missing.

## RECOMMENDATION (pending owner ratification — "don't build until I pick the horse")
**Ride `clean-slate`, lift the proven money code, close the loop.** It's the newest line,
it embodies the freeform generative magic the owner actually deployed and likes, it's the
cleanest deployable shape, and its gap to money is the smallest and most concrete of any
branch. Lift `feat-stripe-embedded-checkout`'s checkout surface + `wave1`'s async webhook +
add the creator notify, wire the publish CTA, flip live, cut the webhook over from legacy.
Port gallant-planck's rule-aware renderer AFTER the first dollar, not before.

## Open items for the owner
- Where does the **legacy money-maker repo** live? We must cut the Stripe webhook over to
  vNext WITHOUT killing the existing income trickle.
- Complete the **Stripe OAuth** so the money rail can be verified end-to-end.

## Docs & landmines (verified)
GOOD NEWS (directly answers the owner's fear): the application **CODE is essentially clean
of buried "never change this" CYA comments.** Almost all `DO NOT`/`never`/`canonical` hits
are legit LLM-prompt content, auto-gen headers, or real load-bearing notes (e.g. reveal
phase order, with tests). The rot is NOT in the code.
THE REAL RISK is in proliferating, mutually-contradicting handoff DOCS:
- **Competing "this WINS" `WAKEUP.md` files** — `studio-vnext` and `gallant-planck` EACH
  declare themselves the canonical/Netlify-production branch. A session reading the wrong
  one rebuilds the wrong thing. (atelier-integration is the most-built + only live-verified.)
- **The "never raw HTML" vs "DUAL REPRESENTATION" fork** (studio line) — an architectural
  reversal sitting across ~5 docs, **explicitly flagged in-doc as awaiting Frank's
  blessing.** THIS IS THE HORSE-PICK FORK BELOW — it is a known, owner-reserved decision.
- `SLUG_MODEL.ts` `@ts-nocheck` "canonical schema" stub (authoritative-sounding, unvalidated).
- No-Tailwind (bold-feynman) vs Tailwind-v4 (atelier) stale stack conflict.
TRUST SET (a new session's real orientation): `atelier-integration:_packets/SPINE/
VERIFIED-STATE.md` (only live-grounded doc; explicit conflict-winner) · `atelier:CLAUDE.md`
+ `_packets/MEMORY.md` · this `_claude/notes/*` + `_claude/README.md` · `studio-vnext`/
`gallant-planck` `DECISIONS.md`+`PLAN.md` for the "why."

## Status
7/7 agents complete. Horse-pick put to the owner (freeform-HTML `clean-slate` vs
structured-IR `gallant-planck` vs milk-legacy-first). Awaiting ratification before build.
