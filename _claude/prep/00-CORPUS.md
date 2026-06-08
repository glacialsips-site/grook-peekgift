# 00-CORPUS — peek.gift, the single canonical reference

> **For the CTO.** One de-duped synthesis of all 11 prep docs (`transcripts, requirements,
> vision-design, mechanics-ir, services-ops, decisions-bugs, zips-deep, provenance-weed,
> future-roadmap, pantry-tokens, md-census`). The build plan is written from this file.
>
> **FRAMING — read before anything else.** The owner's directive: *nothing in the existing
> codebases or mockups is a ceiling — they are the FLOOR.* Extract PRINCIPLES to exceed, not
> relics to preserve. Where a source says "the proven output," treat it as a baseline to **beat**.
> The 15 mockups, the deployed zip, the 211-font pantry, the 40 presets — all are starting lines.
> The win condition is *exceed the floor*, not *match it*.
>
> **Provenance convention.** Claims carry `branch:path` or absolute-path sources inline (compressed
> where a blob is byte-identical across branches). Tags: **CURRENT** (live doctrine/lineage),
> **DEPLOYED** (actually serving), **SUPERSEDED/DEAD** (tried, abandoned, kept only as parts/reference).
> The single most-cited recency fact, stated once here and assumed throughout: the build docs
> (`PEEK_GIFT_BUILD*`, `REQUIREMENTS_SPEC`) describe a **structured-IR, "never raw HTML"** architecture;
> the **deployed code + the newest plan + the owner's newest zip** pivoted to **freeform-HTML authoring
> with a structured spine kept alongside** ("Dual Representation"). That reversal is the #1 open call (§8).

---

## HEADLINE (the 6 lines)

