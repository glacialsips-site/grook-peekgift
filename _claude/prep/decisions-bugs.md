# peek.gift vNext — SETTLED DECISIONS · KNOWN BUGS · PRIOR-SESSION LESSONS

Compiled read-only by mining every WAKEUP/HANDOFF/DECISIONS/PLAN/PROJECT_SUMMARY/MEMORY/STATE/BUGS/audit/RECON/INVESTIGATION doc across the five named branches. Every claim cites `branch:path` and quotes the source. Items are tagged **CURRENT** / **OLD** / **SUPERSEDED**.

**The single biggest thing the reader must internalize:** this project has been through **~50 non-compounding restarts** and **three+ architecture flips in 6 days**, all on the same Stripe/Supabase/Clerk accounts. The five branches are NOT five views of one codebase — they are **different architectures**. Do not assume a bug or decision on one branch applies to another. The "trust order" for which is live is decided in §0 and §4.

---

## §0 — BRANCH MAP (read first — everything below depends on this)

All five branches diverge from one root `ef5647c` (2026-05-25); none is an ancestor of another except the config-vertical chain.
Source: `claude/gallant-planck-pu51x:RECON_FINDINGS.md` §3 ("All three diverged from the **same** root `ef5647c`… left-right unique-commit counts: feynman…atelier 19/330, feynman…jolly 19/20").

| Branch | Tip | Architecture | Status |
|---|---|---|---|
| **`claude/studio-vnext`** | `4e8b226` (serves `47fb836`) | Monorepo `packages/core` (event-sourced maker-checker) + `apps/web` (chat-over-preview studio), Opus 4.8, fal images | **CURRENT — Netlify production branch; "deployed, LIVE" per its own WAKEUP, 2026-06-03** |
| **`claude/gallant-planck-pu51x`** | `cf57963` | Same monorepo as studio-vnext, earlier (`packages/core` 53 tests, studio built + live-verified) | **SUPERSEDED by studio-vnext** (its own files identical except WAKEUP; studio-vnext WAKEUP calls planck "OLD residue") |
| **`claude/bold-feynman-SZzaO`** | `1049d0c` | Lean single Next app: `lib/ir` + `lib/peek-render` + `lib/peek-chat`, model-is-resolver, runs on stubs, never deployed | **SUPERSEDED** — was "canonical" 2026-06-01 (Addendum XIII), then demoted to "salvage source" (Addendum XVII) when Frank chose the monorepo |
| **`atelier-integration`** | `dec5312` | The old Next 16 monorepo under `atelier/`: Sonnet 4.6, 40+ tools, Clerk/Stripe/Drizzle/Inngest, governed vibe/grammar engine. The deployed-then-scrapped prototype | **SUPERSEDED as the product** but is the **richest bug/decision corpus** (`_packets/*`) and the source of the real bookends (auth/checkout/landing) + live DB migrations |
| **`peek-clean`** | `033a64b` | atelier engine made config-driven for 2 verticals (gift + GlacialSips water) | **Reference-only** (config-vertical experiment; carries `atelier/app/api/spine/*` + `atelier/lib/spine/*` + a unit test) |

Source for the production pointer: `claude/studio-vnext:WAKEUP.md` — "**Deployed: https://vnext.peek.gift** … serving commit `47fb836`. `claude/studio-vnext` = **Netlify production branch** (what deploys)… **gallant-planck + the 80 other branches are OLD residue**." And: "If any other doc conflicts with this one, **this wins**; the rest (`_packets/*`, older WAKEUPs) is residue."

> ⚠️ The atelier `_packets/SPINE/GROUND-TRUTH.md` (planck branch) still says "Netlify builds `atelier-integration` → vnext.peek.gift" (dated 2026-06-02). studio-vnext (2026-06-03) supersedes that: the deploy branch was repointed to `claude/studio-vnext`. **Verify the live Netlify branch before trusting either.**

---

## §1 — SETTLED ARCHITECTURAL & PRODUCT DECISIONS

### 1A. The big DESIGN-GREENLIT decisions (DECISIONS.md — identical on bold-feynman, gallant-planck, studio-vnext)
Source: `claude/bold-feynman-SZzaO:DECISIONS.md` (byte-identical on the other two). "Resolved with the design seat's greenlight (relayed by Frank, 2026-06-01)… settled calls + dead-ends; don't relitigate."

