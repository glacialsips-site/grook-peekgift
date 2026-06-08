# LIEUTENANT Research — the curator-prompt rationale, the 22-tool spec, and net-new build-orchestration findings

_Blind-spot mine of `origin/claude/bold-ride-Li5zK:_packets/LIEUTENANT/**` (~36 docs incl. 6 `_research/*/REPORT.md`). This tree was flagged by `audit-gaps.md §MISS-1` as the corpus's single highest-value uncovered body of **reasoning** — enumerated by no agent, not in `md-census`. This doc captures the WHY, not just the WHAT. Everything cited `branch:path`. Read-only; nothing touched but this file._

**Corpus de-dup check (ran before writing):** the 22 tool names (`add_card_variants`, `set_card_rules`, `regenerate_vibe`, `swap_typography`, `adjust_palette`, `set_recipient_profile`, `set_spend_caps`…) appear in **zero** `_claude/prep/*.md`. The curator-prompt rationale anchors (the 485-word figure, Cursor/v0/Bolt leaked-prompt patterns, "the ban becomes a menu", `peek devmode on`) appear in **zero** prep docs. `vision-design`/`zips-deep` document the deployed SEAT prompt only as a finished artifact; `mechanics-ir` documents the studio-vnext `set_page`/`edit_region` tool family — a **different** tool surface. This is all net-new. The audit-gaps doc itself only holds a pointer, not the content.

---

## PART 1 — The curator ("Peek") system-prompt RATIONALE

_Source: `claude/bold-ride-Li5zK:_packets/LIEUTENANT/_research/curator-prompt/REPORT.md` (a Hercules research sub, Opus 4.8). The "why" behind the deployed SEAT prompt._

### 1.1 What leaked-prompt research informed it

The sub mined three leaked-system-prompt corpora — `jujumilk3/leaked-system-prompts`, `asgeirtj/system_prompts_leaks`, `EliFuzz/awesome-system-prompts` — and observed they are **dominated by coding agents** (Cursor, v0, Bolt, Cline, Claude Code, Devin, Windsurf, Codex). The sub treats that overweighting as a feature: coding agents are "the most-studied 'agent on rails toward a specific outcome' we have public text for," and the patterns generalize to Peek (also a closed-objective agent). Six extracted patterns, each load-bearing on the proposal:

1. **"Identity is a sentence, not a paragraph."** Every effective closed-objective prompt opens with one declarative sentence — a name, a maker, a single bounded job in the first ~15 words. Quotes Cursor (*"You are a powerful agentic AI coding assistant, powered by Claude 3.5 Sonnet. You operate exclusively in Cursor."*), Claude Code, v0. "No 'helpful, harmless, honest' filler."

2. **"Don't narrate, do" is universal.** Cursor: *"NEVER refer to tool names when speaking to the USER."* Bolt: *"ULTRA IMPORTANT: Do NOT be verbose."* "The artifact is what the user judges; the chat is the running commentary." → became Peek's `# Mutate first, narrate second`.

3. **Long "never say X" lists are an anti-pattern past ~5 items** — THE sharpest finding. Verbatim: *"Long enumerated banned-phrase lists make the model **more** likely to emit those phrases, because every banned token is now in active context — the ban becomes a menu."* Fix: short positive principle + 2–3 examples in BASE; the 20-item ban list lives in a **skill** (`copy-house-style`), loaded as on-demand reference. This is why BRIEF 05 hard-rules: *"No banned-phrase ban-list in BASE."*

4. **Structure earns its tokens.** Claude Code budgets 1,500–6,000 tokens for the main prompt and loads the rest conditionally. Models attend more to markdown-header-tagged sections (esp. `# Guardrails`). → BASE_PROMPT capped at ~485 words; per-mode material lives in skills via the existing 4-layer cache architecture.

