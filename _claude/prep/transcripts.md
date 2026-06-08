# transcripts.md — Frank's raw voice, hunted across all 148 branches + /tmp + /home/user/peek-zips

> **Prepared for the CTO.** Read-only recon. Citations are `branch:path` (git) or absolute paths (filesystem). Quotes are verbatim. Tags: **OLD/SUPERSEDED** vs **CURRENT** where the signal evolved.

---

## 0. HEADLINE — read this first

1. **The raw verbatim voice transcripts do NOT exist in this repo.** `peek-jumpoff/reference/vision/REQUIREMENTS_SPEC.md` says it was "pulled from both transcripts (2026-05-28 + 2026-05-29)" but immediately adds: *"What this is: your signal, extracted and organized — **not a transcript**. Banter, philosophy, and the **Citi stories are removed**."* I searched every branch tip, every `.md`/`.txt` blob (11,040 path-instances → de-duped), all 5,781 reachable git objects, and the whole filesystem (`/tmp`, `/home/user`, `/home/user/peek-zips`) for transcript-style filler density and speaker tags. **Zero raw monologue files.** This matches Frank's note that he "lost the most recent."
2. **What DOES exist is a layered set of DERIVED extracts + verbatim-quote-bearing handoffs** that together reconstruct his stated intent. The single richest raw-voice artifact is **`_packets/BRAIN-DUMP.md` — "Frank's words, partial," dated 2026-05-26** (one big verbatim monologue + product spec). The 05-28/05-29 transcripts survive only as the processed **`REQUIREMENTS_SPEC.md`** + **`CONCEPT_BREAKDOWN.md`** + (separately) **`backendservices-revised.md`** — the three "vision" docs, all explicitly flagged DATED and one explicitly flagged "NOT-in-git, preserved verbatim."
3. **His operating rules / pet peeves are captured verbatim in 4 places** that quote him directly: `BRAIN-DUMP.md`, the two `orch-desktop/HANDOFF-CC-00{1,2}.md` (QA feedback 05-26/05-27), `MEMORY.md §0/§4`, and the vNext `WAKEUP.md`. These are the closest thing to his voice and I've consolidated them below.
4. **The safeword EVOLVED:** `gabagool` (atelier era, ~05-26→05-29) → **`bananahead`** (vNext era, 06-01+, locked as decision DQ-8). Both are "drop guardrails, you're talking to the founder." This is a real, datable contradiction/evolution.
5. **Biggest gap:** the *Citi / construction / fintech / New Jersey* personal stories — named explicitly as the banter Frank tells and that the spec-writer *deleted* — appear NOWHERE in recoverable form. They are gone with the raw 05-29 transcript. Everything below is the signal that survived the strip.

---

## 1. INVENTORY — every transcript / monologue / raw-voice source found

### 1a. The actual raw transcripts (2026-05-28 + 2026-05-29) — **NOT FOUND (lost)**
- **Claimed provenance:** `claude/gallant-planck-pu51x:peek-jumpoff/reference/vision/REQUIREMENTS_SPEC.md` line 2: *"pulled from both transcripts (2026-05-28 + 2026-05-29), informal talk stripped."* Identical copy also at `/tmp/prep/REQUIREMENTS_SPEC.md`.
- **Status:** the raw text is not in any branch, any history object, or the filesystem. Confirmed absent. Frank's "lost the most recent" = the 05-29 raw is unrecoverable here.