1. **peek.gift = a chat-built, art-directed gift PAGE that *is* the gift.** Creator talks to a translucent chat over a live preview; an Opus model authors a bespoke page; recipient opens a link and picks from curated cards inside creator-set rules; publish = $12 Stripe. Two surfaces, one renderer.
2. **The moat is TASTE, not features** — encoded as a peer-to-peer "designer in the seat" with a method (kill-the-noun → one OBJECT → one loud move → make it move → tag-don't-script). *Generic is the only failure.* Valid ≠ beautiful, and only an unconstrained model clears the beautiful bar — a deterministic design engine was built and **rejected** as "housey."
3. **One linear git spine** (`bold-feynman → gallant-planck → studio-integration → studio-vnext → in-site-chat-buildout → clean-slate`) pivoted structured-IR → freeform-HTML *inside one family*; the **atelier** line is a separate, older, most-built, only-live-verified family. **13 typed ports** + an event-sourced gate are the durable overbuild.
4. **The loop has NEVER closed end-to-end** (`picks=0`, `webhook_log=0`); real money ($12 × 31+) flows only through a **legacy off-repo Vite app**. Getting one create→publish→pick→notify run green is THE milestone.
5. **North star = PerfectPurchase** (supplier-neutral cross-retailer commerce decision layer; "own the decision, not the catalog"). peek.gift + GlacialSips are revenue stepping-stones on **one engine, many verticals, one product graph** (the catalog moat = the real net-new).
6. **The genuine open calls** (need the owner): the **page-model** (freeform+spine vs structured-IR), the **build branch**, the **checkout flavor**, and three **thin areas** (collaboration / social / ops rules).

---

# 1. PRODUCT TRUTH

## 1.1 What peek.gift is
A **Creator** (a.k.a. curator / "User 1" / sender) builds a personal, art-directed **gift page** for one **Recipient** ("User 2") and sends a link. **The page itself is the gift / the surprise** — "the gift moment is opening the link and seeing the curated page, not unwrapping the wrong shit later" (`atelier-integration:_packets/BRAIN-DUMP.md`). The Creator makes the emotional frame; the Recipient gets agency inside it — they pick from curated cards within the rules and caps the Creator set (`recon-assets/PEEK_GIFT_BUILD.md §1`; `…/vision/REQUIREMENTS_SPEC.md §1`).

**The problem it kills** (the emotional thesis, verbatim Frank, `BRAIN-DUMP.md`): the wrong-guess present, the Amazon box that "was kinda what you wanted but is actually a waste of money," the gift card ("you've handed someone an errand"), the Hallmark-card-plus-cash "effort theater" the recipient feels obligated to fake gratitude for. Mission: *make gift-giving real again · cull the money wasted on missed gifts · obliterate gift cards and ecards.* The fix is **radical personalization of the page**.

**Two page types, one structure** (`PEEK_GIFT_BUILD.md §1`): **gift page** (primary) and **invite/invitation** (hero + event details + plan/schedule + RSVP/tickets). Both share the same anatomy and renderer; "reveal/door" is a `page_type`, not a hardcoded flow.

**Platform:** mobile-first (near-term traffic is Instagram), desktop-compatible from the same document. Frank's stated aspiration "it should be an app, not a website — websites are basically dinosaurs" is an aspiration; the v1 target is a **Next.js web PWA**, Expo native later (`REQUIREMENTS_SPEC §1` vs `PEEK_GIFT_BUILD §5` — resolved web-now/native-later).

## 1.2 The core loop
Sparse human input → model authors a page live → recipient picks within rules → publish gates on $12 → creator is notified to fulfill.

1. Creator gives **one sloppy line** (often from a phone, from someone who never thought about design) via a multimodal rail: text · URL paste · image upload · **camera** · **mic** (mic backburnered — "atrocious" in QA, deferred unless plug-and-play; see §3/§7).
2. The model **infers everything**, authors an art-directed page, and **forms the categories, carousels, and rules itself** — "something a typical user could never make on their own" (`PEEK_GIFT_BUILD §2`). It asks **at most one** question, only if a detail is taste-critical and unguessable ("surprise party — show their name or hide it?"). It **never** asks about fonts/colors/layout/theme — *deciding is the magic.*
3. The page **builds live behind the chat**; the preview flags exactly the regions a turn touched.
4. Publish is offered **the moment the page is useful, not perfect** → $12 Stripe gate.
5. Recipient opens `/g/<slug>`, browses, **picks within rules + caps** (server-enforced); beg/unlock/claim mechanics fire.
6. On finalize, the **Creator is notified** (Resend now; Twilio when keyed) with what was selected. **Tier 1 = the Creator fulfills themselves.**

**The success metric for the in-site model** (`CONCEPT_BREAKDOWN §10`): *"get the human to the checkout/money button as fast as possible without losing them"* **+** *"make the page look REALLY good."* The built-in tension — speed-to-checkout fights make-it-personal — needs a guardrail so the chat doesn't speedrun past the personal note + theming.

## 1.3 The two surfaces (one renderer, no fork)
- **Creator surface (the studio):** ONE screen — a **transparent chat floating over a live preview** of the page building behind it; the keyboard collapses to reveal the full page. **The conversation is the only interface — no step-wizard, no drawers, no manual controls.** (The 6-step wizard + design-drawers model in `peekgift_product_intent_source_orientation.md` is **SUPERSEDED**; keep it only for the *meaning* of each concern.) The studio frames the preview inside a "fake phone"; the chat overlays in glass and covers ~60% of the page (the reason legibility-behind-motion is a hard design law). Refinement is plain language ("darker," "different font," "group these," "make it pick-one," "add a soup option").
- **Recipient surface (the published page):** the same source painted by the same renderer; the recipient layers its own interactions (pick / beg / unlock / claim) on top. Served SSR at `/g/<slug>` (view-source shows content for unfurl). Reveal ceremony is a `page_type`. **No retailer branding visible** — the cards feel like the sender's gift, not Amazon's wishlist; no Stripe/Clerk branding either.

## 1.4 Value prop (one line)
*"Any moron from Instagram → a shockingly good, unmistakably-theirs page in 5 minutes"* (`MEMORY.md §0`) — the gap between what a normal person could make and what the model hands back, closed so hard the recipient screenshots it and forwards it to five friends. That forward is the growth loop; **generic = nobody forwards = the loop dies.**

---

# 2. DESIGN PRINCIPLES (to exceed)

> The doctrine lives canonically in the deployed system prompt **"the design seat"** (`peek-zips/deployed/peek-design-seat.md` ≡ `netlify/seat.ts`, identical text; the working-tree copy is the owner's newest artifact, 06-07). Its ancestor is `peek-jumpoff/JUMPOFF.md`. These are **PRINCIPLES**, not a mockup catalog — the underlying laws. **The mockups, presets, and pantry are the floor; the law is "exceed it."**

## 2.1 The prime directive — GENERIC is the only failure
*"Not ugly — generic. 'Nice,' 'clean,' 'reasonable' is the loss, because reasonable is what pours out by default and the default is what they could've gotten anywhere. The instant you reach for the safe choice, you stopped designing and started defaulting. Outdo the brief."* Every other rule is downstream of this one. **This is not an MVP** (`design-seat:7-8`, `JUMPOFF.md`).

## 2.2 The method (reusable law, three beats)
1. **Kill the noun.** "Birthday / anniversary / gift-for-mom" are *categories*, and categories are where generic lives. Find the **feeling** under the facts (the daughter a country away; the guy who quietly did everything; *I like you and can't say it straight*). Facts are logistics; the feeling is the brief.
2. **Find the OBJECT** — one real thing in the world, **specific enough to forbid things.** The object *dictates* everything: typeface, the one accent, section names, copy voice, motion, mechanics. *"If it doesn't tell you what not to do, it isn't an object yet — push until it bites."*
3. **Obey it at gunpoint, then set the volume.** Every element traces to the object with a one-word **because**; **no because = a default = cut it** (the "because" test — *"most of the gap between designed and generated"*).

## 2.3 One loud move (the volume law — the most-repeated idea in the corpus)
*"A loud object earns exactly ONE loud move and goes silent everywhere else; a quiet object is mostly empty space and a single gesture. Two bold moves fight into noise; zero is a template with nice colors. Knowing which is the whole skill."* (`design-seat:13`; `DESIGN_DIRECTOR §1.4`; `TIPS` trap #3.) *Soft Landing* (the quiet meal-train mockup) proves the quiet half; *El Taquito* / *Cyber Rave* prove the loud half.

## 2.4 Type IS the concept (the anti-Fraunces×5 law)
*"One characterful display face with a real point of view is half the design — vary it every single time; two pages sharing a face means one of them defaulted. Clean body, dramatic hierarchy (hero 4–6× body). The recipient's name lives in the type as a hero element, never a label."* This is THE most-cited failure mode in the corpus ("the Fraunces×5 trap / same font on every page"). 33 families across the 15 mockups, almost no repeats — the discipline made literal. Steal the **real genre's codes** (a boarding pass's barcode + seat block, a game HUD's bars + pixel type, an engraved invitation's small caps — "the real thing beats a gesture at 'elegant'").

## 2.5 Make it MOVE (non-negotiable, hand-built, behind the words)
*"A static page is a failure."* ONE signature motion **born from the object**, built **by hand from CSS/SVG primitives** (`@keyframes`, repeating-radial/conic/linear gradients, SVG filters, clip-path/perspective/blend-modes) — **no clip-art bank.** A generic fade-in where the object has its own motion is itself a default. Loop gently; **honor `prefers-reduced-motion`** (mandatory). The motion lives **behind the words, never veiling the name** — *"a hero you can't read at a glance is a failed page"* (enforced because the chat covers ~60% of the page).

## 2.6 Tag-don't-script (the authoring law that keeps caliber AND safety)
The model authors **one freeform page** — its own Google fonts, a `<style>` block, bespoke CSS/SVG. **"Caliber lives in the markup, so write it directly."** Three hard rules, no exceptions:
- **Every pixel & motion is CSS or SVG. Never a `<script>`.** And never `<form>/<input>/<textarea>/<select>` — stripped on the way in, so a hand-rolled form silently vanishes → broken page.
- **Never an inline `data:`/base64 blob** (image *or* texture) — stripped; build grain from CSS gradients or a real inline `<svg><filter>` applied with `filter:url(#grain)`.
- **You don't write behavior — you TAG it.** Selection, pick-one, the draining tab, locks, the sheet, the sticky bar, checkout all come from a fixed host runtime when you tag markup with the **`data-peek-*` contract** (§3.4). You style every *state*; the host only toggles it. *"Mechanics are a floor — if the gift implies one that isn't here, invent the markup and tag it; the host grows to meet it."*

## 2.7 Object-specificity & the "if it could be anyone's, it's wrong" test
The final, most-quoted gate: *"Could this site belong to a different event? If yes, the concept didn't bite hard enough."* Make it unmistakably *this* recipient: name in the type, in-joke in the copy, gift as the hero.

## 2.8 Why caged/templated approaches went bland (the founding insight: valid ≠ beautiful)
- **A deterministic parametric design engine was actually built and REJECTED** (`engine-parametric-REJECTED/{resolver,director}.js`). It produced *valid* pages — and was rejected because *"valid wasn't beautiful: coherent but housey — a notch below the mockups."* The settled call: **"The model IS the resolver. There is no mandatory deterministic design engine — that would cap quality at what its lookup tables know, the ceiling this whole project exists to avoid."** (`00_MAP §4`; `DECISIONS.md`.)
- **The renderer-with-archetypes flattened distinct objects into one template** (`GAP_ANALYSIS.md`): a hardware work-order, an engraved auction catalogue, and a lotería invite "all collapse toward the same tasteful card-grid template"; dad's work-order checklist flattened to a generic photo carousel; el-taquito's hard-offset shadows gone ("the single missing token is the difference between loud-handmade and clean-template"). This is the empirical face of valid≠beautiful, and the strongest argument for letting the model author raw HTML (no archetype zoo to collapse into).
- **Closed vocabulary is the generic-maker.** jolly-mccarthy's `vibe-resolve`/`vibe-genome` knob-expansion generator is DROP for the same reason — the defect is the *fixed vocabulary*, not "deterministic." Keep only the OKLCH contrast-repair as a safety net.

## 2.9 The anti-generic doctrine, distilled (laws + the slop blacklist)
- **Widen the object** — the faux-vintage paper artifact (newspaper, work order, decree, ticket) has curdled into its **own** rut. Let the object be a *screen, device, creature, place* at least as often as a page. Watch your own reflexes: "a creature is not automatically a 'specimen card' — that's the same default wearing fur." **If two briefs in a row land on the same object, one of them defaulted.**
- **The hard bans (defaults in disguise):** aimless purple→pink gradients · decorative emoji · glassmorphism by reflex · uniform card grids · the same neutral sans on every page · left-border callout boxes · stock "3D blob" shapes · Lorem Ipsum shipped as final.
- **Copy is design** — the voice is the object's voice; CTAs in-world ("Send it to Dad," "Board the shuttle," "Slide it under the door"), never "Submit."
- **Use a real image where CSS would only fake it** — glass/metal/skin/fur/photoreal and **especially the recipient's actual face** (face refracted in the crystal ball, the trading-card portrait, the face in the locket).
- **Restraint** — one dominant accent, AA contrast, no accidental rainbow; match the decorative volume (hard-offset shadows / thick ink borders / perforations for *loud*; thin borders / soft radii / one glow for *quiet*) to the object.

## 2.10 The pre-authoring 10-point gate (the operational definition of "good")
Run silently before authoring. **A no on (1), (2), (3), (4), or (8) is FATAL regardless of the rest:** (1) object specific enough to forbid · (2) exactly ONE loud move, and is it loud · (3) does it visibly **move** (object's own motion, not a fade) · (4) display face is the concept, not a reflex · (5) one dominant accent, AA, no rainbow · (6) steals the real genre's codes · (7) copy sounds like the object, not a CMS · (8) unmistakably *this* recipient, name in the type **and fully legible** · (9) zero base64/`<script>`/`<form>` · (10) not a tired paper artifact. **"One self-patch at most, then show them — a real draft beats endless polish."**

## 2.11 The aesthetic eval gate (the moat — net-new, do-not-skip)
"Valid but ugly" is a failing gate, and beauty is what's defensible. Three altitudes (latest refinement, `IN-SITE-CHAT-MASTER-PLAN.md §6`):
- **Inline per-turn (free, no latency):** a deterministic lint floor (JUMPOFF hard-bans + OKLCH-AA invariants) + the model's own thinking-time **self-grade**.
- **Offline in CI:** a **vision judge** — Claude screenshots the rendered phone page and grades a **10-axis rubric** (concept / bold-move / hierarchy / restraint / type / color / authenticity / copy / specificity / slop); **gate-zeros on concept/bold-move/type/specificity/slop are fatal**; ship-bar across a golden set (the 10 original mockups + 5 new as the floor). *Screenshots must wait for `document.fonts.ready` or they grade fallback fonts.*
- **The cold-range test** (the organizational gate): "range, not specimens" — original-10 caliber on arbitrary unseen briefs ("get-well for my coworker who broke his leg skiing," "going-away for the office cat"). Plus the **safeword report loop** (§7): the model drops persona and reports what it inferred, faked, lacked, and what'd make the next one gnarlier — *"this is the gold."*
- **The taste loop (compounding moat):** a `commit_concept` step + one-tap **Keep / "Too safe — again"**; verdicts land in a `taste_verdicts` table; rejected→kept pairs compile into a cached prompt suffix. **"Capture Frank's taste as rejections, not essays — explaining it in prose failed for two months (the model softens prose into generic mush). His no's are the spec."**

> **Trust order when docs conflict (canonical):** *the 15 mockups > the renderer > the prose docs.* If a doc contradicts what a mockup actually does, the mockup wins — but the mockups are the **floor**, not the ceiling.

---

# 3. MECHANICS

## 3.1 The entity model (the live `peek_v2` Postgres schema — Drizzle, 14 RLS tables)
Source of truth = `atelier-integration:atelier/db/schema/*`, MCP-verified `GROUND-TRUTH.md §B` (2026-06-02). Row counts: peeks **50** · cards **33** · variant_groups **10** · events **372** · chat_messages **380** · usage_ledger **277** · **picks 0** · **webhook_log 0** · collaborators/relationships/affiliate_revenue/tier_config/curator_memory **0**.

- **`peeks`** (the lifecycle root, 50 rows): `slug` (→ `/g/<slug>`), `curatorId`→users (nullable for anon drafts), `recipientName`/`relationship`/`occasion`, `giverNames[]` (group "from"), **`budgetCents`** (the cap), `recipientProfile` jsonb, **`vibe` jsonb** (the rich styles engine, §3.5), hero (`heroImageUrl`/`heroImageSource`∈`user_upload|unsplash|ai_generated|external`/`heroPrompt`), `noteMd` (personal note), `status` enum, Stripe ids, `publishedAt`/`expiresAt`/`shareUrl`, `metadata`. **Lifecycle:** `draft → ready_for_publish → published → claimed → archived`.
- **`cards`** (33 rows): `cardType` enum `product|activity|aspirational|digital`; `variantGroupId`; `position`; title/description/imageUrl; `sourceUrl`/`sourceRetailer` (**hidden from recipient**); `affiliateUrl`/`affiliateNetwork`/`commissionPct`; `valueCents` (cap math); `revealValue`; **`isTaunt`/`tauntText`**; **`isLocked`/`unlockRule`**; `proposedDate`/`locationHint` (activity); `addedByUserId` (contributor attribution); `metadata`. ⚠ `source_citations` is named in specs but **does not exist** on the table — web_search citations have no home (flag).
- **`variant_groups`** (10 rows): `selection` enum `pick_one|pick_any|pick_all`, `title`, `position`.
- **`picks`** (**0 rows** — the loop has never completed): `cardId`, `recipientSignature`, `recipientNote`, **`begMessage`/`begApprovedAt`** (beg flow), `fulfilledAt`/`fulfillmentNotes` (Tier-1). ⚠ studio-vnext does NOT write this table — it uses a new `peek_v2.peek_picks` (one row/peek, jsonb card-id array), **dropping the beg/fulfillment columns** (drift risk).
- **`peek_collaborators`** (0 rows): role enum `organizer|co_organizer|contributor`, invite tokens, accept flow. Built, never exercised; RLS default-deny, no policy/API/UI.
- **`relationships`** (0 rows): the recurring-nudge graph (birthday/anniversary/`lastPeekId`) → feeds the `nudge-relationships` Inngest job (no-op).
- **`events`** (372 rows): **flat telemetry stream** (`kind`+`payload`) — *NOT event-sourcing*, analytics only.
- **`usage_ledger`** (277 rows, live cost metering) + **`tier_config`** (usage-cost tiers, NOT fulfillment tiers).
- **`affiliate_revenue`** (0, webhook-fed) · **`chat_messages`** (380) · **`webhook_log`** (0) · **`users`** (3, Clerk mirror, `tier` field) · **`curator_memory`** (0, Anthropic Memory-tool backing store).

## 3.2 The THREE IR shapes (and which is current)
All three share the same inner `PeekIR` types but wrap/author them entirely differently. **This is the central mechanics fork (§8 C1).**

- **SHAPE A — deployed row tables + thin author (OLD, but DEPLOYED).** `atelier-integration` writes current-state rows (`peeks`+`cards`+`variant_groups`) + the flat `events` stream; 16 tools map ~1:1 to writes. No single "document object." **This is what serves prod today.**
- **SHAPE B / B′ — PeekIR v1, event-sourced (SUPERSEDED; the once-"canonical").** `bold-feynman:lib/ir/contract.ts` ≡ `gallant-planck:packages/core`. `PeekIR = { schema_version:1, peek, sections[], variant_groups[], cards[] }`, **snake_case** (mirrors DB columns, not Drizzle camelCase). A *superset migration* of A: keeps Card/VariantGroup/Pick verbatim, replaces thin `vibe` with a full **`ThemeSpec`**, adds **`Concept`** (the anti-generic lock: oneLiner/boldMove/voice/emotionalCore/antiPattern) and an ordered **`sections[]`** layer (18 SectionKinds incl. `custom`). B′ adds the maker-checker: **16 commands → `decide(doc,cmd,ctx)→Result<PeekEvent[],CoreError>` → `apply` fold**; document = the fold of its events → undo/history/replay free; malformed AI output bounces at the boundary. This branch **fixed all four renderer gaps** (variant grouping, hero glow, stats/lede authorability, itinerary) — then was **abandoned**.
- **SHAPE C — PeekDocument v2, dual-rep / freeform HTML (CURRENT lineage).** `studio-vnext`/`clean-slate`:
  ```ts
  interface PeekDocument {
    schema_version: 2;
    spine: PeekIR;                       // canonical commerce/state truth (Shape B verbatim)
    presentation: { html; html_hash; runtime_version; authored_at } | null; // canonical LOOK; null = IR-only fallback
  }
  ```
  The chat **stops authoring a structured IR** and authors a bespoke tagged HTML page; the spine is **derived** from the `data-peek-*` tags (`extractSpine(html)`), kept in lockstep, joined on stable `data-peek-id === Card.id`. Recipient is served `presentation.html` (+ `peek-runtime.js`); **picks/checkout/graph read the spine.** Tools change to **7** — `set_page` (whole HTML in one move), `edit_region`, `set_style`, `set_media`, `resolve_card`, `generate_hero_image`, `publish`. `render(spine)` becomes the **fallback** when `presentation` is null + the deterministic `next/og` surface. The only "checker" on this path is `sanitizeHtml` (DOMPurify) + `extractSpine`'s `issues[]` — **not** a command-validation gate. (There is no file literally named `presentation.html`; it's the `Presentation.html` string field stored in `peek_documents.doc`.)

> **WHICH IS CURRENT:** Shape C (studio-vnext/clean-slate, 06-04) is the newest functioning lineage with a complete app and matches the owner's newest zip; the deployed zip proves it "kinda works and looks good." Shape A is what's *deployed*. Shape B/B′ is the §F-blessed-then-abandoned structured renderer. **The CTO must ratify C as canon (it reverses three settled docs) — see §8.**

## 3.3 The full `data-peek-*` contract (the host runtime; CURRENT = `studio-vnext/clean-slate:apps/web/public/peek-runtime.js`)
The model only tags + styles states; all selection/commerce logic is in the runtime (document-level event delegation, so `edit_region` patches stay live; state keyed by `data-peek-id`). `window.__PEEK__ = { mode:"preview"|"recipient", onAction(type, summary), rescan() }`.

- **Card:** `data-peek-card` (legacy `data-card`) · `data-peek-id` (stable join key; auto-stamped if absent) · `data-name` · `data-price` (0/absent = Free) · `data-src` (retailer label shown in sheet) · `data-desc` · **`data-kind`** ∈ `product|wrapped|custom|experience|taunt|digital` (folded to core `CardType` via `KIND_MAP`: wrapped→product, custom→product+`metadata.homemade`, experience→activity, taunt→aspirational+`is_taunt`, digital→digital; raw kind preserved on `Card.metadata.kind`).
- **Selection/variants:** `data-group="g"` + `data-rule="pick-one"` (single-select; new pick deletes prior) · `data-opt` (sub-option inside a card; copies its price onto the card) · `data-rule="pick-any"` (runtime default multi-select; **`pick-any`/`pick-all` are spine-level, enforced server-side by `decidePick`, not in the JS**).
- **Shared tab/thermometer:** `data-budget="250"` (→ `budgetCents`) · `data-peek-tab` (`.over` when total>budget) · `data-peek-tab-amount` ("$X left"/"$X over") · `data-peek-tab-fill` (drain bar width) · `data-peek-tab-msg`.
- **Locks/unlock:** `data-locked` (or `.locked`; not pickable until unlocked) · `data-unlock="after:<token>"` (loose substring match against `"<kind>|<group>|<id>"` of any picked card → host adds `.unlocked` + `data-peek-unlocked="1"`). The runtime's unlock = **only** the "pick X to unlock Y" mechanic (`requires_picks`/`event`); **`beg` and `date_after` live server-side**, not in the JS.
- **Picked state / sheet / bar / CTA:** `data-peek-picked` (host-set; the one stateful hook the author styles) · `data-peek-sheet` (bottom sheet; CURRENT injects a themed fallback if absent) + `data-peek-sheet-pick` · `data-peek-bar` (sticky order bar; injected if absent; CTA label is mode-aware: recipient→"Send my picks", else "Publish · $12") · `data-peek-action="publish|claim|rsvp|share"` (→ `cfg.onAction`) · `data-peek-reveal` (scroll-reveal → `.in`).
- **Image slots:** `<img data-peek-img data-peek-img-desc="…" data-peek-img-src="generate|search|upload">` — host fills after finalize (fal: `upload`+userImage → flux image-to-image to put the recipient's face into the artwork; else flux-pro text-to-image). ⚠ `search` is advertised but **has no backend** (over-promised).
- ⚠ **Runtime drift:** the DEPLOYED-PROTOTYPE zip runtime differs (`[data-peek-card]` only, no injected sheet/bar, `onAction({…})` single-object vs CURRENT's two-arg `onAction(type,{…})`). The `runtime_version` field on `Presentation` exists to track exactly this — unify it.

## 3.4 The rules engine semantics (the genuinely defensible core)
*"The recipient side of the maker-checker — the recipient surface AND the server both run this, so the client preview and the server-validated pick can never disagree."* `gallant-planck:packages/core/src/picks/engine.ts`: `decidePick(doc, current, {type:'toggle', cardId}, caps?) → Result<PickResult, CoreError>`, pure/deterministic (sorted output, no IO/clock/random).

- **Guard order:** card not found → `NOT_FOUND`; `is_taunt` → `FORBIDDEN` (a taunt renders but can't be picked — the Ferrari "HA YEAH RIGHT"); `is_locked` → `FORBIDDEN` (beg/date/event unlocking happens outside the engine).
- **Variant toggle math:** `pick_one` (radio — delete group members, add this) · `pick_all` (bundle moves as one — all picked → delete all, else add all) · `pick_any`/no group (plain toggle).
- **Caps/thermometer:** `committedCents` = Σ `value_cents` of picked non-taunt cards; `hardCents` exceeded → **`INVARIANT` blocked**; `softCents` exceeded → succeeds with `overSoftCap:true` warning. ⚠ **The studio-vnext pick route calls `decidePick` WITHOUT passing `caps`** → server-side budget enforcement is **dead code**; the client thermometer is purely visual (gap to close, §7).
- **The 4 unlock kinds** (schema is authority; build-doc spec lists only 3): `beg` (recipient must message back to unlock — beg flow) · `requires_picks` ("must have already picked specific cards" — the canonical "pick everything unless you spend a day with me" mechanic) · `date_after` · `event`. NB `date_after`/`event` are accepted by Zod but have **no consumer code** in the current build.
- **Card kinds — three non-identical vocabularies must collapse to one mapping table** (not yet written, §8): schema enum `product|activity|aspirational|digital`; prose adds homemade/IOU/donation/joke/experience/manual; runtime `data-kind` `product|wrapped|custom|experience|taunt|digital`.
- **Caps semantics (spec):** hard + soft caps, set by Creator; **more items than the recipient can take**; fill mode by $/count/both; show/hide value per card (`reveal_value`); over-cap behavior hard-stop | allow-over | allow-over-with-a-request; item-aware defaults (a $900 item shouldn't get a blind $200 cap — formula unsettled).
- **Treat rules as FIRST-CLASS DATA, not chat-improvised text** — the recipient view enforces reliably. The curator never sees schema vocabulary; the chat translates ("3 shoes + 2 dinners + 1 ferrari", "the escalator", "pick everything unless you spend a day with me").
- **Layout mechanics:** items sharing a chat-decided category wrap into a **horizontal carousel with the rule applied at carousel level** ("The Drop · 03 pieces", edge-peek snap); badges ("NEW · updated by claude", "JUST PLACED") derive from events, not a diff guess.
- **Activity-as-itinerary:** experiences render as an **itinerary** (date + place + ordered steps), NOT a card and NOT a scheduler. (Renderer GAP on the structured path; on freeform the author lays it out in HTML.)

> **Persistence reality vs target:** today the app writes current-state rows + a flat telemetry stream — this is **NOT** the event-sourced command→event→state maker-checker the architecture calls for. That gate (`packages/core`) is net-new and exists only on the abandoned gallant-planck line.

---

# 4. ARCHITECTURE STATE

## 4.1 The one linear git spine (provenance-verified by ancestry, not by trusting prior docs)
**There is ONE continuous rebuild spine, not 6 competing islands.** The "robust/structured-IR" line and the "freeform-HTML" line are the **same git lineage** — each a strict git ancestor of the next:

`bold-feynman (06-01) → gallant-planck (06-02) → studio-integration (06-03) → studio-vnext (06-04) → in-site-chat-buildout (06-04) → clean-slate (06-04)`

The structured-IR → freeform-HTML pivot happened *inside one branch family.* `clean-slate` (`8b3a700`, 06-04 10:11) literally **contains** gallant-planck (the event-sourced `packages/core` is still in it, with the freeform-HTML layer on top); its last commits "isolate the live app" + "strip every comment."

- **NEWEST + CLEANEST = `clean-slate`** — the build base **if the owner picks freeform-HTML.** Its documented twin is `in-site-chat-buildout` (clean-slate minus the stripped docs — read it for the *why* + the precise remaining-steps + security-gap list).
- **The atelier line is a SEPARATE family** (forks from common root `ef5647c`, 05-25; never re-merged). It is the **most-built + only live-verified** line but is **older (≤05-29)** and NOT an ancestor of the newest work. `peek-clean`/`intelligent-brahmagupta` = the atelier frontier (richest backend: rules engine, security, moderation, scrape, image, usage, anon, reveal, notification, real Stripe) — **CANONICAL-as-PARTS-DONOR**, not a build base.
- **Rankings:** newest = zip (06-07, off-git) → clean-slate (06-04). Most-complete backend = peek-clean (atelier frontier, abandoned family, loop never closed). Most-complete closed-loop-in-one-tree + closest to the zip-caliber output = **clean-slate** (create→author→persist→sandboxed-recipient wired; gaps = publish-CTA + pick postMessage-bridge; prior estimates: loop ~65%, money ~40%).

## 4.2 The 13 ports (the durable overbuild — "add the 14th or 50th backend = one adapter, zero core change")
`gallant-planck/clean-slate:packages/core/src/ports/ports.ts`, `Ports` registry, framework-agnostic (`PortResult<T> = {ok:true}&T | {ok:false,error,retryable?}`; *"core depends on contracts, never on a process.env read"*):

`llm · productSource · research · cardResolver · image · persistence · payment · auth · email · analytics · moderation · storage · botGate`

Notable: **`cardResolver`** is a data-ordered cascade (`DEFAULT_RESOLVER_ORDER = ['retailer_api','url_scrape','research']`, reorderable per-call/per-construction — **tier order is DATA, never hardcoded elsewhere**); `research.resolveFromDescription({query, constraints, images})` already accepts `images[]` (the photo-of-room socket); `image.op` includes `edit`/`relight` (render-into-space); `payment.createCheckout({peekId, amount_cents, kind:'publish'|'contribution'})`; `persistence` = `load/save/appendVersion/bySlug` (the event-log version hook). **The one missing socket = `fulfillment`** (§6).

## 4.3 The event-sourced gate (maker-checker; net-new on the live path)
The architectural intent: the chat does **not** mutate the document directly — it emits **Zod-validated Commands → Events → state**. `decide(doc,cmd)→Result<Event[],Err>` (neverthrow) + pure `apply(doc,event)→doc`; document = fold of its events. *"Fence the model with artifacts; a malformed AI op bounces at the boundary."* This exists only on the abandoned gallant-planck structured line. On the CURRENT freeform-HTML path the gate is `sanitizeHtml` + `extractSpine`'s `issues[]`. **Carrying `actorId` on every Command/Event is the one cheap-now/expensive-later seam** (collaboration is unbuildable later without it — §6).

## 4.4 What's canonical vs dead (sources of truth vs do-not-trust)
**SOURCES OF TRUTH:**
- *Current code (freeform):* `clean-slate` (`8b3a700`); read `in-site-chat-buildout` (`WAKEUP.md` + `BUILDOUT-STATUS.md` + `IN-SITE-CHAT-MASTER-PLAN.md`) for the why/remaining-steps/security-gaps.
- *Live env + IDs:* `atelier-integration:_packets/SPINE/VERIFIED-STATE.md` (the only env-grounded MCP-verified doc; 05-27 atelier truth — re-verify live before acting).
- *Live service/DB state:* `gallant-planck:_packets/SPINE/GROUND-TRUTH.md` (06-02 MCP, no Netlify read).
- *Decisions + correction trail:* `DECISIONS.md`, `RECON_FINDINGS.md`, working-tree `_claude/notes/{RECON-FINDINGS,ASSET-MAP,SESSION-HANDOFF}.md`.
- *Creative bar:* the deployed zip + `peek-design-seat.md`.
- *The bug ledger:* atelier `_packets/{BUGS,BUGS-WAVE2,BUGS-CHAT-LOOP}.md`.

**DO-NOT-TRUST / DO-NOT-BUILD-ON:**
- `engine-parametric-REJECTED/` + jolly's `vibe-resolve`/`vibe-genome` (the rejected closed-vocabulary generators; keep only OKLCH contrast-repair).
- The **stale root `package.json`** (`tailwindcss` + `next` scripts) — a bootstrap leftover; the clean-slate `apps/web` does NOT use Tailwind (runtime CSS-vars). Do not read it as the stack. (atelier genuinely IS Tailwind v4, in `atelier/package.json` — de-Tailwind on any lift.)
- **Every WAKEUP that self-declares "canonical/production branch"** — gallant (06-02), studio-vnext (06-03), bold-feynman (06-01) each claim primacy; resolved by recency + the owner's live word. Newest doc wins; the others are self-declared-residue *by their own successors*.
- `build/peek-vnext` (byte-identical duplicate of atelier-integration) · 25× `worktree-agent-*` exhaust · `packet-01..40`/`wave*`/`lt/*` (dead as branches, harvestable as parts via ASSET-MAP) · `wizardly-mendel` (dead branch, but authored the live `IN-SITE-CHAT-MASTER-PLAN.md`).
- ⚠ clean-slate's **trimmed backend is REAL** — verified absence of rules/moderation/rate-limit/origin/idempotency files. Riding clean-slate means **porting** those from peek-clean/intelligent-brahmagupta.

---

# 5. SERVICES & SEAMS

> **The one fact to hold:** there are 3+ parallel codebases but the IDs/accounts are **IDENTICAL** across all — same Netlify project, same Stripe acct, same Supabase project, same Clerk app, **zero key migration**. What differs is which branch deploys and whether the money path is wired. Keys live as **Netlify env vars** on `peek-gift-vnext` (the canonical vault). PROD-PARALLEL policy: vNext is a parallel deploy of the **same production stack** at a sandbox URL — never create test/dev instances. Names + presence only below (no secret values).

## 5.1 Live service inventory (keyed + running)
| Service | Role | IDs (non-secret) | State |
|---|---|---|---|
| **Anthropic** | Curator LLM, Vision, web_search, Memory, Files, Extended Thinking | org `ebe4a13c…` (peek.gift) | LIVE; usage_ledger=277 incl. Opus+Haiku. Frank wants Web Search enabled (one toggle). Prod model id = `claude-opus-4-8` in the deployed zip backends. |
| **Clerk** | Auth, sessions, lifecycle webhooks | instance `ins_3D5Va…`; `clerk.peek.gift`; admin = `user_3Doj78…` (Frank, sole admin) | LIVE; custom UI, no branding. |
| **Stripe** | $12 publish gate, Tax, Adaptive Pricing, webhooks | acct `acct_1T4xnbCEKPUsVee1` (Frank DeAndino, **NJ tax origin**); price `price_1TapZICEKPUsVee1ddG4n14M` (1200 USD) on `prod_UZzXnuYuX4ud15`; vNext webhook `we_1Tb7Ph…` (zero traffic); LEGACY webhook `we_1TRbB2…` (the real revenue path) | LIVE; one charge succeeded. Tax/adaptive dashboard activation **UNVERIFIED**. Test coupon `THISISTHEONE`→$0.50 — DO NOT run real $12 test charges (Frank's card locked for fraud). |
| **Supabase** | Postgres (`peek_v2`), Storage, RLS | project `ewqpujqerdnrkjqlpobo` (us-east-1, PG 17.6); buckets `peek-v2-assets` (vNext) + `gift-assets` (legacy) | LIVE; 14 tables, RLS on+force all. `peek_documents` (dual-rep store) + `peek_picks` are LIVE additive tables. **pgvector available but NOT installed.** |
| **Resend** | Transactional email (share + creator-pick notify) | sender `info@peek.gift` (DKIM verified) | LIVE; actual delivery receipt unverified. |
| **ZenRows** | Scrape (primary in cascade) | — | LIVE but **DEGRADED** — ~8/11 non-Amazon/Zappos failing. The weak link; win-condition #1. |
| **fal.ai** | Image gen (Flux) | — | KEYED but **SUSPECT** — `generate_hero_image` observed returning `image_url:null` on atelier; claimed fixed on studio-vnext. |
| **PostHog** | Analytics/replay/flags | org `peekgift`, project 434015 | WIRED (proxy strips IP/cookies — BUG B18). |
| **Upstash Redis** | Rate-limit, webhook idempotency, presence | db `probable-lemur-138225` | KEYED; idempotency **fails OPEN** (B15) → must fail-CLOSED for payments. |
| **Browserbase** | Stagehand agent = the PerfectPurchase "money button"; scrape-#2 only | proj `5221d287-…` | STUB/KEYED; endpoint broken (M13). |
| **Netlify** | Deploy host + Edge Fns | site `peek-gift-vnext` `932646db-…` → `vnext.peek.gift`; build hook `6a14cf…` | LIVE; builds **`atelier-integration`** via GitHub Actions → build hook (NOT native git connector). |
| **GitHub** | Source + Actions deploy trigger | repo `glacialsips-site/grook-peekgift` | LIVE; CI red on recent runs. |

**In-flight/blocked (keyed=no, code no-ops):** Sentry (org `peekgift` `4511426433646592`, no DSN — Frank to provide) · Inngest (3 jobs no-op, no account) · Twilio (SMS/WhatsApp share, returns `sms_not_configured`) · Deepgram (STT) + ElevenLabs OR Cartesia (TTS) — mic stays hidden until both keyed.

**Launch gates NOT started (the dangerous ones):** **Turnstile/bot-gate** (port stub only — open chat = open wallet; `/api/curator` is currently OPEN + unauthenticated on clean-slate) · **image moderation** (absent; text moderation via Haiku exists) · **multimodal embeddings** (Voyage/Cohere-v4/Jina-CLIP — **multimodal NOT text-only**, hard dep for the catalog).

**Demoted (Frank, 2026-05-28, "we don't have affiliates right now"):** Skimlinks/Sovrn → stub; `affiliate_search` falls back to Anthropic `web_search`. The catalog-graph *architecture* survives; commercial affiliate integration is deferred.

## 5.2 The deploy reality + the legacy split
- **Live:** Netlify `peek-gift-vnext` builds branch `atelier-integration` → `vnext.peek.gift`. **vNext has earned $0** (`picks`=0, `webhook_log`=0, vNext-product charges=0).
- **Real money = the LEGACY peek.gift Vite app** — a **separate repo** (Vite + 22 Netlify Functions, not in this git tree), Netlify site `peek-gift` `69732dcb-…`, **31+ real $12 charges**, the live webhook `we_1TRbB2…`. **Where the legacy repo lives is an OPEN ITEM.**
- The two newer finalist lines ship a **different, untested monorepo `netlify.toml`** (`base=apps/web`, pnpm) — going live = a manual Netlify production-branch repoint + a first-build debug.
- **Cutover** (vNext→apex, owner's call): add `peek.gift` custom domain + Clerk authorized origin → swap Stripe/Clerk webhook URLs → update `APP_URL` (⚠ `share_url` built at write-time per BUG M01) → disable legacy Supabase JWT keys last. Rollback = 5 single-field reverts.
- ⚠ **Security:** full live secret VALUES are committed in git history (Stripe `sk_live`, Anthropic, Supabase service-role, Clerk, webhook secrets, Netlify admin PAT, FAL). **Rotate** — flag, don't lecture (owner is ex-fintech, manages his own hygiene).

## 5.3 The exact ports each future capability bolts onto
| Capability | Bolts onto | Status |
|---|---|---|
| Catalog retrieval / product graph | `ports.productSource.search` (drop-in adapter) | socket sufficient; graph net-new |
| Per-feed ingestion (Skimlinks/Shopify/PA-API/…) | `ports.productSource` adapter-per-feed; `cardResolver` order=data | socket sufficient |
| PerfectPurchase "fuzzy ask → real products" | `ports.research` (already takes `images[]`) | socket sufficient; body is honest stub |
| Render-into-space | `ports.image` (`edit`/`relight`) | socket sufficient |
| The "money button" / Concierge / Atelier fulfillment | **`ports.fulfillment` — DOES NOT EXIST** | **add stubbed NOW** |
| Pooled/group gifting | `ports.payment.createCheckout` (`kind:'contribution'`) + widened `verifyWebhook` | partial; widen now |
| Multi-actor collaboration | `ports.auth.currentUser` + `actorId` on every Event | partial; stamp actorId now |
| Social share / OG unfurl | `ports.email` + share route + `next/og` themed image | built/partial |
| Viral referral loop | `referredByPeekId`/`referrerUserId` + a `referral` event kind | reserve now (not backfillable) |
| Compounding taste ranker | `ports.analytics` + `events`/`picks` occasion-tagged | keep logging now (not backfillable) |

---

# 6. FUTURE

## 6.1 PerfectPurchase (the north star)
A **supplier-neutral, cross-retailer commerce decision layer**: photograph a space/outfit (reef tank / dining room / yard) → agents **identify** it → **research** candidates across retailers → **price-tier** package options → **render into the user's own space** → a **money button** that orders across stores. Thesis: **own the decision, not the catalog.** peek.gift is "V0 of PerfectPurchase, deliberately minus fulfillment" — the wedge (gift-framed, self-distributing, ships the hard front-end without owning fulfillment). **Money model:** peek only needs to cover COGS + ad spend (break-even/self-funding); the real money is PerfectPurchase downstream. Fulfillment (auto multi-retailer buying) is **deferred** — "the boss fight; today's agents aren't reliable enough."

Five organs, four already socketed: **identify** (vision input, live) · **research** (`ports.research` with `images[]`, stub body — "the next big lever") · **price-tier** (the product graph, net-new) · **render-into-space** (`ports.image` edit/relight) · **money button** (`ports.fulfillment`, **missing**).

## 6.2 The catalog moat (the real net-new)
`pg_products` (one canonical product) + `pg_offers` (many offers: retailer, price, currency, url, commission_pct, affiliate_network, in_stock, checked_at) + pgvector. Entity resolution: **UPC/GTIN exact-match first, then title+image multimodal-embedding similarity** → one product, many offers. Hybrid retrieval (structured filters + pgvector text + CLIP image — the bridge to photo-of-the-room) behind `productSource.search`. Freshness gate (live-check price/stock before showing). **Feeds primary, scrape/web_search fallback** (Skimlinks/Sovrn/Impact/CJ/Rakuten + Google Shopping Content API, Shopify `/products.json`, Etsy/Faire, Amazon PA-API). The compounding ranker over your own pick/convert outcomes per occasion is the defensible asset — *the feeds are commodity; the entity-resolved graph + taste data is the moat.*
**Cheap seams to add NOW:** log every `resolve_card` result as an append-only row (today discarded — "the single highest-leverage line"); pull GTIN in the scraper (already in JSON-LD); reserve `CatalogPort` + a multimodal `EmbeddingPort` stub; enrich `picks` to reference products + occasion.

## 6.3 Multi-vertical / GlacialSips (proven)
**One engine, many verticals** — proven in code (`proof/config-swap`): the SAME grammar + renderer produces a warm gift page AND a dark water-filtration brand page with **zero engine changes** (and the proof exits non-zero if the a11y gate fails on either — it's a gate, not a screenshot). GlacialSips (Frank's water-filtration business) shares the same Stripe account. **Seam: keep the engine vertical-neutral** — name section kinds by function (`story/productSet/cta/footer`), never by occasion; keep `render-config-swap-proof.tsx` green for both verticals as a **regression gate**; host→config resolution is a single function (no `peek.gift` literals sprinkled through).

## 6.4 Collaboration (modeled, thin)
Multiple Creators co-curate; combine pages; roles `organizer|co_organizer|contributor`; "hero locked by the creator (TBD — could be more flexible)." Schema + RLS exist; **no API/UI/invite-send.** Pooled contributions (`payment.createCheckout kind:'contribution'`) exist in the port, unbuilt. **Seams now:** keep the table/enum; **stamp `actorId` on every Event** (cheap now, impossible to retrofit); widen `createCheckout` with all-optional contribution fields; widen `verifyWebhook` to return `session_id/amount/currency/kind/customer` (else pooled gifts can't be reconciled). Stripe Connect (payouts) is a config of the existing account, not a new vendor. **THIN — the rules of who-edits-what / invite-approval / multi-organizer caps / conflict handling are unspecified (owner call).**

## 6.5 Social / viral (named, thin)
Named twice as significant ("don't forget about the social media aspect"); "plugin in hand, experiment later." **Built:** share-sheet (copy link + `navigator.share` + X/FB/WhatsApp/iMessage/mailto intents + Resend email / Twilio SMS when keyed) + **`next/og` themed unfurl** (the deterministic spine renders it). **Later (Phase C):** Pinterest/IG/TikTok outbound, generated reels (Sora2/Veo — open question), Conversions API/ad pixel. **Viral growth loop (later):** recipient → account → sends own page → credits/discounts — **reserve `referredByPeekId`/`referrerUserId` + a `referral` event now** (the attribution chain can't be reconstructed later). Social login = a Clerk OAuth config flip (no code seam). **THIN — share-to-social specifics / discovery / virality / referral mechanics undefined (owner call).**

## 6.6 Tiers + fulfillment (v1 = Studio only, decided)
**Fulfillment tiers (distinct from usage-cost tiers):** **Studio** = self-serve, Creator fulfills (= v1 = "Tier 1"; nominal flat fee, the product notifies the Creator) · **Concierge** (later) = peek.gift orders/ships from retailers (captures affiliate + markup) · **Atelier** (later) = peek.gift assembles a physical package + ships. **v1 = Studio only — decided.** Higher tiers are the bridge to PerfectPurchase. **Seams:** add a stubbed **`ports.fulfillment`** (Studio adapter = notify-and-mark-manual) so the publish→pick→notify loop never reshapes; make fulfillment-tier a property the publish path reads (`peek.fulfillmentTier` default `"studio"`); keep `amount_cents`/`priceRef` open for tier pricing; the widened `createCheckout` already carries `billingAddress` for shipping capture; keep `relationships` + `nudge-relationships` for repeat-occasion monetization. **Pricing experiments (later):** A/B $12 vs $9 vs $15 via PostHog flag → `STRIPE_PRICE_ID` per cohort. One flat fee, no subscription.

## 6.7 The consolidated "expose now" seam ledger (cheap-now / expensive-later first)
1. **`actorId` on every Command/Event** — collaboration unbuildable later without it; not backfillable.
2. **`payment.verifyWebhook` widened** (`session_id, amount_cents, currency, kind, customer?, metadata?`) — pooled contributions + tier pricing can't reconcile otherwise.
3. **`payment.createCheckout` widened** (all-optional: `currency, priceRef, customer, locale, billingAddress, promotionCode, contribution{}, metadata, idempotencyKey`).
4. **`ports.fulfillment` (new, stubbed)** — the single most important new socket.
5. **`referredByPeekId`/`referrerUserId` + `referral` event** — viral loop attribution; not backfillable.
6. **Keep logging occasion-tagged pick/convert** — the compounding ranker + aesthetic moat train on it; not backfillable.
7. **`cardResolver` order stays DATA** — catalog-primary flip is config, not a rewrite.
8. **Multimodal embeddings only** when picked (photo-of-room/CLIP needs image vectors).
9. **config-swap proof = regression gate** for gift + water on every renderer change.
10. **Functional slot naming** (`story/productSet/cta`), never gift-specific.

---

# 7. DECISIONS, BUGS, HARD-RULES

## 7.1 Settled decisions (do not re-litigate)
- **The model IS the resolver. No mandatory deterministic design engine.** (The single most load-bearing call; the parametric engine is fenced/rejected.)
- **Overbuild the contract, build lean behind it** — `packages/core` framework-agnostic (a lint rule **fails the build** on a framework import); ports + stubs are the frozen spine; the chat stays loose.
- **Tech stack (decided):** Turborepo + pnpm, TS strict · `packages/core` durable asset · event-sourced maker-checker (Zod Commands → Events → state, neverthrow) · pure `render(document,theme)` · Next.js App Router + PWA, `next/og` unfurl · **runtime CSS-variable design tokens (`--peek-*`), NEVER Tailwind** (CI fails on Tailwind classNames) · tRPC, Anthropic server-side only · Supabase + Drizzle + pgvector · Yjs only when co-editing is real · full Anthropic surface, services as MCP tools, Braintrust evals · Expo later. **Explicitly CUT: Effect, Zero/Rocicorp** (the two tail-spin bets).
- **DQ resolutions:** `--peek-*` namespace · enrich ThemeSpec · add `details`+`gallery` section kinds, promote only `countdown`+`claim` to first-class (wild moves stay model-authored `custom`) · `value_display?` for ranges · card vocab = contract wins (4 enum) · fonts = arbitrary Google families, `FONT_SPECS` is a pantry NOT a gate · one renderer two surfaces, reveal as `page_type` · **safeword = `bananahead`** (ships as `PEEK_SAFEWORD` config, default `process.env.PEEK_SAFEWORD ?? "bananahead"`, never inline) · **Opus 4.8 + streaming + prompt-caching** as the resolver (a cheap model behind `LLMPort` for non-creative ops) · cascade order `retailer_api → url_scrape → research`.
- **v1 = Studio (self-serve) only; NO embedded checkout** ("later full-custom build; `/api/publish`+webhook are harmless backend"); **build LIVE, no mock.**
- **Evolutions to know:** safeword `gabagool`→`bananahead`; affiliates named-core→demoted; mic "standard input"→backburnered "atrocious"; default model `claude-opus-4-7`→`sonnet-4-6` on atelier vs Opus-4.8 on the studio/zip line (verify the actual constant — Opus-default is a COGS risk).

## 7.2 The open bug ledger (carry-forward; atelier-era unless noted)
- **The meta-bug:** `picks=0`, `webhook_log=0` → **the create→publish→pick→notify loop has NEVER run end-to-end.** Getting one real run green is THE milestone.
- **Live BLOCKs:** `/build` GET 500 unauthenticated (anon funnel unreachable, INFRA-1) · `/g/[slug]` recipient view 500 ("the cinematic reveal is the gift moment; without it the product can't ship", INFRA-2) · `B15` Stripe idempotency **fails OPEN** (retry storm → dupe emails/analytics) · `B16` mark-ready has no state-machine/precondition check (re-surfaces paywall on a published peek) · `B18` PostHog proxy strips IP/cookies (kills ad-attribution).
- **Open MAJORs:** `M15` full Stripe+Clerk PII (email/billing) in `webhook_log` plaintext forever (compliance landmine) · `M13` Browserbase endpoint 404s (paying for unused sessions) · `M14` Skimlinks webhook signature guessed (first revenue webhook likely 401s) · `INFRA-3` anon compute cap **$0.05/24h ≈ one turn** (cripples the trial; **violates Frank's "never set arbitrary caps without usage data"**) · `INFRA-6` raw Anthropic 400 dumped into chat bubble then bounce to /sign-up.
- **The recurring pattern (not a one-off):** position-race / JSONB read-modify-write (`B13`/`M24`/`C08`) — any parallel `tool_use` in one assistant turn breaks read-modify-write.
- **Studio-line risks (clean-slate):** `/api/curator` has **no auth/rate-limit/botGate** ("open chat = open wallet" the instant a key deploys); **Clerk fails OPEN** (missing key → every route public); **caps not passed to `decidePick`** → server budget enforcement is dead code; the **trimmed backend** (no rules/moderation/rate-limit/origin/idempotency) must be ported.
- **Degraded services:** ZenRows scrape (8/11 failing) · fal `image_url:null` (claimed fixed on studio-vnext) · Sentry captures nothing (no DSN).
- **`custom`-block HTML is the product's main XSS surface** — "the entire XSS posture rests on `sanitizeCustomHtml`/`sanitizeCssVars`." Pin DOMPurify; an XSS/exfil test corpus; **serve untrusted model HTML from an isolated origin** (sandbox subdomain or iframe without `allow-same-origin`) — a sanitizer miss must not reach Clerk/Stripe cookies. (DOMPurify does NOT sanitize CSS — need a real CSS sanitizer: url() host-allowlist, strip `@import`, neutralize full-viewport overlays; + CSP; + SSRF-guard on `url_scrape`.)

## 7.3 Frank's working rules (the operating contract — overrides defaults)
- **The owner's live word OUTRANKS any doc/code.** Existing code/comments/notes are residue from prior failed attempts — reference, never authority. Surface conflicts; don't silently follow code.
- **Plan TOP-DOWN, always** (his #1 complaint: chats "frantically do random work in one turn" — plan → decompose → build).
- **No skeletons, no lorem, no `// TODO: implement`** — a signature ≠ an implementation; build for the **END STATE, ground-up, no MVP** (audits found files 60% comments / 3200+ junk lines). **No code comments** (justify any in the commit message).
- **PROVE, don't claim** — "done" = a passing test, a 200, a real deploy, or a screenshot. **Every task ends in a GATE; a gate that can't pass is a STOP** — don't proceed, don't edit the gate, report and wait. (The gate philosophy: a model can't reliably tell its justified positions from its stubborn ones, so fence it with artifacts.)
- **No Tailwind** (runtime CSS-var theming demands it).
- **Avoid the word "always" in instruction docs** ("a disaster — chats prioritize mds/code over your live chat"). (The docs themselves violate this; intent = avoid absolute directives.)
- **No flattery / banned phrases:** never "you're right / good catch / great point/question / I apologize / sorry for the confusion / absolutely / of course / definitely / I completely understand"; never "locked / fixed / final / done / perfect." Terse; own a mistake in one short sentence and move on. (Caught past sessions 5+ times.)
- **Cost discipline:** **batch deploys** (he pays per Netlify build + per token he reads — spawn parallel subs → merge → typecheck+build → ONE push; exception: a security fix burning money). **Minimal chat, maximum subagents** (subagent tokens don't burn his Max plan; "go work / keep cranking" = dispatch, don't ask). **Never set arbitrary cost/rate/turn caps without real usage data.** **Drop to Sonnet for non-creative ops** (Sonnet/Haiku do vision/screenshot/camera extraction + classification — "don't burn Opus to read a price tag"); Opus 4.8 is the artist, day one.
- **Don't mommy him about keys** — keys are his, in Netlify env; he is FURIOUS about key hand-wringing; never lecture about secrets. Never echo secret values (the system wipes agents for it). He obfuscates secrets piecewise to dodge GitHub scanning.
- **Claude does all live-prod work via connectors** (commits/pushes/deploys/cutover); **Frank touches nothing live** and **doesn't read git** — he reviews via screenshot, on mobile (spawn a Playwright sub; headless screenshots show fallback fonts — don't chase font screenshots).
- **Never touch the legacy `peek.gift` apex or `glacialsips.com`** (shared Stripe/Clerk/Supabase accounts).
- **The cure for the disease:** "Don't restart. The disease was ~50 non-compounding tries; the cure is one held line. Each session must ADD, not reset."

---

# 8. OPEN CALLS TO RATIFY (the genuine forks — need the owner)

**These are the unresolved decisions the build plan cannot be written without.**

1. **PAGE MODEL — freeform-HTML + spine vs structured-IR.** (*The #1 call.*) The deployed code, the newest plan (`IN-SITE-CHAT-MASTER-PLAN.md`), and the owner's newest zip all use **freeform-HTML authoring with a derived structured spine (Dual Representation)** — which **reverses three settled docs** (`JUMPOFF.md`, `DESIGN_PROJECT_BRIEF §5`, `BUILD_BRIEF §3`) that say "never raw HTML; emit structured IR." All five workstreams independently converged on dual-rep; the structured-IR renderer (gallant-planck, which fixed all four renderer gaps) was abandoned. **Ratify: is freeform+spine canon, with the IR/maker-checker demoted to (a) typed fallback when HTML is absent/corrupt and (b) the `next/og` surface?**

2. **BUILD BRANCH.** Build off **`clean-slate`** (newest/cleanest freeform line — but trimmed backend must be ported) vs **`studio-integration`/`studio-vnext`** (the deployed-ish line) vs **`atelier-integration`** (the only live-verified, most-built, but older structured-IR family) vs **milk the legacy Vite first**. Tracks call #1: the freeform engine lives on the clean-slate line, not atelier. **Also: confirm what commit is actually serving `vnext.peek.gift` right now** (the last deploy may be stuck/pre-fix; Netlify connector was flaky) before committing to a base.

3. **CHECKOUT FLAVOR.** Target = an **embedded Stripe Checkout Session** with full i18n (`adaptive_pricing`/`automatic_tax`/`tax_id_collection`/Address-Element-with-Google-Places/`allow_promotion_codes`) — *don't build a custom currency/tax/coupon layer, Stripe owns it.* But the as-built salvage is a **custom PaymentIntent + Payment Element, single-currency USD, no adaptive/tax on the publish fee** (coupons fully custom + complete). **Reconcile: full-i18n Checkout Session vs the as-built single-currency Payment Element** — and confirm Stripe live-readiness end-to-end (charges-enabled, Tax actually activated, the webhook route `/api/stripe/webhook` slash-path matches the registered endpoint).

4. **THE THIN AREAS (scaffolds waiting on the owner's product rules):**
   - **Collaboration** — who-can-edit-what, invite/approval flow, multi-organizer caps, conflict handling, hero-lock flexibility. (Schema exists; rules don't.)
   - **Social** — share-to-social specifics, social login, discovery/virality, referral mechanics, reels (Sora2/Veo) timing.
   - **Ops / Netlify** ("the section you could add 100 more to") — context-scoped env-var conventions, deploy/branch/preview workflow, edge-vs-serverless boundaries, build/cache/redirects/headers/CSP, the domain/DNS cutover sequence, registered webhook endpoints.

**Smaller forks to settle in-plan (not owner-blocking but unowned):** the single `data-kind`→`CardType` **mapping table** (3 vocabularies, not yet written) · `linkStyle` default per theme (threaded vs separate) · the item-aware cap-default **formula** · the anonymous-metering threshold (currently ~5 turns / the broken $0.05 cap) · which `Presentation.runtime_version` unifies the two divergent runtimes · where the **legacy revenue repo** lives (needed to cut over without killing the $12 trickle).

---

*End of 00-CORPUS. The floor is documented so it can be exceeded. Every claim carries its source; every fork the owner must call is in §8.*