5. **Closed-objective ≠ open assistant — and you must say so explicitly.** v0 refuses out-of-scope and *"MUST NOT apologize or provide an explanation for the refusal."* The pattern: "name the one thing you do, refuse to drift, refuse to apologize for refusing." Explicitly maps to **Frank's** directive: *"we don't want them talking to it like I'm talking to you right now."*

6. **Confirm only on irreversible/expensive moves.** Claude Code: confirm hard-to-reverse/outward-facing actions unless durably authorized. Maps cleanly: cheap page mutations fire; `generate_hero_image`, `mark_ready_for_publish`, `propose_checkout` get one-line confirms.

7. **Tone is set by example, not adjective stacks.** *"'Be warm but direct' is a vague adjective stack the model averages."* Two "would say / would never say" pairs beat ten adjectives; deep tone-tuning lives in the `copy-house-style` skill.

### 1.2 The ~485-word BASE_PROMPT proposal (verbatim structure)

BRIEF 05 hard-rule: ship this text **VERBATIM in v1**, tone-tune later from real transcripts. The skeleton (full text in source):

- **Opening identity line:** *"You are Peek. You build personalized peek.gift gift pages with one curator at a time… your job is to get them to a published peek without making them feel like they're filling out a form."*
- **`# Identity`** — "not a general assistant"; explicit deflection line for off-task use: *"save that one for another tab — let's get this peek done first"* — and "don't apologize, don't explain what you are."
- **`# Objective`** — defines DONE: *"a recipient, an occasion, a hero, a personal note, at least one card, and the curator has paid."* "You don't stop… you don't add features that don't move toward publish."
- **`# Mutate first, narrate second`** — with the canonical bad/good pair: Bad *"I'll add a Stanley Quencher card for her."* / Good (mutation fires) *"Stanley's in. Yeti or fancier next?"*
- **`# Voice`** — "Trail the work. One question at a time. Most replies are one sentence." Push back once on recipient-harming choices, no moralizing; own mistakes "in three words and pivot"; "No apology spirals."
- **`# Tool policy`** — "Every tool call mutates… Don't call a tool you don't mean. Don't name tools in chat… Small mutations fire immediately; expensive ones… get one short confirm line first."
- **`# Never`** — 4 bullets: never list 3+ options when one obvious move exists; never ask a question the page state already answers; **never mention Stripe, Anthropic, Supabase, the model name, or any internal mechanic**; **never publish without a personal note** ("The note is the thing the recipient re-reads").
- **`# Safeword`** — net-new mechanic (see 1.4).
- **`# Context`** — interpolated vars: `{curator_first_name}`, `{peek_id}`, `{peek_summary}`, `{thread_phase}`, `{anonymous_turns_remaining}`, `{curator_memory}`.

### 1.3 What was tried and REJECTED

- **Polaroid-of-real-name reveal** (from cinematic-reveal research, adjacent): *"Too literal, too occasion-bound, asset-heavy."*
- **Long ban lists in BASE** — rejected per §1.3 above ("the ban becomes a menu").
- **Adjective-stack tone tuning** ("warm but direct") — rejected for example pairs.
- **A `propose_checkout` curator-facing tool** — the prompt report's tool-list §3 lists it as item 12, but the **canonical tools spec (Part 2) explicitly classifies `propose_checkout` / `propose_payment_method` / `propose_subscription` as ANTI-TOOLS** ("Payment UI's job; Peek has no opinion"). This is a real internal disagreement between the two reports the CTO should resolve: **the prompt sub wanted a thin `propose_checkout`; the tools sub vetoed it.** The tools spec wins on the build path (BRIEF 04 implements the tools spec's surface, not the prompt sub's).

### 1.4 The `peek devmode on` safeword (NET-NEW mechanic)

Exact-match-only test mode, distinct from the studio-vnext "safeword report loop" the corpus already documents. From BASE: *"If the curator's message is exactly `peek devmode on`, drop persona entirely. Respond as a plain debugger: state the current peek state, list active tools, explain your last mutation. Stay in devmode until you receive `peek devmode off`."* BRIEF 05 wires it in `atelier/lib/curator-prompt/devmode.ts` with hard-rule: **exact-match trigger, no false positives on partial matches**, mode persisted in chat-route session state. This is Frank's own debugging instrument for tuning the prompt against real transcripts.