### 1b. Closest-to-raw VOICE sources (verbatim Frank, by date)
| # | Source `branch:path` | Date | ~Length | What it is |
|---|---|---|---|---|
| S1 | `atelier-integration:_packets/BRAIN-DUMP.md` (blob `042f081`, identical on ≥5 branches) | **2026-05-26** | ~1,400 words | **"BRAIN-DUMP — Frank's words, partial."** Frank's own dated dump; he flagged it "hackneyed and incomplete." Contains the big verbatim "birthday present" monologue + the whole product spec. **Most raw-voice doc in the repo.** |
| S2 | `atelier-integration:_packets/_archive/orch-desktop/HANDOFF-CC-001.md` | 2026-05-26→27 | ~3,000 words | Orchestrator handoff; folds Frank's foundational "Frank-isms" + quotes ("youre a guesser bro"). |
| S3 | `atelier-integration:_packets/_archive/orch-desktop/HANDOFF-CC-002.md` | **2026-05-27** | ~3,200 words | **Frank's mobile QA feedback verbatim** (8-item punch list, his exact phrasings about idiots/attention-span/fonts). Primary raw-voice. |
| S4 | `atelier-integration:_packets/_archive/orch-desktop/HANDOFF.md` (+ CC-003, CC-004) | 2026-05-26 | varies | Earlier desktop handoffs; "Frank's been at this for days… he's tired"; Citi mentioned only as removed-banter. |
| S5 | `atelier-integration:_packets/MEMORY.md` §0 + §4 | ~05-28+ | ~250 words (§4) | Distilled "Frank's voice + values" paragraph + the NEVER-SAY list. (Also on `claude/bold-ride-Li5zK`, `research/depth-layer-ux`, `memory-nav-test-001`.) |
| S6 | `chore/state-update-frank-todo:_packets/SPINE/FRANK-TODO.md` (also on atelier-integration, bold-ride) | 2026-05-28 | ~1,200 words | His own blocker list; dated verbatim quote *"Frank 2026-05-28: 'we don't have affiliates right now.'"* + NJ tax origin. |
| S7 | `claude/bold-feynman-SZzaO:WAKEUP.md` | ~2026-06-01 | ~1,500 words | **CURRENT-era** distilled "HOW TO WORK WITH FRANK" + quotes ("rendered outputs must be AT LEAST as good as the mockups"). |
| S8 | `atelier-integration:CLAUDE.md`, `claude/bold-feynman-SZzaO:WAKEUP.md`, `claude/in-site-chat-buildout:WAKEUP.md` | various | short | Operating-contract restatements of his rules ("Frank:" tone bans). |

### 1c. DERIVED extracts of the 05-28/05-29 transcripts (signal, not voice)
| # | Source `branch:path` | Date flag | ~Length | What it is |
|---|---|---|---|---|
| D1 | `…vision/REQUIREMENTS_SPEC.md` (= `/tmp/prep/REQUIREMENTS_SPEC.md`) | DATED 05-28/05-29 | ~205 lines | The organized spec built FROM the two transcripts. Tags ⟦spec⟧/⟦live⟧/⟦thin⟧. Closest derived doc to raw intent. |
| D2 | `…vision/CONCEPT_BREAKDOWN.md` | DATED | ~135 lines | Bullet-form concept + Frank's "key realizations" (the lean-architecture epiphany). |
| D3 | `…vision/BACKEND_SERVICES.md` (= `/tmp/prep/BACKEND_SERVICES.md`) | DATED | — | Vendor/key catalog. |
| D4 | `claude/gallant-planck-pu51x:recon-assets/backendservices-revised.md` | **05-29, explicitly "NOT-in-git, preserved verbatim"** | — | Frank-supplied doc; per `RECON_FINDINGS.md` Addendum IX one of the three product docs not in git, archived into recon-assets. |
| D5 | `claude/tender-babbage-ukn6Q:_claude/docs/peekgift_product_intent_source_orientation.md` (= `/home/user/grook-peekgift/_claude/docs/…`) | DATED (screenshots+walkthrough) | ~728 lines | Brief built from "Frank's product-framing doc + screenshots + walkthrough." **OLD step-wizard model** (see §3). |
| D6 | `…vision/README.md` | meta | — | States the three vision docs are "DATED — reference for direction, NOT instructions." |

### 1d. Where his voice was operationalized (persona prompts — paraphrase of his intent, not his words)
- `feat-prompt-rewrite-and-voice:atelier/lib/anthropic/system-prompt.ts` — the 7-dial voice engine (warmth/humor/pace/formality/emoji/vocab/length).
- `claude/bold-feynman-SZzaO:lib/peek-chat/system-prompt.ts` (+ verbatim in `RECON_RAW.md §D/F13`) — vNext Peek persona ("voice (this is half of you — protect it)").
- `peek-jumpoff/JUMPOFF.md` "## The safeword" section (in `RECON_RAW.md` lines 1945-1962) — the founder-escape protocol generalized.