| ID | Decision | Status |
|---|---|---|
| (arch) | **The model is the resolver. No mandatory deterministic design engine.** The parametric resolver/director is fenced in `engine-parametric-REJECTED/`. | **CURRENT** — the single most load-bearing call |
| (arch) | **Overbuild the contract, build lean behind it:** `ir/contract.ts` (IR) + `ir/ports.ts` (every vendor behind a typed port + stub) = the frozen spine. | CURRENT |
| (arch) | **Keep ~all of v0**; migrate `lib/types.ts` as a SUPERSET (cards untouched; Vibe→ThemeSpec; hero 3-cols→MediaSlot; +concept/sections/page_type/cta_label). | CURRENT |
| (arch) | **Trust order when anything conflicts: original mockups > engine/renderer.js > prose.** | CURRENT |
| (renderer) | `engine/renderer.js` is a PRIOR generation; does NOT consume `PeekIR`. Build conformant renderer; **port the interaction shell**. **Bar = the ORIGINAL 10 mockups, NOT the Site Stamper renderer.** "'good' is a regression — the bar is 'screenshot-worthy.'" | CURRENT |
| DQ-1 | CSS vars use `--peek-*` namespace. | CURRENT |
| DQ-2 | Enrich ThemeSpec: `space` / `radius{card,pill}` / `motion` eases / `eyebrowTracking`. | CURRENT |
| DQ-3 | Add `details` + `gallery` section kinds; **wild signature moves (lotería, decree) stay model-authored `custom`**; promote ONLY `countdown` + `claim` to first-class (they carry live state static HTML can't). | CURRENT |
| DQ-4 | Add `value_display?: string` for ranges / "—". | CURRENT |
| DQ-5 | Card vocab: contract wins — `product/activity/aspirational/digital`; renderer re-mapped from `homemade/experience/idea`. | CURRENT |
| DQ-6 | Fonts: loader fetches **arbitrary** Google families from `FontSpec`; `FONT_SPECS` = pantry suggestions, **not a gate**. | CURRENT |
| DQ-7 | Recipient view = **ONE renderer, two surfaces**; door/reveal as a `page_type`; recipient layers its own pick/beg/unlock. | CURRENT (but unbuilt — see §2 bug R1) |
| DQ-8 | **Safeword = `bananahead`** (resolved 2026-06-01). Ships as `PEEK_SAFEWORD` config; chat reads `process.env.PEEK_SAFEWORD ?? "bananahead"`, **never inline in the system prompt**. | CURRENT |
| DQ-9 | Model: **Opus 4.8 + streaming + prompt-caching**. A cheap model stays available behind `LLMPort` for non-creative ops. | CURRENT *for the lean/studio line* — **CONTRADICTS atelier's locked "Sonnet 4.6 default" — see §4 C1** |
| DQ-10 | CardResolver cascade default order `retailer_api → url_scrape → research` (web-search+vision); **order is config/data**, reorderable without editing core. | CURRENT |
| DQ-11 | Remove the earlier split-pane first-cut (`lib/peek/*`, `app/peek/*`) during Milestone 0; salvage only streaming-route scaffolding. | CURRENT but **NOT DONE** — recon found `lib/peek/*`+`app/peek/*` "STILL PRESENT… a whole second Opus-4.8 chat… builds and ships" (`gallant-planck:RECON_FINDINGS.md` X2) |

### 1B. The framework decision (the one that flipped three times — see §4 C0)
**Final resolution: Frank chose (A) the BUILD-BOOK monorepo.** Source: `gallant-planck:_packets/MEMORY.md` Addendum XVII — "Frank chose **(A) the BUILD-BOOK monorepo**: Turborepo + framework-agnostic `packages/core` + the event-sourced `command→event→state` gate + tRPC + Drizzle… with feynman's lean chat/design-method/renderer + the atelier bookends ported in." This **superseded** Addendum XIII (2026-06-01: "bold-feynman is canonical… the lean single-app is operative"). The studio-vnext/gallant-planck `packages/core` build IS this decision executed.
- Under (A): canonical state = **`PeekDocument`** authored via a Zod **`Command`** union → **`Event`s** → folded state, with `decide(doc,cmd)→Result<Event[],Err>` (neverthrow) + pure `apply`. feynman's 16 tools become the Command union; `reduceTool`'s validate-then-apply becomes `decide`+`apply` with the event log added. (MEMORY Add. XVII.3)
- feynman demoted: "**feynman is demoted from 'canonical base' to 'salvage source'** (its chat, renderer, design package)." (MEMORY XVII.1)

### 1C. Frank's CURRENT product/process directives (studio-vnext, the freshest)
Source: `claude/studio-vnext:WAKEUP.md`.
- peek.gift = **"V0 of PerfectPurchase, deliberately minus fulfillment."** PerfectPurchase = "a decision layer between intent and transaction… returns a transaction-ready assembled bundle of real products from many retailers (masked)… Moat = **assembly intelligence**." peek = the wedge (gift-framed, self-distributing, ships the hard front-end without owning fulfillment).
- **Money model:** "peek only needs to cover COGS + ad spend (break-even / self-funding) — the real money is PerfectPurchase downstream." Virality = ~free CAC; controlled COGS = cap/cache Opus.
- **Fulfillment (auto multi-retailer buying) is DEFERRED** — "it's the boss fight and today's agents aren't reliable enough."
- **The V0 win condition — only two things that matter:** (1) "**Resolution that doesn't break**" — the `CardResolver` cascade (retailer API → scrape/ZenRows → LLM web+vision) is the foundation; stress-test it to death. (2) "**Output people forward**" — "Generic = nobody forwards = the loop dies. ('Generic is the only failure.')"
- **NO embedded checkout** — "it's a later full-custom build. `/api/publish` + webhook are harmless backend." **No landing page yet.** Build LIVE, no mock.
- **Next (when Frank says go):** harden the resolver; build the **concept-gate + reject loop** ("model commits a concept FIRST… Frank one-taps `keep`/`too safe, again`; every keep/reject logs into a growing taste corpus that feeds the system prompt").

### 1D. atelier-era locked decisions (SUPERSEDED as the product, but the live infra still runs on them)
Source: `atelier-integration:_packets/STATE.md` "Locked decisions" table + `_packets/HANDOFF-NEXT-FRAME.md`.
- Framework: Next.js 16 App Router + React 19.2 + TS 6 strict; `proxy.ts` (not `middleware.ts`, deprecated in Next 16).
- **Styling: Tailwind v4** — *this directly contradicts the lean line's "No Tailwind, runtime tokens" — see §4 C2.*
- Auth Clerk 7 (`clerk.peek.gift`); DB Supabase + Drizzle 0.45 + pgvector; AI Anthropic SDK 0.98 (prompt caching GA); Payments Stripe 22; Email Resend 6; Scraping Browserbase→ZenRows→Jina; Image fal.ai; Jobs Inngest 4; Cache Upstash; Analytics PostHog; Errors Sentry 10.
- **Default model Sonnet 4.6**, Opus opt-in per-call. **Custom UI everywhere** — no Clerk/Stripe branding (packets 15+28). **Mobile-first.**
- **No backwards-compat shims / dead-code / commented-out code.** "Always latest stable" — no version pinning, no `--legacy-peer-deps`.
- **Progressive everywhere:** "the chat agent never asks for one big batch of fields — it picks up signal continuously and updates the document continuously. The preview is *always* live."

### 1E. Settled facts about the live infrastructure (verified, all branches share these accounts)
Source: `gallant-planck:_packets/SPINE/GROUND-TRUTH.md` + `atelier-integration:_packets/SPINE/VERIFIED-STATE.md`.
- Supabase `ewqpujqerdnrkjqlpobo` (PG 17.6, us-east-1), schema `peek_v2`, **14 tables, RLS on all**.
- Stripe acct `acct_1T4xnbCEKPUsVee1`; **$12 price `price_1TapZICEKPUsVee1ddG4n14M`** on `prod_UZzXnuYuX4ud15`; test coupon historically `THISISTHEONE`→$0.50.
- Netlify site `932646db-e8be-42f1-a94b-a57bb733e308` → `vnext.peek.gift`. Storage bucket `peek-v2-assets`.
- **Real $12 revenue flows through the LEGACY peek.gift Vite site, NOT vNext** (see §2 BUG INFRA-1). vNext has processed **0** $12 charges.
- **Shared accounts with GlacialSips** (Frank's water-filter business) on the same Stripe — never touch legacy/glacialsips webhooks/products/env.

---

## §2 — MASTER BUG LEDGER

Severity: **BLOCK** (flow halts) / **MAJOR** (silent fail / wrong data / cost burn) / **MINOR**. Scope: A=code, B=migration/env, C=architectural call. Each row marks which branch's audit found it and current status.

### 2A. OPEN BLOCK / data-loss (atelier `_packets/BUGS.md` "STILL OPEN" + downstream audits)
Source: `atelier-integration:_packets/BUGS.md`, `_packets/BUGS-CHAT-LOOP.md`, `_packets/SPINE/LIVE-STATE-SMOKE.md`.

| ID | Sev | File:line | What breaks | Fix | Status |
|---|---|---|---|---|---|
| **B15** | BLOCK | `app/api/stripe/webhook/route.ts:55-62` + `lib/security/idempotency.ts:16` | **Idempotency fails OPEN when Redis missing** — `firstSeen: true` returned. Stripe retry storm → duplicate analytics + emails. | "make Upstash hard-required for prod, OR enforce status short-circuit on every event-type branch." Upstash WAS later keyed (STATE 05-28: `probable-lemur-138225.upstash.io` set) → partly mitigated, but fail-open logic unchanged. | OPEN (logic); env mitigated |
| **B16** | BLOCK | `lib/anthropic/tools/mark_ready_for_publish.ts:13-32` | **No state-machine check.** Re-fires `peek_marked_ready` regardless of status; re-surfaces paywall on already-published peek. **No precondition assertion** (recipient/vibe/hero/note/≥1 card). | Guard with status enum + preconditions; idempotent no-op if already ready/published. | Wave-2 sub claimed fixed (STATE: "Sub K fixed… verify post-deploy"); `HANDOFF-NEXT-FRAME §3` says "verify with a published peek" — **UNVERIFIED** |
| **B18** | BLOCK | `app/api/posthog/[...path]/route.ts:19-27` | PostHog proxy **strips `x-forwarded-for`, `cf-connecting-ip`, cookies, `referer`** → wrong geo, broken session-recording cookies. Kills ad-attribution data. | Forward those headers; whitelist not blacklist. | OPEN (a `wave1-5-posthog-headers` branch exists — verify merge) |
| **B10** | BLOCK(resid) | `app/api/chat/route.ts:217-233` + `chat.ts` | User-message persist fixed; **mid-stream assistant content STILL lost on error.** Stream error mid-flight → user sees streamed reply, reload loses it. | Persist assistant content from `chatTurn` on the error path; surface persist failures as SSE error events. | PARTIAL |
| **INFRA-1** | BLOCK(biz) | live deploy | **`/build` GET returns 500 on the unauthenticated path** (digest `3377218611`). Anon insert silently fails or redirect target crashes. Anon onboarding funnel is unreachable. | Fix anon-peek insert / redirect guard; add `/build` to proxy public routes or gate to sign-in cleanly. | OPEN (`LIVE-STATE-SMOKE` 🔴; "Anonymous /build 500" listed as in-flight in STATE) |
| **INFRA-2** | BLOCK(biz) | `app/g/[slug]/page.tsx` | **`/g/[slug]` recipient view 500**, digest `3668081153`, `recipient_segment_error`. "The cinematic reveal is the gift moment; without it the product can't ship." | Dedicated fix sub (named the "next blocker" in HANDOFF). | OPEN — `HANDOFF-NEXT-FRAME §3` "NOT fixed in this deploy… This is the next blocker." |
| **C01** | BLOCK | `app/api/chat/route.ts:385-393` + `chat.ts:165-211` | Aborted-mid-turn leaves dangling `user` message → next replay sends consecutive user roles → **Anthropic 400**. | History-load drops trailing dangling user row. | **FIXED** (`BUGS-CHAT-LOOP`) |
| **C02** | BLOCK | `chat.ts:295-302` | `JSON.stringify(toolOutput)` outside try/catch → circular ref throws → whole turn dies, no recovery. | `safeStringifyToolOutput`. | **FIXED** |
| **C11** | BLOCK | `chat.ts:213-304` | Abort after assistant `tool_use` pushed but before `tool_result` follow-up → dangling tool_use → **Anthropic 400** on replay. | Synthesize `is_error` tool_results for undispatched calls. | **FIXED** |

### 2B. OPEN MAJOR (atelier BUGS.md "STILL OPEN" — MAJOR)
| ID | File:line | What breaks | Status |
|---|---|---|---|
| M08 | `chat.ts:49` + chat route | Client-supplied `model` accepted `z.string().min(1)`, passed straight to Anthropic. **No allowlist → cost exfil + arbitrary model.** | **FIXED as W04** in commit `17cd407` (Sonnet default restored); allowlist still recommended |
| M22 | Netlify env | Upstash not set → rate-limit + idempotency fall OPEN. | **FIXED** (Upstash keyed 05-28) |
| M03 | `share/send/route.tsx:24-32` | `destination: z.string().min(3)` flat → SMS/email get garbage. | OPEN |
| M04 | `share/send/route.tsx:64-70` | `share_initiated` fires both server+client for SMS/email → double-counted. | OPEN |
| M10 | `chat/route.ts:218-220` | Multi-tool turn persists N assistant rows → recipient sees N split bubbles on reload. | OPEN |
| M11 | `lib/inngest/client.ts` + `nudge-relationships.ts` | Every Inngest send in `try{}catch{}` that only logs → real failures silent. | OPEN |
| M13 | `lib/scrape/browserbase.ts:108-131` | `POST /v1/sessions/{id}/page` **not a documented Browserbase endpoint** — every call 404s, falls to ZenRows; paying for unused sessions. | OPEN (scope C — needs vendor docs) |
| M14 | `webhooks/skimlinks/route.ts:47` | Skimlinks webhook signature **guessed** → first real revenue webhook likely 401s. | OPEN (scope C — defer until account) |
| M15 | `lib/jobs/webhook-logger.ts:13-17` | **Full Stripe+Clerk payloads (PII: email, billing address) in `webhook_log` plaintext forever.** | OPEN (compliance landmine) |
| M16 | `lib/jobs/scrape-worker.ts:26-37` | Doesn't re-wrap affiliate URL with `peekId:cardId` → click attribution stuck peek-level. | OPEN |
| M20 | `webhooks/clerk/route.ts:67-69` | `user.created` with no primary email → 200 + skips DB write → first `/build` insert FK-violates on `curator_id`. | OPEN |
| M24 | `tools/scrape_url.ts:46-67` | Placeholder card defaults to `position: 0` → collides with existing cards (same family as B13). | OPEN |
| M25 | `tools/reorder_cards.ts:37-46` | N sequential updates, no transaction → mid-flight failure corrupts ordering. | OPEN (a `wave1-5-reorder-atomic` branch exists) |
| INFRA-3 | live anon meter | **Anon compute cap `$0.05/24h` is functionally one turn** ("$0.15 of compute… limit $0.05"). Cripples the whole trial. | OPEN — `CURATOR-FLOW-AUDIT` top fix; **violates Frank's "never set arbitrary caps without usage data"** (MEMORY §0 rule 9) |
| INFRA-4 | `/api/webhooks/skimlinks` | Returns **500 not 400** on missing sig (throws when `SKIMLINKS_WEBHOOK_SECRET` undefined). | OPEN |
| INFRA-5 | `/api/inngest` | Returns **500** — INNGEST keys unset, doesn't degrade gracefully. | OPEN |
| INFRA-6 | mobile anon turn 2 | Raw **Anthropic 400 `tool_use ids were found without tool_result`** dumped verbatim into chat bubble (the B11 family, server-side replay). Then bounces user to /sign-up mid-session. | OPEN per `CURATOR-FLOW-AUDIT` (W08 server-side path) |

### 2C. fal / scrape / image degradation (GROUND-TRUTH §E + §A)
Source: `gallant-planck:_packets/SPINE/GROUND-TRUTH.md`.
- **fal `generate_hero_image` returns `image_url: null`** — "Hero image wiring is suspect." (WIRED-BUT-SUSPECT; 5 `flux/schnell` ledger calls.) → studio-vnext WAKEUP later claims "fal hero-image gen wired into the turn (real image → Supabase-hosted URL; degrades to themed gradient if `FAL_KEY` absent)" — **so this is FIXED on studio-vnext, OPEN on atelier.**
- **Scrape DEGRADED** — "8/11 `scrape_complete` degraded (non-Amazon/Zappos failing). Scrape is the weak link." This is win-condition #1 territory; still the named foundation to harden.
- **Memory-tool path validation burns ~2 tool calls/session; `affiliate_search` stalls the conversation.**
- **Sentry captures nothing** (no DSN keyed).

### 2D. The Wave-2 packet-40/41 bug wave (atelier `_packets/BUGS-WAVE2.md`) — mostly FIXED
| ID | What | Status |
|---|---|---|
| W01 | Missing `extended-cache-ttl-2025-04-11` beta header → 1h cache TTL silently downgrades. | **FIXED** `17cd407` |
| W02 | `max_tokens`(4096) < `thinking.budget_tokens`(8000) → Anthropic 400 every ext-thinking turn. | **FIXED** `17cd407` |
| W03 | `affiliate_search` description tells model to call `web_search_tool_bm25` — **no such tool** → fail-closed every product turn. | **FIXED** `17cd407` |
| W04 | `DEFAULT_MODEL='claude-opus-4-7'` ≠ spine's Sonnet → ~5× cost burn every turn. | **FIXED** `17cd407` |
| W05 | `propose_checkout` description leaks `THISISTHEONE` test coupon next to the prohibition. | **FIXED** `17cd407` |
| W06 | `set_curator_memory.expires_at` stored but never enforced → stale memory leaks for years. | **FIXED** (enforced in KV load loop) |
| W07 | In-memory ext-thinking `Map` keyed by sessionId, never TTL-evicted; multi-instance Netlify → flag set on instance A never consumed on B. | OPEN (MAJOR) |
| W08 | B11-redux incomplete: server `loadChatHistory` still strips `tool_result` rows → Anthropic 400 when client sends `history:[]`. | Followups: "already addressed" at `route.ts:153-162` — **but CURATOR-FLOW-AUDIT shows the 400 still happens live (INFRA-6)** → reopen |
| W09 | Most stubs call `InputSchema.parse` without try/catch → model sees Zod error not structured envelope. | **FIXED** |
| W10 | `rulesPhase`/`imageGenerationPhase`/`voiceMode` declared but never set → 3 conditional skills (~85KB) bundled but **never reachable**. | OPEN — needs packet 43 + heuristics |
| W11 | Upload accepts `audio/*` but chat can't use audio file_ids → half-built. | OPEN — needs packet 43 |
| W12 | `affiliate_search` comment/description/return drift on tool name. | FIXED (anti-followup) |
| W13 | `vibe-direction`+`copy-house-style` always-loaded ~62KB (~15K tokens) every turn → cold-start burn. | OPEN — needs PostHog data first |
| W15 | Memory `create` uses `.upsert` (never errors on exists) but has a dead delete-then-recreate fallback masking the real "at limit" failure. | **FIXED** |
| W16 | `prewarm` builds system prompt with default opts → omits Block 3 → primes a **different cache key** than real turns → prewarm wasted. | OPEN |
| W17/W18 | DB CHECK vs app-layer memory path/size contract drift. | OPEN (scope B, doc) |

### 2E. Chat-loop hardening (atelier `_packets/BUGS-CHAT-LOOP.md`) — C01-C12
FIXED: C01, C02, C03 (anon TOCTOU race → increment-then-check), C05 (ext-thinking flag now keyed `sessionId+turnId`), C06 (network-error friendly-message detection), C07 (24KB tool-output cap), C09 (attachment-guidance leak stripped on reload), C10 (analytics zero-token clobber), C11.
**DOCUMENTED/DEFERRED:** C04 (`loadPeekStateJson` re-runs per inner iteration → up to 10 DB calls/turn), C08 (`active_attached_file_ids` JSONB read-modify-write race — same family as **B13** and the W18 carryover), C12 (multi-tab history divergence — server only reads DB when client sends `history:[]`).

### 2F. The recurring "position race" / idempotency / XSS family (cross-branch theme)
- **Position race (B13):** "`position` read-then-increment; parallel `tool_use` blocks collide silently" (`add_card.ts`, `add_variant_group.ts`). Listed IN-PROGRESS-WAVE1 (branch `wave1-position-race`). Same root recurs as **M24** (scrape placeholder `position:0`) and **C08** (JSONB read-modify-write). **Pattern, not a one-off — any parallel tool_use in one assistant turn breaks read-modify-write.**
- **CSS-URL XSS:** `atelier:BUGS.md` MINOR — "Multiple hero-URL CSS injection sites (`cinematic-reveal`, `hero`, `product-card`, `activity-card`, `aspirational-card`, `gag-card`). Encode-then-inject." A `wave1-5-css-url-escape` branch exists. On the lean/studio line the equivalent surface is **`custom`-block HTML** — see Z3 below.
- **`custom`-block HTML = the product's main injection surface** (lean line): `gallant-planck:MEMORY.md` Z3 — "The ONLY guard is `sanitizeCustomHtml()` (DOMPurify) + `sanitizeCssVars()`. Config intentionally allows inline `style`, `ALLOW_DATA_ATTR:true`, and `<form>`… the entire XSS posture rests on that one function on a public slug. Unit-test them, pin DOMPurify, review any loosening." Also `next.config.mjs` `images.remotePatterns:[{hostname:'**'}]` proxies any https host.

### 2G. Lean/studio-line specific risks (gallant-planck MEMORY Z-addenda)
| ID | Risk | Status |
|---|---|---|
| Z1 | `app/api/peek-studio/route.ts` has **no auth, no rate limit, never calls botGate**; `curatorId` defaults `'anon-curator'`. "Open chat = open wallet" the instant a key deploys. | OPEN — "Wire botGate + per-IP/session cap (or gate behind Clerk) before the first keyed deploy." |
| Z2 | **Clerk fails OPEN, not closed:** `middleware.ts` `if (!hasRealClerkSecret) return NextResponse.next();` — missing/placeholder Clerk key → every route public. Combined with Z1 = fully open *paid* chat. | OPEN — confirm Clerk keys real on Netlify |
| Z4 | `peek-studio/route.ts` is `runtime='nodejs'` + `maxDuration=60`; a 12-hop Opus turn may hit Netlify's hard function wall (atelier moved chat to **Edge** specifically to dodge "the 26s wall", PR #3). | LATENT deploy risk |
| Z7 | **Zero automated tests on bold-feynman** ("the atelier line had 413"). | (gallant-planck/studio-vnext later added `packages/core` 53 tests) |
| Z8 | No observability/cost tracking on the new chat path (`AnalyticsPort` noop; nothing writes `usage_ledger`). "Flies blind on spend + funnel once live." | OPEN |
| Z6 | **Two `contract.ts` files, diverged** — `peek-jumpoff/ir/contract.ts` (old) vs `lib/ir/contract.ts` (authoritative). Fresh chat opening the jumpoff copy reads a stale contract. | OPEN |
| Z10 | Safeword `bananahead` committed in `.env.example:37` + code default — readable by anyone with repo access. | OPEN |

### 2H. The headline live-DB fact (the meta-bug)
Source: `gallant-planck:GROUND-TRUTH.md` §B + `RECON_FINDINGS.md` X3.
> "`picks`=0 and `webhook_log`=0: **the recipient publish→pick→notify loop has never completed end-to-end.**" / "The $12 publish + recipient claim/beg/unlock path has literally **never run end-to-end** (49/49 `draft`, `picks=0`, lifetime spend $4.61)."
Row counts (live, 2026-06-02): peeks 50 · cards 33 · variant_groups 10 · events 372 · chat_messages 380 · usage_ledger 277 · **picks 0** · **webhook_log 0** · curator_memory 0. Creation+chat are real; the loop that is the actual product is unproven.

### 2I. INFRA / revenue clarifications
- **INFRA-1 (revenue path):** `atelier:_packets/SPINE/LEGACY-PAYMODE-INVESTIGATION.md` — "**Real $12 revenue flows through LEGACY peek.gift Vite + Netlify Functions, unconditionally.** vNext has not processed a single $12 charge. The `PAY_MODE=mock` env var on the legacy Netlify project is dead config — flipping it would change nothing." (Stripe search `metadata.product='peek.gift_vnext'` → 0 results; `='peek.gift'` → 31+ results.) Don't flip legacy `PAY_MODE`; the real legacy lever is `VITE_USE_MOCK_API`.
- **Checkout shape correction:** `gallant-planck:MEMORY.md` XV.2 — atelier checkout is "a **CUSTOM Stripe Payment Element, NOT a Checkout Session**" (creates a PaymentIntent, returns `client_secret`, webhook on `payment_intent.succeeded`). **Single-currency USD, NO Adaptive Pricing, NO tax on the publish fee** (tax only on a subscription branch). Coupons are fully custom + complete. The doc explicitly flags this as a place where "I over-trusted a doc over the code" — `backendservices-revised.md`'s "Adaptive Pricing/Tax" claims are aspirational, not built.

---

## §3 — LESSONS / ANTI-PATTERNS / FRANK'S HARD RULES

### 3A. Frank's hard rules — banned phrases & behaviors (atelier HANDOFF §1 + MEMORY §0)
Source: `atelier-integration:_packets/HANDOFF-NEXT-FRAME.md` §1, `_packets/MEMORY.md` §0.
1. **NEVER say:** "you're right", "you are right", "good catch", "great point", "great question", "I apologize", "sorry for the confusion", "my apologies", "absolutely", "of course", "definitely", "I completely understand". "Frank has called this out 6+ times… If he pushes back: verify first, then concede with evidence ('Drifted. Reading X.'), or hold position with evidence. Never capitulate to be agreeable."
2. **NEVER deploy per-fix. BATCH.** "Frank pays per Netlify build and per token he spends reading reports… spawn parallel subs → wait for all → merge → typecheck+build → ONE push." (Exception: a security fix actively burning money.)
3. **NEVER echo secret values.** "the system wipes agents for it." Reference by name only.
4. **NEVER touch legacy `peek.gift` apex or `glacialsips.com`** without explicit confirmation — shared Stripe/Clerk/Supabase accounts.
5. **DON'T MOMMY HIM ABOUT KEYS.** `bold-feynman:WAKEUP.md`: "He is FURIOUS about key hand-wringing; it has wasted enormous time. The keys are ALREADY in the vnext.peek.gift Netlify site env… Never lecture about secrets again."
6. **Don't add backwards-compat shims, dead-code stubs, or commented-out code.** "Delete cleanly… Don't leave `// removed for X` markers."
7. **Don't pad responses.** Terse. "chatting costs ~50× working."
8. **Trust verified state / live docs over training data.** WebFetch `platform.claude.com/docs/...` before claiming an API shape.
9. (MEMORY §0 #9) **Never set arbitrary cost/rate/turn caps without real usage data.** "Any gut-feel number sabotages the funnel silently." (The $0.05 anon cap, INFRA-3, is the live violation of this.)

### 3B. Frank's HARD build principles (the "how to build" doctrine)
Source: `gallant-planck:MEMORY.md` XI.2 (REQUIREMENTS_SPEC §13) + `bold-feynman:WAKEUP.md` + `studio-vnext:WAKEUP.md`.
- **TOP-DOWN PLANNING, ALWAYS** — "his #1 complaint — 'chats won't plan top-down, they frantically do random work in one turn.'" Plan top-down, stage yourself, version.
- **NO SKELETONS** — "a signature ≠ an implementation; audits found 'piles of skeletons that can't be excavated.'" Build for the END STATE, ground-up. No MVP.
- **PROVE, DON'T CLAIM** — "artifact = test/deploy/diff; files found 60% comments / 3200+ junk lines." "Verify before asserting — never claim missing/broken/stubbed without evidence."
- **NO TAILWIND** — runtime theming via CSS custom properties (`--peek-*`). *(atelier used Tailwind v4 — see §4 C2.)*
- **THE GATE** — "fence the model with artifacts, don't rely on persuading it." Every BUILD-BOOK prompt ends in a GATE — "if it can't pass, STOP, don't edit the gate, report and wait" (MEMORY XVI.1).
- **AVOID THE WORD "always"** in instruction docs — "'a disaster… chats prioritize mds/code over your chat.'"
- **KEEP VERSIONING.** Frank loathes base64. Frank does NOT read git.

### 3C. The meta-lesson — the disease and the cure (studio-vnext, hard-won 2026-06-03)
Source: `claude/studio-vnext:WAKEUP.md` "Operating truths."
- **"Don't restart. Don't rebuild the engine. The disease was ~50 non-compounding tries; the cure is one held line + this canon. Each session must *add*, not reset."**
- **"Capture Frank's taste as rejections, not essays — explaining it in prose failed for 2 months (the model softens prose into generic mush). His 'no's are the spec."**
- **"This file is the one source of truth. Keep it current at the end of every session. Anything not reflected here is residue until it is."**

### 3D. Drifts prior frames logged (so you don't repeat them) — atelier HANDOFF §7
- Said "You're right" 6+ times despite the ban.
- Per-fix deploys (cost Frank money) before he pushed back.
- **Reading old docs and rebuilding things that already existed** — "opened `AUDIT.md` + `ORCHESTRATOR-NOTES.md` + old HANDOFFs and re-built things that already existed." → see §5 DO-NOT-RELOAD.
- Padded inventory with speculative integrations (Google Places, Booking.com, Expedia, Apple Music, Mapbox, Canva, Pinterest) → moved to `IDEAS-LATER.md`.
- Asked Frank to do things doable via MCP/Bash.
- Told Frank "you can look at the site" — he can't always; spawn a Playwright sub and analyze the screenshots.

### 3E. Tooling gotchas (hard-won, every recent WAKEUP)
- **`Edit` truncates large files — confirmed.** Use `Write` or bash heredoc for big structural changes. (bold-feynman + PROJECT_SUMMARY)
- **Edits to the same file in one message can race** — prefer one Write.
- **Stop-hook BLOCKS turn-end on uncommitted changes** → `git add -A && commit && push` (only your branch) before ending; WIP-commit while subagents run. ⚠️ *Caveat:* `gallant-planck:RECON_FINDINGS.md` X1 says the committed `.claude/settings.json` has **no Stop hook** ("only `SessionStart`→`bootstrap.sh`… treat the stop-hook lore as unverified") — so this rule may be stale.
- **Subagents share the working tree** → give DISJOINT file ownership; tell them NOT to commit; commit by path. **Worktree-leak quirk:** agents using absolute paths leak files into the parent worktree — `git status` + `git clean -fd` after each sub. (HANDOFF §9 + STATE)
- **Headless screenshots don't paint webfonts** (show fallback fonts); real browsers + deploy load them. Don't chase font screenshots.
- **puppeteer gets pruned when agents `npm install`** → `npm i puppeteer --no-save` (chromium cached).
- **`next.config.mjs` has `ignoreBuildErrors:true` + `eslint.ignoreDuringBuilds:true`** → `next build` won't catch type/lint regressions; only `npm run typecheck` does. "Easy to ship a type break to Netlify." (RECON X2)
- MCP limits: Stripe MCP exposes no Account/Tax/webhook ops (use direct API with `STRIPE_SECRET_KEY`); Supabase MCP `generate_typescript_types` emits only `public` schema; Netlify MCP has no delete-project op (and was "flaky/down" on recent sessions).

---

## §4 — CONTRADICTIONS BETWEEN DOCS (and which side reality favors)

### C0 — THE FRAMEWORK FLIP-FLOP (the biggest one)
Three documented positions, days apart, all Frank-endorsed at their time:
1. **REQUIREMENTS_SPEC §10 / BUILD-BOOK (05-28/29):** Turborepo monorepo + `packages/core` + event-sourcing + tRPC + Drizzle + pgvector + PWA.
2. **DECISIONS.md / DESIGN_BRIEF / bold-feynman (06-01):** lean single Next app, `PeekIR` + `reduceTool` (NOT event-sourced), no monorepo/tRPC/Drizzle. MEMORY **Addendum XIII**: "Frank, directly: 'the latest one is the feynman.'… bold-feynman is the **latest = canonical**."
3. **MEMORY Addendum XVII (06-01, later same day):** "**Frank chose (A) the BUILD-BOOK monorepo**… feynman demoted from 'canonical base' to 'salvage source.'"

**Which reality favors:** (3) — and it's now **built and deployed**. The `packages/core` event-sourced monorepo (`decide/apply` maker-checker, 53 tests) exists on gallant-planck → studio-vnext, which is the live production branch. The lean single-app (feynman) was never deployed. So: **the monorepo won; feynman is salvage**; the "feynman is canonical" claim in `bold-feynman:WAKEUP.md`, `docs/PROJECT_SUMMARY_2026-06-01.md` §8, and MEMORY XIII is **SUPERSEDED.** Note the docs even disagree on which PR is canonical: PROJECT_SUMMARY §8 says "#9 = canonical PR for this branch" but RECON G5/X1 proves "**contradicted by GitHub — PR #9 is `atelier-integration→youthful` (packet 41), not a feynman PR.** The canonical feynman PR is #8."

### C1 — Default model: Sonnet 4.6 vs Opus 4.8
- atelier (HANDOFF §1, MEMORY §0, STATE): "**Default model is Sonnet 4.6.** Opus opt-in per-call." Rationale: ~5× cost + sub-1.5s voice goal (W04 burned cost when it drifted to Opus).
- lean/studio (DECISIONS DQ-9, all three WAKEUPs): "**Opus 4.8** + streaming + prompt-caching" as the resolver.
**Reality:** both can be true on different lines — atelier's *curator chat* defaults Sonnet; the lean line's *resolver* is Opus 4.8 (with "a cheap model behind LLMPort for non-creative ops"). The BUILD-BOOK Ch 2.4 reconciles toward **Sonnet 4.6 default, Opus 4.8 opt-in** (MEMORY XVI.1). studio-vnext is Opus-primary. **Verify the actual `DEFAULT_MODEL` constant on studio-vnext before assuming** — given the COGS-control mandate (§1C), an Opus-default chat is a cost risk.

### C2 — Tailwind vs No-Tailwind
- atelier STATE "Locked decisions": "**Styling: Tailwind v4**". Landing page is "**Pure Tailwind**" (MEMORY XV.3).
- lean/studio (DECISIONS, WAKEUPs, BUILD-BOOK with an "**anti-Tailwind CI check**"): "**No Tailwind (runtime design tokens)**."
**Reality favors No-Tailwind** — it's the newer, design-greenlit, Frank-stated principle (XI.2) and the studio line enforces it. The atelier Tailwind is part of the scrapped-as-product prototype. **Caveat:** if the atelier landing/bookends get lifted (MEMORY XV.4 says they're "trivially liftable"), they bring Tailwind with them — that has to be de-Tailwinded on lift.

### C3 — "never-raw-HTML / IR versioned never HTML" vs DUAL-REPRESENTATION / `custom` HTML
- DESIGN_BRIEF §5 (MEMORY XVI.2): "**IR versioned, never HTML.**" The canonical state is the structured `PeekIR`/`PeekDocument`, never serialized HTML.
- BUT the renderer's primary expressivity lever is the **`custom` section kind = arbitrary model-authored HTML** injected into the page (DECISIONS DQ-3: "wild signature moves stay model-authored `custom`"; the dad-60th sample's ticket-stub is hand-HTML).
**Resolution (not actually a contradiction, but easily misread):** the *document* is never HTML (you persist/version the IR); the *content of a `custom` section* IS HTML, but it's data inside the IR, sanitized at render. The danger (Z3) is treating `custom` HTML as free — it's the main XSS surface and "the entire XSS posture rests on `sanitizeCustomHtml`." So: IR is the source of truth; `custom` HTML is a sanitized leaf, not a parallel representation. Don't build a second HTML-first path.

### C4 — Competing "THIS WINS" authority claims across WAKEUPs
Multiple docs each assert primacy:
- `studio-vnext:WAKEUP.md`: "If any other doc conflicts with this one, **this wins**… gallant-planck + the 80 other branches are OLD residue."
- `atelier:VERIFIED-STATE.md`: "**If anywhere else in SPINE/ or STATE.md conflicts with this file, this file wins.**"
- `atelier:STATE.md` SPINE rule: "if any packet/sub/session contradicts a SPINE doc, the contradiction is wrong… SPINE supersedes legacy `BRAIN-DUMP.md`/`CONCEPT-V2.md`."
- `gallant-planck:GROUND-TRUTH.md`: the classified-evidence ground truth for the atelier line.
**Resolution by recency + Frank's word (CLAUDE.md #1, "his live word outranks any doc"):** **studio-vnext WAKEUP (2026-06-03) is the newest and most authoritative for the product direction + deploy pointer.** For *atelier-line facts* (env vars, live DB, the bug ledger), VERIFIED-STATE + GROUND-TRUTH + BUGS.md remain the best primary evidence — but tag them as the SUPERSEDED-as-product line.

### C5 — "vision docs are dated/ignore" vs "the vision docs ARE the spec"
- bold-feynman PROJECT_SUMMARY §2 + repo commit `23f31a7`: "Repo vision docs are dated… reference, not authority."
- MEMORY **XI.1** explicitly REVERSES this: "**CORRECTION: the `reference/vision/*` docs are the SPEC, not 'stale/ignore'**… The next chat MUST read these as canonical product input. (My error: I followed the repo's 'dated' tag instead of reading them.)"
**Reality favors XI.1** — REQUIREMENTS_SPEC/CONCEPT_BREAKDOWN carry Frank's hard principles + the named-core features (rules engine, vibe-eval gate, affiliate/catalog moat, spending caps, collaboration). Treating them as "dated" is the exact failure mode (under-scoping the product) that XI was written to catch.

### C6 — "deploy builds atelier-integration" vs "deploy builds studio-vnext"
- `gallant-planck:GROUND-TRUTH.md` §D (06-02): "Netlify builds `atelier-integration` → vnext.peek.gift."
- `studio-vnext:WAKEUP.md` (06-03): "`claude/studio-vnext` = Netlify production branch (what deploys)."
**Reality favors studio-vnext** (newer; states the branch was repointed). But the Netlify connector was "flaky/down" on recent sessions — **confirm the live deploy branch + the serving commit directly before relying on either.**

---

## §5 — DO-NOT-RELOAD (these confuse future-you) + reading order
Source: `atelier:_packets/MEMORY.md` §2 + `atelier:HANDOFF-NEXT-FRAME.md` "What NOT to read."
**Stale / will mislead:** `_packets/_archive/*` (AUDIT.md 36k pre-Wave-1 noise; ORCHESTRATOR-NOTES; COMMENTS; integrated-packets 01-35; orch-desktop HANDOFFs), `_packets/CONCEPT-INVENTORY.md` (superseded by VERIFIED-STATE+LIVE-STATE-SMOKE), `_packets/ANTHROPIC-API-CONTEXT.md` (superseded by SPINE/CAPABILITY_INVENTORY), `_packets/SPINE/IDEAS-LATER.md` (Frank-excluded speculation), `peek-jumpoff/engine/{renderer,parts}.js` + `peek-jumpoff/ir/*` (prior-gen reference; emit `--bg/--accent` not `--peek-*`), `peek-jumpoff/reference/engine-parametric-REJECTED/*` (the rejected lookup-table engine), and **jolly-mccarthy's deterministic OKLCH `vibe-resolve`** (= exactly the engine DECISIONS rejected).
**Best primary-evidence reads, in order:** studio-vnext WAKEUP (direction) → gallant-planck GROUND-TRUTH (live service/DB truth) → atelier BUGS.md + BUGS-WAVE2 + BUGS-CHAT-LOOP (bug ledger) → atelier VERIFIED-STATE (env vars) → DECISIONS.md (settled calls) → LIVE-STATE-SMOKE + CURATOR-FLOW-AUDIT (what's actually broken live).

---

## §6 — ANTI-FINDINGS (claims that turned out NOT to be bugs — don't re-dispatch)
Source: `atelier:BUGS.md` + `BUGS-WAVE2.md` ANTI-FINDINGS, `gallant-planck:RECON_FINDINGS.md` X1.
- `proxy.ts` IS the Next 16 middleware convention (deploy proves it).
- `@clerk/nextjs/legacy`, Inngest 4.4 `eventType/staticSchema/cron`, `events.kind` free-form text — all fine; prior panics were wrong.
- `signRecipient()` fail-open is GONE (packet 31 made it throw). Stripe `constructEvent` + Svix Clerk verification are canonical. `prefers-reduced-motion` respected. RLS migrations 0005+0006 applied (service-role bypasses).
- M17 (dynamic-import hack in `generate_hero_image`) was STALE — already a static import.
- Cache breakpoints = exactly 4 (at max, not exceeding). Memory tool's URL-encoded traversal block (`%2e/%2f/%5c`) correctly defeats `../`.
- (RECON) "Chat runs Opus 4.8" true in code, **false in practice** on feynman (never deployed, runs stub keyless). "Milestone 0 DONE" = on stubs only. There is **no `SPEC.md`** despite CLAUDE.md citing it. `SHELL_SPEC.md`'s "contract missing gallery/countdown/claim" note is stale (the final `lib/ir/contract.ts` has them).
- **Schema gap to flag (RECON X1):** live `peek_status` enum includes `ready_for_publish`, but the IR's `PeekStatus` = `draft|published|claimed|archived` (no `ready_for_publish`) even though a `mark_ready` tool exists; IR also doesn't model the DB's `affiliate_*` card fields. The IR↔DB migration that closes this is unwritten.

---

## §7 — TOP CARRY-FORWARD PRIORITIES (synthesized; what prior sessions said matters most)
1. **Harden the CardResolver cascade** (win-condition #1; scrape is DEGRADED, fal was null) — "everything sits on it" (studio-vnext).
2. **Build the concept-gate + reject loop** (win-condition #2; "generic is the only failure").
3. **Gate `/api/peek-studio` before any keyed deploy** (Z1/Z2 — open chat = open wallet; Clerk fails open).
4. **Fix the two live BLOCKs:** `/build` anon 500 (INFRA-1) and `/g/[slug]` 500 (INFRA-2) — the recipient reveal is the gift moment, currently dark.
5. **Complete the publish→pick→notify loop** — it has NEVER run end-to-end (picks=0, webhook_log=0).
6. **B16** mark-ready state-machine + preconditions (revenue bug; verify the Wave-2 fix landed).
7. **B15** Stripe idempotency fail-open + the position-race/JSONB-CAS family (B13/M24/C08) before ad-driven traffic.
8. **Raise the $0.05 anon cap** (INFRA-3) and **humanize raw chat error envelopes** (INFRA-6) — the trial is currently hostile.

---

_End. Sources mined: DECISIONS.md / WAKEUP.md / PLAN.md / docs/PROJECT_SUMMARY_2026-06-01.md (×3 branches) · _packets/{BUGS,BUGS-WAVE2,BUGS-WAVE2-FOLLOWUPS,BUGS-CHAT-LOOP,STATE,MEMORY,HANDOFF-NEXT-FRAME}.md · _packets/SPINE/{GROUND-TRUTH,PROGRESS,VERIFIED-STATE,LIVE-STATE-SMOKE,CURATOR-FLOW-AUDIT-2026-05-28,LEGACY-PAYMODE-INVESTIGATION,FRANK-TODO}.md · RECON_FINDINGS.md (incl. its embedded DECISIONS/DESIGN_QUESTIONS verbatim + Addenda I–XVII)._
