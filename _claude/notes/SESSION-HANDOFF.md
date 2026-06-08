# SESSION HANDOFF — peek.gift recon (read this first)

> Written by a prior Claude Code session for the next one. The owner (Frank) is
> starting a fresh chat. This file + `_claude/docs/*` + `_claude/snapshots/*` are
> everything you need to be fully oriented. **Do not start coding. Orient, then
> recommend.**

---

## 1. How the owner wants to be worked with (non-negotiable)
- **Gloves off, blunt, zero performative theater.** No "drama class" hedging, no
  narrating options you won't take. Opinions over obedience — he explicitly wants
  you to say "your setup is weak, here's a sicker/leaner idea" if that's true.
- **The only way to disrespect him is to lie** — including claiming "done" without
  proof, or burying CYA comments in code. Prior sessions did exactly that and it
  cost him weeks.
- **Tokens & subagents are free.** Fan out aggressively. Do NOT read everything in
  your own window — delegate reads/diffs to subagents that return tight reports.
  He has more token budget than he can spend before reset.
- He is **ex-global-finance/fintech prod dev** (ran systems behind NAM/EMEA
  mortgage flow at Citi). He understands engineering and payments. Don't lecture
  about secret hygiene, rotation, "don't commit keys" — he manages that himself.
- Operating contract he wants honored: **prove-never-claim · every task ends in a
  GATE (a passing test / a 200 / a real deploy / a screenshot) · no skeletons or
  `// TODO: implement` · small diffs · build LIVE not mock · a gate that can't pass
  is a STOP, not a workaround.** (Full version: `_claude/docs/PEEK_GIFT_BUILD.md`.)

## 2. The north star (the ONLY thing that counts)
A website a **random human from Instagram** lands on → builds/sees an art-directed
**gift page** → hits a **money button** → **real money in Frank's bank account, from
every non-sanctioned country** (Stripe, global). Landing/auth/checkout are the
"bookends" — Frank considers those easy and will handle/accept them later. **The CORE
(create → publish/pay → recipient picks within rules → creator notified) has NEVER
run end-to-end. Making it run is the milestone.**

## 3. What the product is (from `_claude/docs/peekgift_product_intent_source_orientation.md`)
A **Creator** builds a personal gift page for a **Recipient**: hero image, personal
note, and curated **picks** the Recipient chooses from, inside **rules** the Creator
sets (pick-one / caps / locked-"beg"-to-unlock / fill thermometer). "The Creator makes
the emotional frame; the Recipient gets agency inside it." Mobile-first (Instagram
traffic). Service tiers Studio/Concierge/Atelier (Studio = v1 self-serve). The rules/
selection engine is the genuinely novel, defensible part.

## 4. The artifacts (what's in `_claude/`)
- `snapshots/deployed/` — extracted `peekcodebaseDEPLOYED06072253.zip`. Frank's LATEST
  deployed snapshot (dated 06-07). **Vanilla HTML/JS + Netlify Edge functions; Claude
  Opus generates the gift-page HTML live; FAL generates images; "SEAT" persona prompt
  drives it.** ~12 files. It "kinda works and looks good." Bookends intentionally
  stripped. **No payment wire, no auth, no persistence** (publish fires into a dead
  callback).
- `snapshots/iterated/` — extracted `peekappiterated.zip`. **Minimal diff** vs deployed:
  moved the `generate` endpoint from Netlify Edge → **Supabase Edge** (to beat the ~60s
  edge timeout; Opus pages take ~90s). Hardcoded a Supabase URL + public key in the
  browser JS. Nothing toward payments.
- `snapshots/_zips/` — the original uploads, untouched.
- `docs/` — Frank's two briefs (product intent + the full BUILD-BOOK).

## 5. Key findings this session (VERIFIED by subagents)
1. **The deployed zip ≠ the git repo. They are DIFFERENT architectures**, not
   iterations:
   - Zips = vanilla-JS live-generative "SEAT" app (above).
   - Git HEAD on branch `claude/tender-babbage-ukn6Q` (last commit 2026-05-25) = a
     **Next.js 15 "vNext" app**: Clerk auth, Supabase (schema `peek_v2`: curators,
     peeks, cards, variant_groups, picks, chat_*, events), file storage, a polished
     recipient view (`/g/[slug]` — door/note/cards/confetti), dashboard, share flow.
