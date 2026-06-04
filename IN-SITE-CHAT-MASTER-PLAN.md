# peek.gift — IN-SITE CHAT: MASTER PLAN

_Consolidated from five parallel deep-dive workstreams (architecture, chat-brain, end-to-end loop, runtime+security, eval+PerfectPurchase), all verified against the live code on `claude/studio-integration`. This is the canonical plan to stand the curator chat up to the overbuilt/futureproof standard. Future sessions read this first — it supersedes scattered notes, and it exists specifically to end the "~50 non-compounding restarts" pattern._

---

## 0. TL;DR — the decision and the shape

- **The chat's design *voice* is already right.** The live system prompt is a faithful implementation of your `peek-gift-SKILL.md` (throw out the noun → build one concrete OBJECT → obey it; one signature motion built by hand; the hard bans). The gap is not the voice. The gap is **everything around the voice.**

- **Current reality:** a **caliber-strong front-half** (the model authors a bespoke freeform-HTML page live in an iframe) bolted onto a **back-half that was built for the OLD structured-IR architecture and is now disconnected.** Net effect: a curator can build something beautiful that **cannot be saved, published, or received by a recipient.** The full create→publish→pick→notify loop **has never completed once** (the picks table is empty).

- **The one architectural decision (yours to bless):** **DUAL REPRESENTATION.** The model authors the gorgeous freeform HTML (your mockup caliber) **and** a structured spine (cards / rules / concept / theme) is kept in lockstep for commerce, recipient state, and the PerfectPurchase product graph. They join on a stable card id. The recipient is served the HTML; picks/checkout/graph read the spine. **This reverses a settled doc rule ("never raw HTML"), which is why it needs your explicit blessing** — but all five workstreams independently converged on it, and your own `el-taquito` fixture already proves it's the latent reality.

- **Security has real launch-blockers** (the public page renders model HTML same-origin with no sanitizer; the paid chat endpoint is open and unauthenticated). These gate any keyed public deploy — not the building, but the going-live.

- **The moat is two compounding flywheels** we can seed now with cheap seams: a **taste loop** (your keep/reject verdicts compile into the prompt) and a **product graph** (every card the chat resolves becomes structured catalog data). Both ride one substrate.

---

## 1. WHERE THE IN-SITE CHAT ACTUALLY IS (the de-fog)

The repo is **mid-pivot**, and that's the source of the fog. Concretely:

**The voice / prompt (good).** `apps/web/lib/curator/system-prompt.ts` is the freeform-HTML "brain" — JUMPOFF/SKILL distilled well. Tools: `set_page` / `edit_region` / `set_style` / `set_media` / `resolve_card` / `generate_hero_image` / `publish` (`tools.ts`). Streaming Opus 4.8 loop, adaptive thinking, 12 hops (`turn.ts`).

**The freeform-HTML pivot is built but NOT deployed.** Four recent commits (`step 1→3b`) swapped the brain from IR-authoring to freeform-HTML + a `data-peek-*` tagging contract + a fixed host runtime (`peek-runtime.js`) + an iframe preview. The **deployed** site (`studio-vnext @ 47fb836`) is still the *older IR renderer*; the freeform engine lives on the work branch (`studio-integration @ 5f63907`), unshipped and unverified. So "the current live page is based on IR" is true of what's deployed; the freeform answer you want is already written but not live.

**The back-half is fully built — and producerless.** The IR pipeline (`store.ts` → `peek_documents`, `publish/route.ts`, `stripe/webhook`, `pick/route.ts` → `decidePick`, `recipient-view.tsx` → `render(doc)`) is complete and tested (53 core tests green) — but **nothing writes a row**:
  - `/api/curator` streams page ops to the iframe and **persists nothing** (its own comment admits "persistence happens at publish," but that path was never built).
  - `studio/page.tsx` has **no save, no serialize, no publish handler** — the `publish` tool fires a `ready` event the client doesn't listen for.
  - `/api/publish` loads a draft that nothing creates → it **always 404s**.
  - `/g/[slug]` renders the **IR** via `render(doc)`, **not** the model's HTML, and `peek-runtime.js` is never injected there → the recipient would never see the designed page.
  - `/api/pick` calls `decidePick` **without passing caps** → server-side budget/tab enforcement is **dead code**.
  - **No curator notification** anywhere in `apps/web`; **no `next/og`** unfurl.