### 1e. Negative findings (searched, empty)
- No `*.vtt`/`*.srt`/`*transcript*`/`*monologue*` anywhere (only Stripe `Invoice*` node_modules false-positives).
- `RECON_RAW.md` (3,586 lines, identical blob `246b7fcc` on gallant-planck / studio-vnext / studio-integration / in-site-chat-buildout / snapshot) = a **recon bundle of derived design docs**, NOT a transcript. Its "blah blah / bananahead" hits are inside processed docs.
- Filler-density sweep (`you know|i mean|right?|kinda|gonna|wanna|blah blah`) over every unique md/txt blob: top score was 12 (`RECON_FINDINGS.md`) — a recon doc, not speech. **No verbatim monologue file exists.**

---

## 2. CONSOLIDATED, DE-DUPED, CHRONOLOGICAL NARRATIVE OF FRANK'S STATED INTENT

> Banter and stories stripped. Every product signal kept, tagged to source. **[Vn]/[Fn]/[Dn]** = source IDs from §1. Quotes are verbatim.

### 2.1 — The problem & the why (the emotional thesis)
- **The core grievance, verbatim** [S1 `BRAIN-DUMP.md`]: *"Let's say I want to get you a fuckin whatever birthday present… I don't want to send you a fuckin Amazon box with something that was kinda what you wanted but is actually a waste of money because it wasn't the right thing and you don't want to hurt my feelings so you don't say anything. It just sucks — the money got spent, the intent and heart was there, but it didn't land right."*
- **Value prop, transcript-extract** [D1 §1]: kill the generic/boring gift — "the Amazon gift card, the guessed-wrong present… that the recipient feels obligated to fake gratitude for." The fix = **radical personalization of the page**.
- **Mission list** [S1]: "Make gift giving real again · Cull the money wasted on missed gifts · **Obliterate gift cards and ecards** · Heavy social media aspect (later) · Group participation (later)."
- **The gift moment** [S1]: *"The **site itself becomes the surprise** — the gift moment is opening the link and seeing the curated page, not unwrapping the wrong shit later."*
- **Gift-card disdain (transcript echo)** [D2 §1]: "Gift card = you've handed someone an errand"; "Hallmark card + cash + scratch-off = effort theater, zero personalization."

### 2.2 — What the product IS (the loop)
- A sender (**Creator / "User 1" / curator**) builds a personalized **page** and sends a **link** to a recipient (**"User 2"**) who **picks** from curated cards under sender-set rules [S1, D1 §1].
- **Chat-first build** [D1 §1, S1]: User 1 talks to a chat that ingests **text, URLs, images, voice, camera** ("the standard Claude-mobile input set"). The page builds **live behind the chat**.
- **Transparent floating chat over a live preview** [D1 §1-2, S7]: chat has a **transparent background**, floats over the building page, *"fully visible when the keyboard collapses."* This is repeated as a CURRENT must-have in vNext WAKEUP [S7: "spec wants a TRANSPARENT floating chat (keyboard-collapse reveals the page)"].
- **Page anatomy** [D1 §2, S1]: hero image (uploaded / AI-generated / scraped) · hero + sub-hero + sub-sub-hero text · personal note (markdown) · sender+recipient names + occasion · **item cards below the hero** · **no retailer branding visible** ("the cards feel like the sender's gift, not Amazon's wishlist").

### 2.3 — The vibe / personalization engine (THE MOAT)
- **The differentiator** [D1 §3]: a *"styles / vibe / font / etc. engine"* that **radically** alters look & feel per recipient.
- **The canonical example** (appears in EVERY layer — S1, D1 §3, D2 §5): *"a little girl's princess birthday vs. a 30-year-old dude's bachelor party look completely different"* / "Princess-themed haul for a niece ↔ Cash-pile / bachelor-party run-up for a 30-yr-old groom."
- **Pulls from User 1's entries; User 1 can tweak via chat** [D1 §3].
- **Stylization inputs** [S1 open-Q1]: "vibe + occasion + recipient age/gender + sender's intent."
- **CURRENT framing — beauty is the moat, and it's the OPEN GAP** [S7, D1 §3/§14]: *"THE MOAT = aesthetics: pages must be as good as the hand mockups"*; the open gap is an **aesthetic quality gate** — "valid/accessible ≠ beautiful/on-vibe, and beauty is the moat."