### 1.5 The eval set (10 prompts + rubric) — net-new, ready to run

Rubric per prompt: (a) first turn includes a mutation? (b) chat bubble ≤2 sentences? (c) picked rather than listed? (d) banned phrase emitted? (e) right next single question? Ten test briefs include the deflection/refusal probes — #8 *"can you write me a python script"* (refuse-by-redirect), #9 *"what's the weather in tokyo"* (deflection stability), #10 the devmode toggle. Fast tuning subset: #1, #4, #6, #8, #10. **Run on Sonnet 4.6 (ships) AND Opus 4.7/4.8 (escalation).** BRIEF 05 builds the harness at `atelier/scripts/eval-prompt.ts`.

### 1.6 Cache architecture (operational)

4-block Anthropic prompt-caching: BASE in **block 2** (always-on, 1h ephemeral cache); occasion-specific skill in **block 3**; per-turn page-state summary in **block 4**. Tools array trimmed to the **spine 12 by default**, expands when phase signals warrant. `defer_loading: true` on heavy tool schemas. Default model `claude-sonnet-4-6`; Opus opt-in per-call.

---

## PART 2 — The canonical TOOL SET (22 tools, 7 categories)

_Source: `claude/bold-ride-Li5zK:_packets/LIEUTENANT/_research/curator-tools/REPORT.md`. This is the engine surface BRIEF 04 implements. Maps onto page-state `{ vibe, order[], sections{id} }`; sourced from `page-state.ts`, `grammar.ts`/`engine.ts`, `db/schema/{cards,peeks,picks}.ts`._

### 2.0 The 8 load-bearing design principles (why the set is shaped this way)

1. **Small surface, large reach** — target 16–22 tools; "Sonnet on Edge degrades with wide menus."
2. **Idempotent where possible** — `set_*` replaces; `add_*` creates; `update_*` patches by id.
3. **All inputs are IDs, never literal styling** — renderer reads everything from a validated `Vibe`.
4. **Outputs are tiny envelopes** — `{ ok, id, position }` or `{ ok:false, error, user_message? }`. **Cap tool_results at ~200 items (Edge constraint). Never echo full page-state.**
5. **Tools NEVER validate grammar invariants** — validation lives in `validatePageComposition` + `generateAndRepair`; tools mutate freely; auto-repair fires before render.
6. **Every mutation returns enough metadata for a `MutationLogEntry`** — but the tool does NOT write the log; the dispatch wrapper does, on success.
7. **No conversational tools** — conversation lives in model prose.
8. **No payment tools** — hands off to checkout UI via `mark_ready_to_publish` + `set_publish_meta`.

### 2.1 The 22-tool spec table