2. **vNext HAS a real Stripe wire** — `/api/publish` creates a real Checkout session
   ($12 via `STRIPE_PRICE_ID`); `/api/stripe-webhook` flips the peek to published. BUT
   it's **gated behind `PAY_MODE=mock` by default**, so live payments are an env flip,
   not a build-from-scratch. Business model in code = **pay-to-publish** (the Creator
   pays $12 to publish; Recipient picks free) → **money flows to the platform/Frank's
   Stripe account → his bank. No Stripe Connect needed** if Frank is the payee. (An
   earlier subagent over-flagged "creator payout infra" — that's wrong for this model.)
3. **The git is genuinely a mess: ~40+ remote branches** across lineages —
   `claude/wave1-*`, `claude/wave1-5-*`, `claude/wave2-*`, `claude/studio-integration`,
   `claude/studio-vnext`, `claude/wizardly-mendel-*`, `feat/brand-config`, plus the
   BUILD-BOOK-referenced `atelier-integration`, `bold-feynman`, `jolly-mccarthy`,
   `feat-stripe-embedded-checkout`, `claude/gallant-planck-pu51x`,
   `engine-parametric-REJECTED`. The local clone originally only tracked 2 of them; a
   full `git fetch '+refs/heads/*:refs/remotes/origin/*'` pulls them all.

## 6. THE central tension to resolve (the real decision — do not skip)
There are TWO opposite visions in what Frank has handed over:
- **(A) The zips:** a crude vanilla-JS thing that ACTUALLY KINDA WORKS, looks good, and
  is his newest artifact. Tiny. Missing bookends on purpose.
- **(B) The BUILD-BOOK (`docs/PEEK_GIFT_BUILD.md`):** a gorgeous, maximalist "decided"
  architecture — Turborepo monorepo, framework-agnostic `packages/core`, event-sourcing
  (command→event→document, neverthrow), Zod everywhere, pure render, runtime tokens,
  tRPC, Supabase+Drizzle+**pgvector catalog moat**, MCP tools, **Braintrust evals**,
  a gated Chapter 0→8 plan. **By its own admission (§"Known issues"), the end-to-end
  loop has NEVER run.**

**Prior session's emerging thesis (UNCONFIRMED — verify, then advise Frank):** the
BUILD-BOOK may itself be the over-engineering tail-spin that's kept him broke. It
front-loads a catalog moat / PerfectPurchase (Ch 5) and an event-sourced core before
the $12 money path has *ever* worked once (Ch 7–8). The leaner bet is likely: **ride
the thing that works to a real dollar first** — take the working generative core,
make it run end-to-end (incl. a real money button), bolt on the "easy" auth+checkout,
ship, take money — and treat the BUILD-BOOK as a someday-maybe north star you earn the
right to build *after* revenue. **But do not assert this before surveying the other
branches** — one of them (e.g. `atelier-integration` / `bold-feynman`) may already be
a more-complete working build than the zips. Get the facts, then give Frank a single
horse-pick with a blunt recommendation.

## 7. Live connections available (verify ACTUAL state — don't trust the doc)
Wired MCP servers this session: **Netlify, Supabase, Sentry, GitHub, Stripe** (Stripe
needs an auth handshake). BUILD-BOOK §11 *claims* live: Anthropic · Clerk
(`clerk.peek.gift`) · Stripe (`acct_1T4xnbCEKPUsVee1`, $12 = price
`price_1TapZICEKPUsVee1ddG4n14M`, webhook → `vnext.peek.gift/api/stripe/webhook`) ·
Supabase (`ewqpujqerdnrkjqlpobo`, schema `peek_v2`, ~14 RLS tables, bucket
`peek-v2-assets`, pgvector available-not-installed) · Resend · ZenRows · Browserbase ·
fal · PostHog · Upstash. In-flight: Sentry (DSN), Inngest. Netlify site id
`932646db-e8be-42f1-a94b-a57bb733e308`. **Chapter 0 of the BUILD-BOOK is literally
"don't believe the claim, verify the artifact" — do that.**

## 8. What is NOT yet verified (open work for the next session)
- **Live infra recon never completed this session** (the agent was still running at
  handoff). Verify Netlify deploy state, Supabase tables/advisors, Sentry issues,
  GitHub PRs/CI.
- **The other git branches were never surveyed.** Fetch all, survey by date, find the
  best working baseline.
- **No README/handoff/cruft inventory yet.** Frank asked for one: gather all the
  scattered `*.md` handoffs + flag buried "never change this / canonical / do not
  touch" comments that mislead later sessions.

## 9. Recommended first moves (next session)
1. `git fetch '+refs/heads/*:refs/remotes/origin/*' --prune`, then survey every branch
   by `committerdate` with subagents — what each lineage is, what works, by date.
2. Verify live infra (Netlify/Supabase/Sentry/GitHub via MCP) against BUILD-BOOK §11.
3. Build the doc/cruft inventory.
4. Come back to Frank with **ONE recommendation**: the single horse to ride to a working
   money button fastest, and a blunt take on whether the BUILD-BOOK is too much.
5. THEN build — live, gated, small diffs, prove every step.

## 10. Housekeeping
- Develop on branch **`claude/tender-babbage-ukn6Q`** (push there).
- `_claude/` is Claude's workspace — keep recon/notes here, isolated from app code.
- Ultracode silently flips OFF sometimes; Frank watches a 6pt corner indicator and
  wants to be told when you notice it off.