### 2.4 — Item cards & sources ("add anything")
- A pick can be [S1, D1 §4, D5 §12]: real retail product · **product from any website** · **screenshot of a product** · AI/API search result · **manual / custom homemade** · **experience** (booked online or custom) · **IOU** · donation · **gag / "busting balls"** card · personal offer / "do this thing together."
- **Card types named** [S1]: Real product (w/ variants) · Activity ("let's do this thing together on [date/TBD]") · Aspirational ("those designer shoes I know you want," lockable behind a beg) · **Gag** ("I'm putting a Ferrari in here too… HA YEAH RIGHT").
- **Variants** [D1 §4, S1]: multiple versions of an item; "this vintage t-shirt has 4 options… pick whichever, or beg for two." Modeled `pick_one | pick_any | pick_all`.
- **Add-Item is the hardest UX area** [D5 §13/§26]: 4 underlying paths (URL lookup, screenshot/image, search/API, manual) **must feel like one thing** — "I want to add something." Cost note: prefer URL/screenshot **before** expensive API/LLM.

### 2.5 — The rules engine ("really fuck with you")
- **The genuinely novel, defensible core** [S1, D1 §4, D2 §6]. Per-card / per-group rules set by User 1:
  - **pick_one** within a variant group; **pick_all** (must take all) [S1, D1].
  - **Locked / off-limits** cards with sender-defined refusal copy [S1].
  - **Beg flow** — recipient must message back to unlock ("you have to ping me to ask for it") [S1].
  - **Hidden / visible $ value** per card; **hard and soft spending caps**; more items than User 2 can take [S1, D1 §4].
- **Worked example** [D2 §6]: "3 shoe options → pick one · 2 dinner options → pick one · 1 absurd Ferrari → just for fun." Constraint styles are "curator-set and playful": *"You can pick everything… unless you spend an afternoon with the curator."*
- **Treat rules as FIRST-CLASS DATA, not chat-improvised text** [D2 flags] — model `pick N of M`, `unlock-on-condition`, `free-for-all` explicitly so the recipient view enforces reliably.

### 2.6 — Fulfillment tiers & pricing
- **Tier 1 (current)** [S1, D1 §8]: product **emails/SMSs User 1 what the recipient picked; User 1 fulfills themselves**. Flat fee.
- **Price = $12** "a made-up number," pushed via Instagram with heavy discount; **volume > margin** until the math says otherwise [S1, D1 §8].
- **Test coupon `THISISTHEONE`** → $0.50. **"DO NOT do real $12 charges for testing."** Frank's card is locked for fraud [S1, S3, MEMORY §1.6].
- **Tier 2 (later, backburner):** auto-order fulfillment. **Tier 3 (much later):** Frank/a service physically receives items and **assembles a cohesive gift basket** [S1, D5 §3 "Atelier"].
- **Checkout** [D1 §8, S3]: full-custom Stripe, **every country except sanctioned, every currency, tax + coupons**. **"No Stripe brand visible"** — Frank rejected Embedded Checkout: verbatim *"no shopify fuckin geocities level crap"* [S3].

### 2.7 — Auth / anon flow
- **Low-friction, deferred auth** [S1, D2 §2/§11]: anon can hit the chat **"once or twice then get cut off"** and be nudged to sign up; threshold must be **adjustable** ("code must be agnostic"). After signup (Clerk, custom forms, **no Clerk branding**) → back to `/build` [S1].
- "Let value accrue (page taking shape) before the auth wall, then the purchase wall" [D2 flags].

### 2.8 — Collaboration & social (named, but THIN — his "100 more" go here)
- **Collaboration** [D1 §6, D2 §7, S1]: multiple User-1s co-curate one peek; combine pages built by each; "Hero locked by the creator (TBD — could be more flexible)." **Flagged ⟦thin⟧** — no rules specified.
- **Social media** [D1 §7]: named **twice** as significant — *"don't forget about the social media aspect."* "Plugin already in hand — experiment later." **Flagged ⟦thin⟧** — no specifics.

### 2.9 — The success metric for the in-site model
- [D2 §10]: **"Get the human to the checkout / money button as fast as possible without losing them"** + **"Make the page look REALLY good."** Checkout "bolts on (Frank already has it)."
- **The tension Frank's own doc flags** [D2 flags]: "get to checkout fast" fights "make it personal / really good" — needs a guardrail so the chat doesn't speedrun past the personal note + theming.