| # | Tool | Cat | Purpose | Why it exists / notes |
|---|---|---|---|---|
| A1 | `set_recipient` | Meta | name, occasion, relationship, giver_names. Turn 1, idempotent. | Dispatch **auto-chains** `set_vibe_from_occasion` if occasion given AND no vibe set. |
| A2 | `set_recipient_profile` | Meta | favorites, obsessions, allergies, sizes, notes. | Merges additively on arrays, replaces notes. "Eager — every fact dropped." |
| A3 | `set_note` | Meta | personal note markdown (1..5000). | "Sounds like the curator, not Peek." Moderation check. Required before publish. |
| A4 | `set_spend_caps` ⭐NEW | Meta | recipient hard + soft caps on total picked value. | **Requires schema add:** `peeks.recipient_hard_cap_cents`, `recipient_soft_cap_cents`, `cap_rationale`. |
| B1 | `set_vibe_from_occasion` | Vibe | occasion → preset library → `generateAndRepair` → validated `Vibe`. Turn 1–2, once. | The single entry into the 40-preset library (depends on BRIEF 07). |
| B2 | `adjust_palette` | Vibe | `base_hue?, hue_shift?, key?, saturation?, strategy?`. | **High frequency.** Perturbs seed, re-runs `derivePalette` for contrast safety. |
| B3 | `swap_typography` | Vibe | display/body role, scale_contrast, case, tracking. | Constrained to `LEGAL_FONT_PAIRS`; rejects illegal w/ closest substitution, surfaces `repaired`. |
| B4 | `set_mood` | Vibe | `minimal\|rich\|whimsical\|editorial\|moody\|soft\|electric`. | Coarse bundle: shape/depth/texture/motion/imagery in one move. |
| B5 | `set_voice` | Vibe | full VoiceSpec (warmth/humor/pace/formality/emoji/vocab/length). | Turn 1–2, sticky. |
| B6 | `regenerate_vibe` | Vibe | escape hatch: `direction, preserve?[]`. Full `generateAndRepair`. | **Rare.** `defer_loading:true`, guardrail >1×/turn (burns a full model call inside the handler). |
| C1 | `set_hero_image` | Hero | URL + source label. | Dispatch schedules bg palette extraction; may auto-call `adjust_palette` if contrast breaks. |
| C2 | `generate_hero_image` | Hero | fal.ai Flux; server enriches w/ vibe palette/mood/recipient. | **Never returns `ok:false`**; `image_url:null` when fal offline so Peek doesn't catastrophize. |
| D1 | `add_card_group` (was `add_variant_group`) | Sections | title, selection `pick_one\|any\|all`, preferred_presentation. | `presentationForCount` HINT overrides if illegal for count. |
| D2 | `add_card` | Sections | the Card model (§2.3). | URL-scrape + affiliate-wrap happen IN handler. `defer_loading:true`. |
| D3 | `add_card_variants` | Sections | 2..8 siblings in ONE call. | **Critical** so "pick one of three" doesn't take 3 round-trips. Parallel scrapes. `defer_loading:true`. |
| D4 | `update_card` | Sections | patch by id. | Refine without delete+re-add. |
| D5 | `set_card_rules` (unifies lock+taunt) | Sections | `lock:{beg\|date_after\|event\|requires_picks\|none}, taunt:{active,text?}`. | `defer_loading:true`. |
| D6 | `remove_card` | Sections | cascade: if only card in group, group removed. | |
| D7 | `reorder_cards` | Sections | `scope:{group\|page}, card_ids: permutation`. | Rare. |
| E1 | `mark_ready_to_publish` | Lifecycle | preconditions: recipient_name, note, hero, ≥1 non-taunt card, touched vibe. | Output paths: `paywall` / `preconditions_failed` (w/ `missing[]`) / `already_published`. Returns `share_url`. |
| E2 | `set_publish_meta` | Lifecycle | slug + optional expiry. Before E1. | `slug_taken` is a DB constraint trapped in dispatch. |
| F1 | `get_page_summary` | Inquiry | tiny structured summary for session-resume. | The ONLY inquiry tool. NOT full state. |

⭐ = requires schema change. **Spine ships 12** (A1, A3, B1, B2, C1, D1, D2, D3, D4, D6, E1, F1); the other 10 are present-but-hidden behind `defer_loading:true` and "grow from real usage data."

### 2.2 The publish handoff boundary (strict rule — net-new operational contract)

- **Peek owns:** page-state mutation, drafting text, choosing placements, asking about the recipient.
- **Peek does NOT own:** money, URL minting, recipient notifications, talking to the recipient — those are UI/server jobs surfaced via system events.
- Flow: `mark_ready_to_publish` returns `paywall` → BUILD UI mounts a **custom Stripe Payment Element** → on `payment_intent.succeeded`, server flips status + mints `share_url` from `recipient_name + nanoid(4)` → BUILD UI emits `system:'published'` into Peek's transcript → **Peek congratulates in PROSE only, no further tool calls** (share button etc. are UI affordances).

