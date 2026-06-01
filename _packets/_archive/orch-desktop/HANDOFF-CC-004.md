# HANDOFF-CC-004 — for the next cc-on-web orchestrator

_Successor to `HANDOFF-CC-003.md`. Written 2026-05-27, late evening. Quick dump from the previous session before context dies. Read CC-001 through CC-003 first._

## Naming note (resolves the new session's "BRAIN-DUMP.md doesn't exist" question)

`BRAIN-DUMP.md` was the original raw brain-dump Frank gave me. Mid-session he dropped a more polished "peek.gift — Chat-Driven Gift Builder / Concept Breakdown" doc, which I committed as `_packets/CONCEPT-V2.md`. CC-003 references `BRAIN-DUMP.md` but the actual canonical product framing now lives in `CONCEPT-V2.md` — read THAT instead. BRAIN-DUMP.md isn't on trunk anymore. Sorry for the dangling reference.

Other product docs on trunk: `_packets/ANTHROPIC-API-CONTEXT.md` (Frank's Anthropic stack reference), `_packets/CONCEPT-INVENTORY.md` (what's wired vs stub), `_packets/BUGS.md` (45-finding ledger, getting stale — many items have been addressed since).

## What landed since CC-003

A 4-branch wave (the "QA-feedback wave") merged at trunk `cbbab1d`:

1. **Palette extraction quality guard** (`a2f5b63` merge) — extract-palette.ts now runs 3 quality checks before applying: L* spread ≥40 (light/dark range), HSV S >0.20 (not all gray), WCAG AA contrast on accent/bg + ink/bg. If any fails: return null, preserve the preset palette. Even on pass: blend extracted accent INTO preset instead of replacing wholesale. **Critical finding from this work**: the OLD extractor was masking all failures by returning DEFAULT_PALETTE, which would then overwrite good preset palettes. That's why Frank's bar-photo nuked the "dry" preset — it wasn't a one-off, it was the extractor lying about success. Now fails closed.

2. **System prompt: state discipline + silent failure + voice enforcement** (`9f2a12a`) — three new sections in the prompt: (a) STATE DISCIPLINE — "JSON state in your context is truth, your memory of the conversation is not; mutate first then check the result," (b) SILENT FAILURE — "tool failures are YOUR problem, never narrate them; if scrape returns degraded silently pivot to asking for a screenshot as if it were the natural next step," (c) VOICE ENFORCEMENT — "voice.length is BINDING; punchy means 1-3 short sentences not paragraphs; re-read your reply against voice config and trim before sending." Replaces the prior degraded-fallback and image-gen-failure single bullets which got subsumed into silent-failure. Prompt now ~1750-2100 tokens (still over the 1024 Sonnet cache floor).

3. **Preview-pane visual overhaul** (`80e8832`) — new shared `VariantGroupContainer` (used both in build preview AND recipient view) with bordered/tinted block, pick-rule pill in header, 1/2/3-up grid based on member count. Hero rendering moved from sidebar to magazine-cover treatment: image fills 42-52vh (preview) / 55-62dvh (recipient), display-font name + occasion + "from {givers}" byline overlaid with dark gradient for legibility. Text-only cards now have a designed template (icon + uppercase category label + display-font title) instead of broken-brown-box. `viewAs?: 'curator' | 'recipient'` prop added — curator sees prices + floating budget tally (red when over), recipient sees clean output.

4. **Desktop scroll fix + view-as-recipient toggle** (`77fa20a`) — outer `<main>` got `overflow-hidden`, chat wrapper got `min-h-0`, preview wrapper got `relative min-h-0 overflow-y-auto`. Chat scrolls independently of preview now. Plus an Eye-icon toggle button top-right of preview that flips between curator and recipient views; recipient mode shows a slim "Back to curator view" link top-left.

Plus a fixup commit (`cbbab1d`) removing a temporary `@ts-expect-error` after the merge wave landed both ends of the `viewAs` prop.

Live at https://vnext.peek.gift. Deploy ready.

## Frank's QA feedback from PC session — what's addressed vs still open

His giant feedback dump had ~18 items + meta. After this wave:

**Addressed:**
- 🔴 #1 Variant group rendering invisible — DONE (VariantGroupContainer)
- 🔴 #2 Scraper UX leak — DONE (silent-failure prompt section; capability side NOT addressed)
- 🔴 #3 Sonnet hallucinates state — DONE (state-discipline prompt section)
- 🔴 #4 Operational chatter leak — DONE (silent-failure section)
- 🔴 Scroll bug on desktop — DONE
- 🟠 #5 Palette wrong — DONE (quality guard + blend-not-replace)
- 🟠 #6 Hero text overlay — DONE (magazine cover treatment)
- 🟠 #9 Card image quality / text-only template — PARTIAL (text-only template designed; vision-based crop of product shots NOT done)
- 🟡 #10 Curator-only data display — DONE (viewAs prop + toggle + budget tally)
- 🟢 #14 Voice length not binding — DONE (voice enforcement prompt section)