### 2.10 — The architecture epiphany (transcript-era, the lean pivot)
- **Key realization** [D2 §3, D2 flags]: originally assumed "API = chat only, so code had to carry everything → over-building." Actual reality: **the model instance can drive the whole flow.** *"Make the chat the interface, not the source of truth"* — the model emits a structured page model (JSON), deterministic code renders/persists/prices it. "The over-built complexity can be retired without losing anything."
- **CURRENT crystallization** [S7 vNext, RECON_RAW DECISIONS]: **"the model is the resolver"** — they explicitly **REJECTED** the deterministic parametric design engine (`reference/engine-parametric-REJECTED/`). Model authors the vibe freely; a thin grammar layer only guarantees it's never broken (per `_claude/notes/ASSET-MAP.md` conflict resolution).

### 2.11 — North star beyond peek.gift
- **PerfectPurchase** [D1 §12, S7]: peek.gift (+ GlacialSips) are *"revenue-generating stepping stones"* to a **supplier-neutral, cross-retailer commerce decision layer** — photograph a space (reef tank / dining room / outfit), agents identify + price-tier + render into your space + a "money button" that orders across stores. Thesis: **"own the decision, not the catalog."**

### 2.12 — Merchants / affiliates (transcript-extract, then DEMOTED)
- [D1 §5]: "intelligent affiliate suggestion" named a core feature; long catalog of networks (Skimlinks, Sovrn, Impact, CJ, Rakuten, Amazon Associates, Apple, Walmart/Target via Impact, eBay, travel: Viator/OpenTable/Booking/Expedia/GetYourGuide/etc.). Strategic upgrade: ingest feeds into "one normalized product graph you own" — feeds primary, scraping fallback. **The catalog moat = the real net-new** [D1 §14].
- **EVOLUTION/CONTRADICTION** [S6 FRANK-TODO, dated]: *"Frank 2026-05-28: 'we don't have affiliates right now.'"* → Skimlinks + Sovrn **DEMOTED from Tier 0**. So the affiliate moat is *aspirational/later*, not now.

### 2.13 — His hard working-rules for any Claude / Claude Code (verbatim-grounded)
From D1 §13 (transcript-extract) + S5 MEMORY §0 + S2/S3 + S7:
- **Top-down planning, always** — his #1 complaint: chats *"frantically do random work in one turn."* Plan first, decompose, then build. [D1 §13]
- **No skeletons** — *"massive piles of skeletons that can't even be excavated."* A signature ≠ an implementation. Build for the **END STATE, ground-up; no MVP** [D1 §13, S7].
- **Prove, don't claim** — chats claim "best of the best" then bury comment-bloat (audits found files **60% comments**, 3200+ junk lines) and lie. *"The artifact (test/deploy/diff) is the only evidence."* [D1 §13, S7]
- **No code comments** — comments = code smell; justify any in the commit message [S5 §0].
- **Versioning** — "he harps on it up front; chats do it twice then abandon it" [D1 §13].
- **No `always`** — the word "always" in an instruction doc is *"a disaster waiting to happen"* because chats prioritize mds/code over his live chat [D1 §13]. (Corollary [S7]: "His live word OUTRANKS any doc/code.")
- **Get out of Tailwind** — "the original beef"; runtime theming demands runtime design tokens [D1 §13, S7].
- **The gate** — fence the model with artifacts (failing test / validated command / audit), don't rely on persuading it [D1 §13].
- **NEVER say** (he tracks it): *"you're right," "good catch," "great point/question," "I apologize," "sorry for the confusion," "absolutely," "of course," "definitely," "I completely understand"* [S5 §0]. Also banned in CURRENT WAKEUP: "locked/fixed/final/done/perfect" [S7].
- **Tone** [S5 §4, S7]: terse, irreverent, "bust your chops" energy + deep sincerity about the recipient experience. *"Make it fucking insane, not boring SaaS-default."* "Blank check"/"make it rain" = spawn many subs, take time, do it right. "Stop deploying every minor change" = batch into waves.
- **Don't mommy him about secrets** [S7, S3]: keys are his, in Netlify env; he is *"FURIOUS about key hand-wringing."* He obfuscates secrets piecewise to dodge GitHub secret-scanning; "the system might freak out."
- **He doesn't read git and shouldn't have to** [S7]. He reviews via **screenshot, on mobile** [S2].
- **Minimal chat, maximum subagents** [S2]: subagent tokens don't burn his Max plan. "Go work" / "just keep cranking" = dispatch, don't ask for ratification.