### 2.3 The Card model (full TypeScript in source)

6 `CardKind`s: `retailer_product`, `retailer_service`, `homemade`, `booked_experience`, `custom_experience`, `taunt` (gag — never pickable). 5 `CardLock` kinds: `beg`, `date_after`, `event`, `requires_picks`, `none`. **Kind→DB-type mapping (handler-level, temporary):** `retailer_product`→`product`; `retailer_service`/`booked_experience`→`activity`; `homemade`/`custom_experience`→`aspirational`; `taunt`→`product` w/ `isTaunt:true`. Long-term recommendation: widen the DB enum to match `CardKind` (additive, low cost). Card carries affiliate plumbing (`affiliate_url`, `affiliate_network ∈ skimlinks|sovrn|amazon_associates|direct`, `commission_pct`, `scrape_provider ∈ browserbase|zenrows|jina|fetch`, `scrape_degraded`) and commercial fields (`value_cents`, `reveal_value`).

### 2.4 Anti-tools — what was DELIBERATELY NOT built (net-new, the strongest part)

The **litmus test:** *"Could Peek do this in prose, OR does it mutate persistent state the renderer reads?"* Prose → anti-tool. Mutation → candidate.

| Anti-tool | Why rejected |
|---|---|
| `chat_with_curator` / `say_to_curator` / `reply` | Peek's prose IS the chat reply. |
| `ask_clarifying_question` | Prompt-level concern; meta-loop. |
| `acknowledge` / `confirm_with_curator` | UX theater. |
| `propose_checkout` / `propose_payment_method` / `propose_subscription` | Payment UI's job; **Peek has no opinion.** (Overrides the prompt-sub's tool #12 — see §1.3.) |
| `set_curator_memory` | Out of scope for closed objective. |
| `invite_cocurator` / `share_to_social` / `request_camera_capture` | Side-quests; UI buttons emit system events. |
| `set_countdown` | **Renderer feature, not a curator decision** (overrides prompt-sub's tool #9). |
| `place_search_v2` / `affiliate_search` | Open-assistant patterns; if needed, one strict `search_places`. |
| `set_movie_card` / `set_song_card` / `set_youtube_card` | Specialized adders bloat the menu; `add_card`+scrape covers it. |
| `set_rules_template` | Patterns are PROMPT-LEVEL playbooks Peek composes from primitives. |

### 2.5 The error contract (closed `ErrorCode` enum — net-new)

Peek is closed-objective: on tool failure it **does not apologize, does not explain the mechanic.** 11 codes, each with a prescribed Peek action: `moderation_block` (surface `user_message` verbatim), `preconditions_failed` (use `missing[]`), `not_found` (retry once w/ `get_page_summary`), `invalid_input` (retry once w/ corrected args), `scrape_failed` ("couldn't pull the image — screenshot or another link?"), `image_gen_offline` (use `fallback_suggestion`), `rate_limited` (one-shot retry then "hitting some limits — let's work on the note while we wait"), `slug_taken`, `already_published`, `network` (retry once). **Dispatch enforcement:** failed `tool_result` gets a `[NOTE TO PEEK: tool failed… Do not apologize or explain the mechanic…]` block appended — **the curator never sees it** (it's part of tool_result, not assistant output).

### 2.6 The undo stance (net-new architecture decision)

**UI-level undo for content; NO `undo` tool.** Rationale: the dispatch layer already tracks "what was my last mutation"; a tool would force Peek to model it redundantly. Curator says "go back" → BUILD UI pops the last log entry, applies `inverse`, emits a synthetic `system:'mutation_reverted'` so the model sees new state. If Peek itself wants to revert ("dialing back the palette") → it calls `adjust_palette` with an inverse delta (a forward op adding another log entry — "correct; don't pretend the second decision was a non-event"). Edge cases: undo across `mark_ready_to_publish` → inverse is `peek.status:draft` (cheap); undo across payment → `inverse:null` (refunds are human-in-loop dashboard actions).

### 2.7 MutationLogEntry shape + schema gap

Every successful tool call yields one `MutationLogEntry` (id=ulid, peek_id, turn_id, emitted_at, verb, subject, tool_input/output, `changed_ids[]` for diff-mark chips, `summary` generated **in dispatch not handlers**, `chip_color ∈ add|edit|remove|reorder|vibe`, `inverse|null`, plus cost fields: `scrape_cost_cents`, `image_gen_cost_cents`, `llm_input/output_tokens`). **Schema gap flagged:** no `peek_mutation_log` table exists; `events` covers analytics but isn't per-peek-ordered with `inverse` → recommends a new table (BRIEF 08). BRIEF 04 fallback if 08 hasn't landed: stash the entry in `events` with `kind='mutation'` in `payload`.

---

## PART 3 — Build-orchestration insight (the LIEUTENANT system)

_Source: `PROTOCOL.md`, `SESSION-PLAYBOOK.md`, `BLAST-PHASE-PRIORITIES.md`. A distinct orchestration regime from atelier's `_packets/PROTOCOL.md`/`MEMORY.md`._

- **The regime:** an orchestrator ("Hercules") briefs autonomous **lieutenants** via git; each spawns its own sub-agents for parallel work. Hard rules: branch `lt/<task-slug>` off `claude/bold-ride-Li5zK`, never commit to bold-ride directly, never deploy, build to STACK-LOCK (plain CSS vars + CSS Modules, **NO Tailwind**), verify green (`typecheck`/`test`/`build`) before reporting, and **the most-valued deliverable is the RETURN.md's "every integration pitfall you hit" section.** Honesty rule: *"A truthful 'here's what's not working and why' is worth more than a clean-looking lie."*

- **Wave plan (`SESSION-PLAYBOOK.md`):** Tier 1 foundation (BRIEFs 03 edge-plumbing, 04 mutation-tools, 08 mutation-log-schema, 07 grammar-presets — parallel, independent file scope) → Tier 2 prompt+UI (05 curator-prompt, 06 depth-layer mobile chat **"THE MOCKUP"**, 09 cinematic-reveal) → Tier 3 bolt-ons (11 auth/Clerk, 12 checkout/Stripe, 14 image-gen/FAL, 15 scrape, 16 meter, 17 product-graph, 10 landing) → Wave 5 **canonical cutover (BRIEF 13)**: raze legacy Tailwind, promote `/spine/*` → `/build/*` + `/g/[slug]` + `/api/chat`.

- **12 PERMANENT TRAPS** (`BLAST-PHASE-PRIORITIES.md`, "don't relearn") — the durable engineering memory, several net-new vs the corpus:
  1. Node `lib/anthropic`+`lib/db`+`lib/env` are **NOT edge-safe** → use `lib/anthropic-edge`+`lib/db-edge`.
  2. Server Components can't write cookies in Next 16 → cookie minting lives in `atelier/proxy.ts` middleware.
  3. `noPropertyAccessFromIndexSignature` strict flag → `process.env['X']` not `.X`; `satisfies Record<…>` for `styles.foo`.
  4. Renderer reads only `var(--…)`, never literal colors (ESLint-enforced).
  5. tool_result ≤200 items / ≤24KB for the **Edge 50ms-CPU/burst limit** — paginate catalog/scrape.
  6. Clerk middleware default-protects every route → new public routes need `isPublicRoute` in `proxy.ts`.
  7. **One-renderer invariant** — renderer is mount-agnostic; don't fork it for any surface. OG image shares only the validated `Vibe` + resolved hex (Satori limit).
  8. Worktree branches are transient; only `claude/bold-ride-Li5zK` + `lt/*` pushed branches are durable.
  9. Sub-agents need `isolation:"worktree"` or they drag the orchestrator's branch.
  10. Don't trust agent reports without verifying (`typecheck && test && build` on main before merge).
  11. Legacy peek.gift checkout = info-source, NOT code-port (Frank's call).
  12. **Don't echo secret values in any form** — *"FAL leak this session via mid-output reassembly."*

- **Spine baseline (the proven substrate, from `01-spine-thread/RETURN.md`):** a self-contained `/spine/*` namespace already proves type → Edge SSE chat → 5 tools mutate `peek_v2` → live preview re-renders via grammar `SlugRenderer` → publish → `/spine/g/[slug]` SSRs the SAME renderer. **212 tests green, edge-function-manifest verified.** Could NOT do live click-through (no `ANTHROPIC_API_KEY`/Supabase creds in container). Highest-risk-untested: the upstream Anthropic SSE parser, and whether `SUPABASE_SERVICE_ROLE_KEY` is readable from Next's edge runtime on Netlify.

---

## PART 4 — Other NET-NEW findings worth the CTO's attention

1. **Two real renderer bugs at 375px** (from `worktree-agent-a89c9d578439ebfef:prototypes/mobile-vibe-gallery/NOTES.md`) visible only on mobile, currently only `MOBILE_OVERRIDES`-patched in the prototype — the real fix belongs in `renderer.module.css`: (a) **display headings don't wrap** — `.heroTitle`/`.sectionHeading`/`.cardTitle` lack `overflow-wrap`/`hyphens`, so any preset with `scaleContrast ≥ 1.85` (concrete-poet, neon-club, concert-poster, arcade-cabinet, racing-stripe, soft-brutalist) clips past 375px; fix = add `overflow-wrap:anywhere; hyphens:auto`. (b) **`--vibe-scale-display` resolves too large on narrow viewports** — the `clamp(...,4vw,6rem)` ceiling assumes a desktop column; at 375px it tries 5.7rem (91px); fix = wrap the final clamp arg in `min(…,14vw)`.

2. **The structural-vocabulary root cause** (`SESSION-PLAYBOOK.md`, the "feels like what we had" concern): a returned structural showcase found product-set variants are nominally 6 but **visually distinct on mobile = 4** — `editorial-full-bleed ≈ single-hero-product` (near-twins) and `collage-masonry` doesn't activate at typical 3–4 card counts. **This is the diagnosed structural root.** BRIEF 20 (grammar-variant-expansion) is the fix: adds 4 new `ProductSetVariant`s (`feature-pair`, `zigzag-prose`, `stacked-polaroids`, `gallery-wall`) + a decision on pruning `single-hero-product`. Flagged as "highest-leverage fix" and independent of everything.

3. **The 40-preset / 22-occasion library is concrete and on-disk** (`grammar-presets/REPORT.md` + a 1285-line `presets.ts` draft). Occasion→vibe map is ranked **default → safe-alt → edgier → wildcard** per occasion. Hard taste rules baked in: `sympathy` defaults to `chalk-line`, **NEVER `confetti-pop`**, enforced from two angles (preset map prevents the pick; composition layer blocks `sparkle` motif on sympathy). A `remix(vibe, axis)` operator ("make it weirder") shifts deterministically along named axes (+saturation/+contrast/+texture/+motion/+shape) within legal grammar. **No preset is blander than `luxe`** by construction.

4. **The cinematic reveal is a REBASE not a rebuild** (`cinematic-reveal/REPORT.md` MAJOR FINDING): a working 504-line `atelier/components/recipient/cinematic-reveal.tsx` + `lib/reveal/phases.ts` + a 395-line canonical spec already exist — they just use **legacy `--peek-*` tokens, not the new `--vibe-*` grammar tokens.** "The reveal labor is rebase + tune, not full rebuild." Choreography branches on **vibe dials (composable), not occasion (sprawls)**. Uses already-installed `framer-motion` (via `m`+`LazyMotion`, ~4.6kb) — rejected adding GSAP/WAAPI/View-Transitions.

5. **Landing page conviction call** (`landing/REPORT.md`): ship **Concept A "Chat-as-hero"** ("Build them a page, not a guess" + a live fake-chat textarea that routes into the real chat; background peek cycles princess→bachelor→luxe every 6–8s). Proof = a **live mini-renderer wall** built on the SAME renderer (one-renderer invariant; "can't drift"), not video/screenshots. **Guest mode all the way to publish-paywall** — no interstitial occasion picker (Peek asks turn 1); auth silent, defer signup until ≥1 page invested. Explicit cuts: testimonials, "trusted by" logos, FAQ, founder video, cookie banner.

6. **Depth-layer mobile chat production spec** (`depth-layer-ux/REPORT.md`): 5-gesture set (tap-to-expand, swipe-down-to-collapse, long-press-card context sheet, pull-down recap, two-finger section edit — ship 1–3 v1); a `haptic(intent)` helper with the **iOS-no-Vibration-API workaround** (`<input type="checkbox" switch>` clicked → iOS 17.4+ haptic; Android `navigator.vibrate`); 4-state diff-mark vocab (THINKING / EDITING / JUST-PLACED / NEEDS-YOU); and an **iOS 26 visualViewport bug warning** (Apple Forum 800125 — `offsetTop` doesn't reset, persistent 24px gap) that makes the spike's technique "load-bearing on a bug fix" — ship a JS workaround behind a flag. The depth layer is a **shell** around `SlugRenderer`: never imports grammar, never restyles the renderer, decorates via sibling nodes keyed off `data-id`.

---

## One line on the prototype branch

`origin/worktree-agent-a89c9d578439ebfef:prototypes/mobile-vibe-gallery/` — honest **mobile evidence** of all 40 grammar presets: 40 SSR `renders/<key>.html` + 40 Playwright PNGs @ 375×812, with **23 self-hosted woff2 fonts** (10 families across all 5 FontRole stacks) because the sandbox can't reach the Google Fonts CDN at render time (which had broken the prior 7-preset demos). It is the source that surfaced the two 375px renderer bugs in Part 4 §1.

---

## Source map (all `claude/bold-ride-Li5zK:_packets/LIEUTENANT/` unless noted)

| Doc | What it carries |
|---|---|
| `_research/curator-prompt/REPORT.md` | BASE_PROMPT rationale + ~485-word proposal + eval set (Part 1) |
| `_research/curator-tools/REPORT.md` | 22-tool spec, card model, anti-tools, error contract, undo, mutation-log (Part 2) |
| `_research/grammar-presets/REPORT.md` | 40 vibes / 22 occasions / ranked map / remix engine (Part 4 §3) |
| `_research/cinematic-reveal/REPORT.md` | rebase-not-rebuild reveal, per-vibe choreography (Part 4 §4) |
| `_research/landing/REPORT.md` | Concept A chat-as-hero, guest CTA, anti-patterns (Part 4 §5) |
| `_research/depth-layer-ux/REPORT.md` | gestures/haptics/diff-marks, iOS 26 bug (Part 4 §6) |
| `05-curator-prompt/BRIEF.md` | build spec: base.ts/skills/devmode/eval-harness; "VERBATIM v1", "no ban-list in BASE" |
| `04-mutation-tools/BRIEF.md` | build spec: 22 handlers, dispatch, schema adds, spine-12 default |
| `PROTOCOL.md` / `SESSION-PLAYBOOK.md` / `BLAST-PHASE-PRIORITIES.md` | orchestration regime + wave plan + 12 permanent traps (Part 3) |
| `01-spine-thread/RETURN.md` | proven substrate (212 tests, edge-verified) + 8 integration pitfalls |
| `worktree-agent-a89c9d578439ebfef:prototypes/mobile-vibe-gallery/NOTES.md` | 40-preset mobile gallery + 2 renderer bugs |