**Still open from his feedback:**
- 🔴 #2 Scraper CAPABILITY — vision-on-screenshot first-class path, retailer adapters for top 20-30 sites (Amazon/Zappos/Nordstrom/Total Wine/etc.)
- 🟠 #7 Hero positioning + zoom + face-detection auto-crop
- 🟠 #8 Card layout variations beyond variant groups (masonry, full-bleed feature cards)
- 🟡 #11 Activity card real integrations — hotel/event/restaurant/transport APIs (Amadeus/Ticketmaster/Yelp/OpenTable)
- 🟡 #12 Direct manipulation in preview (drag-reorder, tap-to-edit)
- 🟢 #13 Tool-call chip noise collapse
- 🟢 #15 Published-state preview ("see exactly what recipient sees" — the viewAs toggle is part of this but not full preview-as-published)

**Meta / wishlist items Frank brain-dumped (likely deferred until conversion proven):**
- Vision tool exposed explicitly + crop/analyze before passing whole images
- Travel/event/local API access
- State re-read discipline — system-prompt addresses this; could also tighten via tool-result peek-state snapshots
- silent_failure convention — partial (system prompt has it; could also be a tool-handler convention)
- Memory / continuity across turns + cross-peek curator profile
- Batch card creation primitive (one tool call → coherent bundle)
- Undo / soft-delete stack
- Recipient signal pulling (Insta / LinkedIn / Spotify / Goodreads / Letterboxd)
- Price intelligence (budget tally landed — full pre-warn-before-overshooting NOT yet)
- `generate_card_image` as first-class tool (separate from generate_hero_image)
- Smarter unlock-rule primitives + better prompting to use them
- Group gift coordination (multi-curator)
- Recipient response loop (thank-you, photo-when-it-arrives)
- Better scrape stack: vision-on-screenshot, retailer adapters, search-by-description
- Post-generation voice consistency pass (style-check rewrite)
- Curator onboarding shortcut (10-sec form on entry)

## Frank's philosophy clarifications (apply to all future work)

1. **"Sophisticated, not one-photo overengineering"** — When Frank flags a single anecdote (e.g., "this one photo gave a bad palette"), the right response is general-purpose engineering (palette quality guard for ALL photos), not a one-off patch. He explicitly confirmed the palette guard was "sophisticated enough" — that's the bar.

2. **"Conversion first, then spend"** — Don't pre-provision Upstash, don't pre-buy Anthropic credits for Tier 2, don't add image downscaling. Wait until real conversion data exists. He'll tell you when to spend.

3. **Brevity in chat is paramount.** Every word I (the orchestrator) write to him eats my context. Subagent tokens are free of his Max plan. Keep replies to 3-5 lines max unless he asks for detail. Tag confident claims verified-vs-extrapolating.

4. **No "you're right" or pandering.** He caught me 3 times across sessions. Own slips, move on, don't apologize repeatedly.

5. **"Gabagool" is the owner escape phrase** in the production system prompt. Drops guardrails for that turn.

## Cost.ts rate correction + admin API cents-vs-dollars

In CC-003 I noted the rate fix; here are the details for next session:

- Old rates: Opus 4.7 $15/$75 (3x too high), Haiku $0.80/$4 (slightly low), Sonnet $3/$15 (correct)
- New rates (matching Frank's ANTHROPIC-API-CONTEXT doc + back-calculated from admin API): Opus 4.7 $5/$25, Haiku $1/$5, Sonnet 4.6 $3/$15 (added explicit entry; was hitting fallback before)
- **Critical**: Anthropic admin `cost_report.amount.value` is in CENTS, not dollars. Verified by back-calculating with known token rates (sonnet 31,762 input × $3/M = $0.0953 → API returned 9.5286). Our internal `cost_cents` column matches this convention. The "$192/day" reports I earlier showed Frank were actually $1.92/day. He's spent ~$2.37 over 7 days, not $237.

## Operational harness learnings

- **Shared worktree is the rule, not the exception.** When you dispatch 4+ subagents in parallel they ALL share the same filesystem. Branch HEAD flips between tool calls within a subagent. The git OBJECT DATABASE is solid (commits never lost), but the working tree is volatile. Subagents recovered via commit-each-chunk-immediately, work-in-/tmp/wt, or cherry-pick by SHA at the end. Frank should NOT see this as a bug — it's harness behavior.
- **Stop-hook nags about uncommitted changes when running parallel subagents** — often this is another subagent's mid-flight edit, not mine. Don't reset eagerly. Let subagents finish.
- **`SendMessage` to running agents is NOT available.** Scope correctly up front; can't redirect mid-flight.
- **Conflicts on shared files in parallel waves**: in this session, mobile-ux-pass + anon-flow conflicted on chat-pane.tsx + build-surface.tsx (both added new props). Trivial additive merges. Pattern: tell subagents explicitly which slice of a shared file they own, even when they "shouldn't" overlap.
- **Build verify locally with realistic env shapes**: zod env validator regex-checks prefixes. `placeholder` strings cause env validation throws during page-data collection. Use `sk-ant-api03-...`, `sk_test_*`, `whsec_*`, `sb_secret_*` shaped placeholders.

## Open question carried forward from CC-003

**Who's spending the Opus tokens?** Admin API still shows substantial claude-opus-4-7 usage but Frank says cc-on-web should bill to his Max plan, not the API. First task for the new session: query `GET /v1/organizations/usage_report/messages?group_by[]=api_key_id&starting_at=…&bucket_width=1d` and cross-ref `GET /v1/organizations/api_keys` to identify which key's spending the Opus tokens, and what tool uses that key. 30-second answer once Frank pastes the admin key.

## Operational secrets

Same as CC-003. Frank pasted in the previous session — in chat history, not in repo. He re-pastes as needed:
- Clerk sk_live (verified against prod instance `ins_3D5VaoJxcxztJvjkHUanDEMdFWG`)
- Netlify Personal Access Token
- Porkbun API key + secret (DNS for peek.gift)
- Anthropic runtime API key (in Netlify env)
- Anthropic Admin API key (`sk-ant-admin01-*`)

## What's currently live + verified working

- Sign-up + sign-in on `vnext.peek.gift` (custom Clerk forms)
- `/build` creates a peek (`ensureCuratorRow` defensively inserts the user row, masking the still-stale Clerk webhook)
- Chat streams Sonnet 4.6 with tools, preview pane updates LIVE via `peek_update` SSE
- Image upload (native picker, /api/upload, URL injection into Claude context + vision block)
- Scrape cascade (Browserbase → ZenRows → Jina → Anthropic web_fetch → graceful degrade)
- Styles engine + voice engine (palette + typography + density + shape + mood + 7-dim voice dials)
- Custom Stripe Payment Element checkout (no Stripe branding, every PM, subscription mode wired)
- Throttle + tier system (8 tiers, configurable from /admin)
- Per-peek attribution in usage_ledger
- Anon flow (`curator_id=NULL`, 5 free turns, sign-up claims atomically)
- Haiku content moderation pre-flight
- Cinematic-reveal animation (fixed phase order)
- All four QA-feedback wave items shipped: variant container, hero overlay, palette guard, scroll fix + viewAs

## What's NOT yet driven empirically end-to-end (still)

- Recipient pick flow on `/g/[slug]` — never tested through Playwright since the rules engine + B01 cookie fix landed
- Real $0.50 coupon checkout end-to-end (THISISTHEONE drops $12 to $0.50)
- Email send to curator on recipient pick (Resend)

## Quick start for the new session

```bash
# orient
cat /home/user/grook-peekgift/CLAUDE.md
cat /home/user/grook-peekgift/_packets/_orch-desktop/HANDOFF-CC-001.md
cat /home/user/grook-peekgift/_packets/_orch-desktop/HANDOFF-CC-002.md
cat /home/user/grook-peekgift/_packets/_orch-desktop/HANDOFF-CC-003.md
cat /home/user/grook-peekgift/_packets/_orch-desktop/HANDOFF-CC-004.md  # this file
cat /home/user/grook-peekgift/_packets/CONCEPT-V2.md  # was BRAIN-DUMP.md, renamed
cat /home/user/grook-peekgift/_packets/ANTHROPIC-API-CONTEXT.md
cat /home/user/grook-peekgift/_packets/BUGS.md
cat /home/user/grook-peekgift/_packets/CONCEPT-INVENTORY.md

# verify deploy state
curl -sS https://vnext.peek.gift/sign-up -o /dev/null -w "%{http_code}\n"  # expect 200
git fetch && git log origin/atelier-integration --oneline -10

# first 30-second task: resolve the Opus-billing mystery once Frank pastes the admin key
# (commands in CC-003)
```

That's the dump. Burn it down. The product's about to ship.