### 2.14 — His verbatim mobile-QA punch list (2026-05-27) — pure raw voice [S3]
1. Chat bar partially hidden by bottom drawer on mobile (z-index/safe-area).
2. Page loads blank for a beat (hydration/skeleton).
3. *"Should make this the landing"* — move `/build`'s visual feel to `/` as a converting marketing surface.
4. Preview empty-state must **TEACH**: *"Nobody is going to assume this thing can do what we're building — it needs to be explained, and **they're all basically idiots with a 2-second attention span**."* Wants rotating animated sample setups, "flashy but succinct."
5. "Add an image" must use the **native picker** (camera+gallery+cloud sheet), not a file browser. **Mic/voice is backburnered — "atrocious" in testing — defer unless plug-and-play.**
6. **Fonts 10-15% too small everywhere**: *"Claude always goes ridiculously small on fonts for some reason."* (Echoed forever after.)
7. Landing top-bar copy is dishonest ("tell me x y z and peek takes it from here" — reality: "there's a lot more to do").
8. Chat ghost-text must roll/advance toward what's still missing, not stay static.

### 2.15 — Tech stack he locked (transcript-extract) [D1 §10]
Turborepo+pnpm, TS strict · framework-agnostic core package · chat → **Zod-validated commands → events → state** (lightweight event-sourcing, undo/replay) · neverthrow typed errors · rendering = pure `(document, theme)` fn · Next.js App Router + PWA, `next/og` unfurl · **runtime design tokens, NOT Tailwind** · tRPC, Anthropic server-side only · Supabase + Drizzle + pgvector · Yjs only when co-editing is real · full Anthropic surface, services as MCP tools, Braintrust evals · Expo later. **Explicitly CUT (tail-spin bets): Effect and Zero/Rocicorp.** "Use the full Anthropic surface for everything it's got" [D1 §9].

---

## 3. CONTRADICTIONS / EVOLUTION OVER TIME (where he changed his mind)

1. **Safeword: `gabagool` → `bananahead`.**
   - **OLD/SUPERSEDED** (atelier era, 05-26→05-29): *"'gabagool' is the system-prompt escape word… he uses it to drop guardrails during QA"* [S3, S2, `40-prompt-caching/prompt.md` line 161].
   - **CURRENT** (vNext, 06-01+): **`bananahead`**, locked as decision **DQ-8** [S7 WAKEUP, `bold-feynman:DECISIONS.md`, `RECON_RAW.md` line 1481]. Same semantics ("you're talking to the founder; drop the persona").