**The structured product data is thrown away.** `resolve_card` resolves real product data (title/price/image/retailer/GTIN-able), hands it to the model to bake into prose, and **logs nothing.** Today, every resolution evaporates.

**Security holes (verified).** The public recipient path renders model HTML via `dangerouslySetInnerHTML` with **no sanitizer** (the code comment claiming it's sanitized is false); there is **zero CSS sanitization** anywhere (CSS `url()`/`@import` exfiltration + full-screen phishing overlays are open); **no CSP / security headers** exist; `apps/web` has **no middleware at all**, so `/api/curator` (a paid Opus loop) is fully public and un-rate-limited; `url_scrape` has no SSRF guard; image moderation is off.

That's the whole picture: **the hard, special part (caliber from one sloppy line) is essentially working; the ordinary parts (save it, publish it, deliver it, secure it) are missing or disconnected.**

---

## 2. THE ARCHITECTURE DECISION — Dual Representation

### The fork
- **(a) Pure freeform HTML** (finish the new path, store an HTML blob, serve it): hits caliber, but the source of truth is an un-queryable blob → kills versioning/undo, makes recipient picks forgeable, and **deletes the structured data PerfectPurchase is built on.** Disqualifying for your big plans.
- **(b) Revert to IR authoring** (model emits commands, one React renderer): keeps structure, but **caps caliber at the renderer's fixed archetypes** — the exact ceiling the pivot happened to escape. Violates "generic is the only failure."
- **(c) Dual representation** (recommended): the model authors freeform HTML for caliber **and** a structured PeekIR spine is kept in lockstep for commerce/state/graph. Gets *both*.

### The proof it's right (from your own repo)
The `el-taquito.ir.json` fixture — the IR encoding of a top mockup — already contains **2 `custom` HTML blocks and 0 structured cards**: to reach caliber, the IR path *already* degenerates into raw HTML and **silently empties its own commerce spine**. Dual representation isn't a new bet; it's making the thing the code is already doing **coherent and lockstep** instead of accidental and lossy.

### The design
- **One envelope, two representations.** A `PeekDocument` = `{ spine: PeekIR, presentation: { html, html_hash, runtime_version } }`. The existing `PeekIR` (peek, cards, variant_groups, concept, theme) is **unchanged** — it stays the commerce/state truth. `presentation.html` is the canonical *look*.
- **One id space.** The model emits an explicit `data-peek-id` on every tagged card; that id **equals** the spine's `card.id`. This single contract is what lets the HTML page and the structured rules join — it's how a recipient's tap on a beautiful card validates against the server-side pick engine.
- **The spine is derived, then reconciled.** Each turn, the server parses the `data-peek-*` tags out of the authored HTML into a partial spine, and reconciles it against a lightweight structured manifest the model also emits (so a card that's in the HTML but missing from commerce data is a *caught error*, not silent corruption). The reconciled spine is folded through the existing `decide`/`apply` maker-checker, so **commerce stays event-sourced** even though presentation is a blob.
- **What survives:** full event-sourcing/undo/replay on the commerce spine (the part that matters for the product graph); snapshot-per-publish versioning on the HTML (the right granularity for cosmetics).
- **The IR renderer is kept, demoted** to (1) a typed fallback when HTML is absent/corrupt and (2) the deterministic `next/og` share-card surface (you can't reliably screenshot arbitrary model HTML server-side; you can deterministically render the spine). Do **not** delete it — it's 53 tests of proven safety net.

### The flag
This contradicts three settled docs (`JUMPOFF.md`, `DESIGN_PROJECT_BRIEF.md §5`, `BUILD_BRIEF §3`: "emit structured data, never raw HTML"). The pivot already broke that rule to chase caliber. **Dual representation is the reconciliation — but it needs to become the new written canon (and your blessing), or the next session re-litigates or re-reverts it.**

---

## 3. THE CHAT BRAIN — reliably hitting mockup caliber

The voice is right; reliability is the gap. The **#1 finding: the design pantry is injected nowhere.** The prompt tells the model "vary the display font every page, steal the genre's codes" but hands it **no vocabulary** — so under load it regresses to its priors (Playfair/Inter/Montserrat) = generic = the one failure. Your `DESIGN_ENGINE_TOOLKIT.md` (211-font taxonomy with "pairs-with," the type-art CSS library, 20 palettes, 10 worlds, motion/scenes/motifs/frames) is exactly the missing raw material, and `BUILD_BRIEF §6` explicitly says "feed it as cached context — the biggest quality-per-effort lever."

**The fix (all byte-stable, prompt-cached — cheap after the first call):**
1. **Restructure the system prompt into 4 cached blocks** (`cache_control: ephemeral` on each): **(1) the method** (current voice + a new mobile-canvas cue + an expanded concept→motion seed table), **(2) the pantry** (reframed `DESIGN_ENGINE_TOOLKIT` §1–§9, with the rejected resolver/§10 and the "emit IR" lines stripped, header recast as "raw material you draw from, never limited to"), **(3) one full few-shot exemplar** (the "For the Old Man" work-order — your own "dad's 60th/mower" answer — upgraded with `data-peek-*` tags; framed "the bar and the shape, not a template"), **(4) the contract** (tools + the `data-peek-*` spec + the self-critique gate).
2. **Add an explicit "what the page can't contain" section** — `<script>`, `<form>`, `<input>` are stripped by the sanitizer; all behavior (RSVP, claim, tab, countdown, locks) comes from `data-peek-*` tags + the host runtime. Without this, the model authors a working form in good faith and it silently vanishes → a broken-looking page.
3. **Add a concept→motion seed table** so the one bespoke `@keyframes` signature reliably appears (disco→spin a vinyl; launch→orbit rings + a marching dashed line; rave→scroll a grid-floor; zine→wiggle letters; omakase→stillness). The mockups prove the mapping is learnable; seed it.
4. **A 10-axis self-critique gate that runs in the model's *thinking*** (free, invisible, no added latency): before the first `set_page`, name the OBJECT and grade against DESIGN_DIRECTOR's 10 axes; a zero on any of {concept, bold move, type, specificity, slop} or a low total ⇒ one surgical patch before showing. Cap at one self-patch so the live-build feel holds.
5. **`peek-gift-SKILL.md` folds into block (1)** as the method's canonical source; reserve a marked anchor so the merge is mechanical and only re-caches that one block.

Net: from "great method, generic risk" → "reliably screenshot-worthy," at near-zero marginal cost per turn.

---

## 4. THE END-TO-END LOOP — closing the back-half

The terminal goal is the create→publish→pick→notify run **that has never once completed.** Ordered:

1. **Envelope the document** (`PeekDocument` = spine + presentation) with v1→v2 back-compat; keep the 53 tests green.
2. **HTML→spine extraction parser** (pure, in core): map `data-peek-*` → `Card`/`VariantGroup`/caps (a single shared `data-kind`→`CardType` table so docs/runtime/parser never drift). Reconcile against the model's manifest; block publish on hard issues (a priced tab with an unpriced card).
3. **Autosave every turn** (kills the write-orphan): the server holds the authoritative HTML, extracts the spine, persists `{html, doc, html_hash}` to `peek_documents` (+ a `peek_document_revisions` snapshot on publish). Anonymous drafts allowed (no auth wall on authoring); identity captured at the $12 step.
4. **Publish reachability:** studio handles the `ready` event → `/api/publish` (now finds the draft) → embedded $12 Checkout → webhook `markPeekPublished` flips status, freezes a revision, writes `curator_email` from Stripe, fires the "your page is live" email.
5. **Recipient serves the real authored page:** rewrite `/g/[slug]` to SSR the stored HTML + inject `peek-runtime.js` in `mode:"recipient"`; wire its pick/claim actions to `/api/pick`, which validates **against the spine** (`decidePick`) — **now passing caps** so hard-cap blocks and soft-cap warns server-side. Add `generateMetadata` + a `next/og` share card (themed from the spine).
6. **Notify:** port Resend into `apps/web`; "they opened it and picked X" to the curator (debounced).
7. **Terminal gate:** one real run — build in `/studio` → publish ($12 test card) → open the unfurled `/g/<slug>` on a phone → pick within the tab (rules enforced) → curator emailed → a non-empty picks row. This is the milestone.

---

## 5. SECURITY — the launch-blockers (gate the public deploy, not the build)

The headline risk is **not** the sandboxed preview — it's that the **public recipient page renders model HTML same-origin with no sanitizer and no CSP**, while the **paid `/api/curator` endpoint is open and unauthenticated** (no middleware in `apps/web`).

- **P0 (before any keyed public deploy):** (1) actually sanitize the recipient HTML path; (2) **serve untrusted model HTML from an isolated origin** (a `*.peekusercontent`-style sandbox subdomain) or at minimum an iframe **without `allow-same-origin`**, so a sanitizer miss can't reach Clerk/Stripe cookies; (3) drop `allow-same-origin` from the studio preview iframe; (4) gate `/api/curator` with **Turnstile + auth + Upstash rate-limit** (Upstash is already keyed).
- **P1:** add a real **CSS sanitizer** (url() host-allowlist, strip `@import`, neutralize full-viewport overlays — DOMPurify does *not* sanitize CSS); add a **CSP** (img/font/connect allowlists are the browser-level backstop for CSS exfil); **SSRF-guard `url_scrape`** (block link-local/metadata/localhost); wire **image moderation** on upload + generation + publish (flip `enable_safety_checker:true`); pin DOMPurify + add a sanitizer XSS/exfil test corpus.

Principle: **untrusted LLM HTML must never execute same-origin with your users' session.**

---

## 6. THE MOAT — eval gate + taste loop + PerfectPurchase seams

**Aesthetic eval ("valid but ugly loses").** Two judges: (A) a **deterministic lint floor** encoding the JUMPOFF hard-bans + the OKLCH-AA invariants (catches purple→pink gradients, default sans, uniform card grids, rainbow palettes — cheap, runs every turn); (B) a **vision judge** (Claude screenshots the rendered phone page and grades the 10 axes; gate-zeros on concept/bold-move/type/specificity/slop are fatal). **Inline = lint + the model's own thinking-time self-grade only** (no vision round-trip — it would freeze the live build); **vision judge runs offline in a CI gate** over a golden set (your mockups as the bar). Render-to-screenshot must wait for webfonts (`document.fonts.ready`) or it grades fallback fonts and fails everything.

**The taste loop (the compounding moat — your explicit next step).** A `commit_concept` tool makes the model commit the OBJECT *before* authoring; the UI shows it as a one-tap **Keep / "Too safe — again"** card; verdicts land in a `taste_verdicts` table; the rejected→kept *pairs* compile into a **second cached prompt suffix** ("rejected: «too-safe» → kept instead: «the bolder one»"). This turns "explain my taste" (which failed for months as prose mush) into "react," and your "no"s become the spec — improving the floor on every build, even while you sleep.

**The PerfectPurchase seams to add NOW (cheap; prevents re-architecture later):**
1. **Log every `resolve_card` result** as an append-only structured row (today it's discarded). *This is the single highest-leverage line in the plan* — the catalog bootstraps itself from real usage.
2. **Pull GTIN/identifiers** in the scraper (they're already in the JSON-LD it parses) — the dedupe key for the product-vs-offer graph.
3. **Reserve `CatalogPort` + a multimodal `EmbeddingPort`** in the ports registry (stubbed until keyed) so Ch 5 is an adapter swap, and you don't get trapped on text-only embeddings.
4. **Enrich picks** to reference products + occasion — the training signal for the per-category compounding ranker.

Taste and catalog share one pgvector substrate. Two flywheels, one foundation.

---

## 7. THE BUILD SEQUENCE (phased, each phase ends in a verifiable gate)

- **Phase 0 — Decisions & ground (no risk):** bless dual-rep; pick the build branch; write the dual-rep contract into canon (WAKEUP/BRIEF) so it stops getting re-litigated. **Gate:** this doc + a one-paragraph canon update committed.
- **Phase 1 — Chat brain (pure caliber win, independent of everything else):** pantry + few-shot + concept→motion table + "can't contain" section + the thinking-gate; restructure into 4 cached blocks; fold in SKILL. **Gate:** cold-run 5 golden briefs → 5 unrelated display fonts + 1 bespoke signature animation each; no default-sans, no purple→pink. *Shippable on its own — improves the deployed studio immediately.*
- **Phase 2 — Dual-rep spine + autosave (kills the write-orphan):** the `PeekDocument` envelope, the extraction parser + reconciliation, persist every turn. **Gate:** a studio turn writes a `peek_documents` row with both a populated spine and the HTML.
- **Phase 3 — The loop:** publish reachability + recipient serves HTML + server-validated picks with caps + notify + og. **Gate:** the terminal create→publish→pick→notify run.
- **Phase 4 — Security hardening:** sanitize recipient path + off-origin sandbox + CSP + curator-endpoint gating + CSS sanitizer + SSRF + moderation. **Gate:** the XSS/exfil corpus is blocked; the open-endpoint is closed; *this is the gate to a public keyed deploy.*
- **Phase 5 — Eval + taste loop:** lint floor + CI vision gate + `commit_concept`/keep-again + the corpus suffix. **Gate:** a deliberately-degraded prompt fails CI; the baseline passes; a reject deposits a verdict that changes the next concept.
- **Phase 6 — PerfectPurchase seams:** the resolve-card log, GTIN capture, the port stubs, enriched picks. **Gate:** every resolved card persists a structured row; the ports compile.

Phases 1 and 2 can run in parallel (different surfaces). Phase 4 must precede any public keyed launch.

---

## 8. DECISIONS I NEED FROM YOU

1. **Bless dual representation** as the architecture (it reverses the settled "never raw HTML" rule; all evidence supports it). *Strong recommendation: yes.*
2. **Where I build:** a new branch off `studio-integration` (the live, deployed line — so the work reaches `vnext.peek.gift`). You originally pinned me to `claude/wizardly-mendel-b643n`, which is the *old* root app with no `apps/web` — I can't build the chat there without first hauling the whole studio line onto it. I need your OK to branch off `studio-integration`.

Everything else I'll resolve and drive. Security launch-blockers are flagged but don't block building — only the public go-live.

---

## 9. RISKS / OPEN QUESTIONS

- **Manifest↔HTML drift** — mitigated by per-turn reconcile-and-retry (a caught error, not silent corruption); costs a turn occasionally.
- **Serving model HTML to third parties** is the biggest standing exposure even sandboxed — image moderation + CSP + off-origin isolation are launch-blockers, confirmed appetite needed.
- **Budget/tab server enforcement** depends on the model reliably emitting `data-budget` + per-card prices; the eval gate must assert "every tagged card has a structured price."
- **PerfectPurchase delivers only if the spine is *populated*, not just present** (the el-taquito `cards:[]` cautionary tale) — the eval gate enforces "every visible card is tagged + has a manifest entry."
- **Headless screenshots miss webfonts** — the eval must wait on `fonts.ready` and preinstall the font allow-list, or it grades fallbacks.

---

_Source: five workstream reports (architecture / chat-brain / loop / security / eval+PerfectPurchase), each with file:line citations, available on request. This plan is the distilled, sequenced synthesis._