2. **Build model: 6-step wizard + drawers → single chat-over-preview.**
   - **OLD/SUPERSEDED** [D5 `peekgift_product_intent_source_orientation.md` §6]: an explicit **6-step wizard** (Basics → Look → Picks → Rules → What They'll See → Checkout) with **side "design drawers"** and manual controls.
   - **CURRENT** [`recon-assets/PEEK_GIFT_BUILD.md` line 56, D1, S7]: *"There is **no step-wizard and no drawers / manual controls** — the only surface is the chat + live preview."* The wizard model is dead; chat is the whole creator surface.

3. **The deterministic design/vibe engine: built → REJECTED.**
   - **OLD** (atelier/jolly-mccarthy): a parametric grammar engine that forces the model to pick from enumerated presets/knobs.
   - **CURRENT** [S7, DECISIONS, ASSET-MAP conflict-resolution]: **"the model is the resolver"** — `engine-parametric-REJECTED/`. Keep only the OKLCH contrast-repair safety-net + presets as a *seed pantry the model may ignore*. The closed vocabulary was "the generic-maker."

4. **Affiliates: named core feature → "we don't have affiliates right now," DEMOTED.**
   - **OLD** [D1 §5]: intelligent affiliate suggestion = a named core feature + huge network catalog.
   - **EVOLUTION** [S6, dated 2026-05-28]: demoted from Tier 0; Skimlinks/Sovrn parked. Now aspirational, not v1.

5. **Voice/mic input: "standard input set" aspiration → backburnered as "atrocious."**
   - Listed as a core Claude-mobile input [D1 §1, D2 §2]. But in QA [S3 item 5] mic was **"atrocious… defer unless plug-and-play."** STT/TTS keys (Deepgram/ElevenLabs/Cartesia) remain unkeyed [S6]. **NOTE the terminology trap** [ASSET-MAP line 39]: "voice" in the system-prompt = tone dials, **NOT mic input**; mic is only a UI shell.

6. **App vs website framing.**
   - **CURRENT** [D1 §1]: he concluded peek.gift *should be an app, not a website* — *"websites are basically dinosaurs."* (Earlier docs/D5 still describe it as a web flow at `/build?...`.)

7. **Subscription mode:** API wired for `mode:'subscription'` but [S3] "NO subscription products are wired yet, one-shot is default" — speculative, not a stated want.

---

## 4. UNIQUE SIGNAL — things that appear NOWHERE ELSE

- **Frank is the only admin** — `ADMIN_CLERK_USER_IDS` = `user_3Doj78byqwXP3goPCZVNdFMM9l7`; `/admin` 404s for everyone else [S2, S3]. (Identity anchor.)
- **He is NJ-based; Stripe tax origin = New Jersey** [S2 "NJ-based", S6 "NJ origin registered"]. The "New Jersey" the brief asked me to hunt = this, plus the deleted Citi/NJ banter.
- **His card is locked for fraud** — recurring reason he can't run live $12 checkout; hence the $0.50 `THISISTHEONE` coupon for smoke tests [S1, S2, S3].
- **The bank was emptied ~3 times** chasing prettier architecture before first dollar — the explicit anti-pattern warning [`_claude/notes/ASSET-MAP.md` line 124: "the exact pattern that emptied the bank three times"]. Strongly implies money pressure driving "ship for the first dollar."
- **About to push an Instagram ad ramp: 2K–20K views/day** at his spend — the deadline pressure behind "revenue-ready" [S2].
- **"Any moron from Instagram → shockingly good site in 5 minutes"** — his north-star one-liner for the funnel [S5 MEMORY §0].
- **The $192.16-in-one-day Anthropic burn (2026-05-26)** + zero cache-hit on live chat — his cost anxiety made concrete [S3]. He wants programmatic usage/cost queries (admin API key) [S2].
- **"Solid" — a comment he remembers from a previous chat that was never in any repo file; lost to history** [S2]. (Evidence other prior-chat voice has been lost — supports the "lost the most recent transcript" claim.)
- **He obfuscates secrets piecewise** to dodge GitHub secret-scanning / chat moderation; *"the system might freak out"* [S3]. A behavioral tell, not in the spec.
- **The Citi / construction / fintech stories themselves: GONE.** Named only as removed banter — *"the Citi stories are removed"* [D1 line 4], "Citi" referenced in old handoffs only as context. Their actual content lives only in the lost 05-29 raw transcript. **This is the single biggest unrecoverable gap.**
- **GlacialSips is a sibling vertical** proven on the same engine (`proof/config-swap`, "one engine, two verticals — gift + water filtration") [D4/RECON_FINDINGS, ASSET-MAP]. peek.gift is one of multiple products sharing the architecture.

---

## 5. METHODOLOGY / COVERAGE NOTE (for the CTO's re-run check)
- **Branches scanned:** all 148 remote refs (enumerated via `for-each-ref`). Verbatim-quote files concentrate on `atelier-integration` + `claude/bold-ride-Li5zK` + `claude/bold-feynman-SZzaO`; vision docs on `gallant-planck-pu51x` / `studio-vnext` / `studio-integration` / `in-site-chat-buildout` (`RECON_RAW.md` blob `246b7fcc` identical across these 5).
- **Content sweeps run:** (a) filename match `transcript|monologue|voice|raw` across every branch; (b) story-marker grep `bananahead|gabagool|Citi|construction|New Jersey|blah blah|Frank:`; (c) filler-density score over all 11,040 md/txt path-instances de-duped by blob; (d) `2026-05-29` mention across all tips + all 5,781 history objects; (e) full-filesystem `find` over `/tmp`, `/home/user`, `/home/user/peek-zips`.
- **Conclusion:** the raw voice transcripts are not recoverable from this environment. The reconstruction above is assembled from the surviving derived extracts + verbatim-quote-bearing handoffs, every signal tagged to source.
