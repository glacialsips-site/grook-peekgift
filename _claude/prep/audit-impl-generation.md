# Implementation Audit — Generation Path (peek.gift curator)

Scope: line-by-line, pre-first-deploy. READ-ONLY review. Files under `apps/web/`:
`app/api/curator/route.ts`, `lib/curator/{turn,prompt,system-prompt,pantry,exemplar,tools,page-html,draft,extract}.ts`,
`lib/sanitize.ts`, plus the things the generation path actually touches at runtime
(`app/studio/page.tsx`, `lib/ports/{card-resolver,image}.ts`, `lib/persistence/store.ts`, `public/peek-runtime.js`).

Verdict legend: **KEEP** (solid) / **FIX** (listed) / **REWRITE-CLEAN** (faster+safer to rebuild than patch).

LLM mechanics were checked against the claude-api skill: `claude-opus-4-8` is a valid current model id,
`thinking:{type:"adaptive"}` is the correct (and only) on-mode, `temperature`/`top_p`/`budget_tokens` would 400,
and `client.messages.stream()` + `.finalMessage()` is the sanctioned streaming pattern. Those are all correct here.

---

## TOP 5 ISSUES (most likely to break or embarrass on day one)

1. **`currentHtml` does NOT round-trip cleanly — the runtime's injected DOM + toggled state is fed back to the model as if the model authored it.** (`app/studio/page.tsx:194-202`, `public/peek-runtime.js:114-170`)
2. **The seat prompt that ships (`system-prompt.ts`) is materially weaker than the deployed SEAT zip** — it is missing the entire "widen the object / paper-artifact is the new generic" doctrine, the "make it MOVE" non-negotiable, the base64/`data:` ban, the `data-peek-img` slot contract, and the "name legible, never under the motion" rule. (`system-prompt.ts` vs `seat.ts`)
3. **`set_style` / `edit_region` / `set_media` outputs bypass the sanitizer entirely** — only `set_page` and `edit_region` HTML go through `sanitizeHtml`; `set_style` CSS is injected raw both server-side (`page-html.ts:36`) and client-side (`studio/page.tsx:105-113`), so the CSS `@import`/`expression()` scrubbing never runs on a `set_style`. (`turn.ts:94-99`)
4. **SSE keepalive comment frames can corrupt the very first real event under TextDecoder chunk-splitting, and the client never parses comment lines — but worse, the client splits on `\n\n` and silently drops any `data:` payload that itself contains a blank line** (JSON.stringify won't, but multi-byte UTF-8 split across reads will throw away a frame). The keepalive itself is fine; the fragility is in the client parser contract. (`route.ts:60-64`, `studio/page.tsx:229-240`)
5. **Save-on-every-turn writes a draft document built from the *post-strip* `currentHtml` even when the model only streamed text and made no page change** — and it persists with `status` unset/empty from `emptyPeekDocument`, plus `extractSpine` runs on every turn regardless of whether cards changed, silently swallowing all extraction issues. (`route.ts:82-95`, `draft.ts:20-47`)

Punch-list item count (ordered list at bottom): **17.**

---

## PER-COMPONENT VERDICTS

### `app/api/curator/route.ts` — **FIX**

What's sound: the new SSE keepalive (`: warming up` + `: ping` every 15s) is correctly framed as SSE comments (`:`-prefixed, blank-line-terminated) and is guarded by the `closed` flag; the `try/catch` around `controller.enqueue` flips `closed` so a disconnected client won't throw on every tick. `maxDuration = 120` < the 15s ping interval is fine. The `firstUser`/slice guard is reasonable. This compiles and the keepalive is real, not cosmetic. But:

- **`route.ts:47` — dead/garbled guard.** `if (messages.length === 0 || firstUser === -1)` runs *after* `if (firstUser > 0) messages = messages.slice(firstUser)`. If `firstUser === -1`, the slice was skipped, `messages` keeps its original length, so the `=== 0` check is redundant and the `firstUser === -1` check is doing all the work — but `messages.length === 0` is evaluated against the *original* array (which could be non-empty but all-assistant). Net effect is correct by luck, but the condition is confusing and should be `if (firstUser === -1) return 400`. Minor, not fatal.
- **`route.ts:61-64` — `setInterval` is never cleared on the error path inside `start()`.** It *is* cleared at `route.ts:96` after the work block, and the work block is wrapped so it can't throw out (the inner `runCuratorTurnStreaming` swallows its own errors and `runSafewordReport` too). But the **save block (82-95) is only wrapped in a bare `try{}catch{}` that does nothing** — if `loadDocumentById` / `savePeekDocument` reject, it's caught and dropped, so `clearInterval` is still reached. OK in practice, but the empty catch (94) **silently eats persistence failures** — a save that never lands looks identical to a successful one to the operator. No log, no `error` event. This will mask the first real Supabase outage.
- **`route.ts:82` — save fires on EVERY non-safeword turn that has any `currentHtml`,** including turns where the model only emitted `text` deltas and never touched the page (e.g. answering "who's it for?"). `currentHtml` is seeded from `body.currentHtml` (59) and only mutated by page/patch/style/media ops (66-68). So if the client posts back the existing page and the model just chats, you re-extract the spine and re-upsert an identical doc every turn. Wasteful, and it bumps `updated_at` with no change. Gate the save on "did any page op actually emit this turn."
- **`route.ts:51` — safeword default `"bananahead"` is hardcoded as the fallback.** If `PEEK_SAFEWORD` is unset in prod, the literal `bananahead` ships as a live founder backdoor that drops persona and dumps internal reasoning to any user who types it. The system prompt explicitly says the word is "configured out-of-band, never written here" — but here it is, in the source. Set the env var in prod and consider failing closed (no safeword) if unset.
- **`route.ts:80` — error events are emitted but the stream still proceeds to the save block.** If `runCuratorTurnStreaming` threw before any valid page existed, `currentHtml` may be partial/garbage from a half-applied op, and you'll persist it. Low probability (ops are applied per-complete-event) but worth a guard.

### `lib/curator/turn.ts` — **FIX**

The just-edited `currentHtml` feedback is the headline concern.

- **`turn.ts:35-46` — prompt-bloat / cache-busting from the live page.** The whole current page is appended as a system block on *every* hop and *every* turn. Two problems:
  - It's **not** marked `cache_control`, and it's appended *after* the four cached blocks from `buildCuratorSystem()` (prompt.ts:23). Per the caching rules, appending a new uncached system block after the cached prefix is fine for the *prefix* cache — but the live-page block itself is re-sent in full every turn and re-tokenized every turn (it changes every turn), so on a multi-card page that's tens of KB of HTML re-billed at full input price each turn. On a long edit session this dominates token cost. Acceptable functionally; expensive.
  - **It does not bloat unboundedly across *hops*** (it's a fixed string per `runCuratorTurnStreaming` call), but it *does* grow turn-over-turn as the page grows, and each turn's full page is also embedded in `messages` history implicitly via the client re-posting it. No truncation/size cap anywhere. A 60KB page on turn 10 is 60KB in the system block — there is no guard.
- **`turn.ts:14`/`prompt.ts` — the model never receives the SEAT-zip-caliber prompt.** `buildCuratorSystem()` uses `PEEK_METHOD` + `PEEK_CONTRACT` from `system-prompt.ts`, NOT `seat.ts`. See the system-prompt verdict below; this is where the quality gap actually bites.
- **`turn.ts:54` `max_tokens: 32000`** — fine for Opus 4.8 (128K ceiling) and streamed, so no HTTP-timeout risk. Good.
- **`turn.ts:55` `thinking:{type:"adaptive"}`** — correct. Note: with adaptive thinking and Opus 4.8, `display` defaults to `"omitted"`, so the `stream.on("text")` handler (62) will see a **long pause then a burst** while the model thinks — the user stares at "thinking…" with no feedback. Not a bug, but a UX smell; `display:"summarized"` would surface progress. The SSE keepalive was presumably added to survive exactly this pause — so the two edits are related and the keepalive is load-bearing for thinking latency.
- **`turn.ts:69` — loop break logic.** `if (msg.stop_reason !== "tool_use" || toolUses.length === 0) break;` is correct. But **`MAX_HOPS = 12` can be silently hit with no signal to the user or operator.** If the model keeps calling tools for 12 hops, the loop just falls out, emits `done` (151), and the page may be half-built (e.g. set_page never called, or called then 11 hops of failing resolve_card). There is no "I ran out of hops" event. A model that gets into a resolve/fail/retry spiral (very possible given resolve_card failures feed back "infer what you can and author the card yourself" at line 120) burns 12 hops and the user sees a dead preview.
- **`turn.ts:73-77` — `str()` coerces non-string tool inputs to `""`.** Opus 4.8 may emit tool `input` as already-parsed objects (the SDK does this), so `a["html"]` is a string normally — fine. But if the model ever emits `html` as a number or the field is missing, `str` returns `""` and you `fail("set_page needs html")`, which is the right behavior. OK.
- **`turn.ts:83,90` — sanitizer coverage gap.** `set_page` → `sanitizeHtml(html, true)`, `edit_region` → `sanitizeHtml(html, false)`. Good. But **`set_style` (94-99) injects `css` with NO sanitization** — it's emitted as `{type:"style", css}` and `applyPageOp` wraps it in `<style>${ev.css}</style>` raw (page-html.ts:36), and the client does `s.textContent = css` raw (studio/page.tsx:109). The `sanitizeCssText` scrubber (`@import`, `expression()`, `behavior`, `javascript:` urls) in `sanitize.ts:42` **only runs via the DOMPurify `uponSanitizeElement` hook on `<style>` elements that pass through `sanitizeHtml`** — a `set_style` op never calls `sanitizeHtml`, so a model-authored (or, via prompt-injection through a resolved product description, attacker-influenced) `@import url(evil)` in a `set_style` ships unsanitized into the stored document and the live iframe. The iframe is `sandbox="allow-scripts allow-same-origin"` so CSS `@import` can phone home / exfiltrate via background-image. **This is the real coverage hole.**
- **`turn.ts:101-106` — `set_media` selector/url unsanitized.** `url` goes straight into `setAttribute("src", url)` (page-html.ts:46) or `background-image:url("${ev.url}")` (47). A `url` of `"); } body{...} a:url("` could break out of the `background-image` value and inject arbitrary CSS into the stored HTML's style attribute. Low-sev (model-controlled, not user) but unsanitized.
- **`turn.ts:108-122` — `resolve_card` returns full `resolved.card` to the model** including `source_url`/`retailer`. The contract says "strip the retailer from what the recipient sees," but that's the model's job in authoring; the raw data including retailer is handed back, which is fine, just noting the recipient-privacy guarantee is prompt-enforced, not code-enforced.
- **`runSafewordReport` (164-185)** uses the same MODEL with `max_tokens:4096` and no thinking — fine. No tools, correct. KEEP this function.

Round-trip verdict for the new `currentHtml` edit: **it does not round-trip cleanly.** See the dedicated section below.

### `lib/curator/prompt.ts` — **KEEP (with one note)**

- Four ephemeral cached blocks (METHOD, PANTRY, FEWSHOT, CONTRACT), correct order, all `cache_control: ephemeral`. That's exactly 4 breakpoints — the max. **Adding the live-page block in turn.ts pushes past meaningful caching for that block** (it's the 5th system block; only 4 can be cache breakpoints, and it's the volatile one, correctly left uncached). Fine.
- The FEWSHOT block (11-14) is a large literal; it's cached so cost is amortized. KEEP.

### `lib/curator/system-prompt.ts` — **FIX (prompt is the product; ship the SEAT-caliber one)**

This is the single biggest *quality* gap. The shipping prompt (`PEEK_METHOD` + `PEEK_CONTRACT`) is an **older, weaker draft** than the deployed `seat.ts`. Diff highlights — what `seat.ts` has that this lacks:

- **"Widen the object — the faux-vintage paper artifact is the NEW generic"** (entire paragraph in seat.ts). The shipping prompt's whole worked example *is* a kraft-paper work order, and the prompt has **no instruction to avoid the paper-artifact rut** — so the model, anchored on the one few-shot, will reach for sepia paper documents repeatedly. This is the exact failure mode seat.ts was rewritten to prevent. **Most important missing piece.**
- **"Make it MOVE (non-negotiable)"** as a top-level rule with "a static page is a failure" and "the motion lives *behind* the words, never over them … if the signature move overlaps or veils the name even slightly it's wrong." The shipping prompt mentions signature motion (line 25) but does **not** make movement non-negotiable, and has **no rule about motion not covering the name/headline** — a real legibility bug generator given the chat overlay already covers ~60%.
- **The base64 / `data:` URL ban** (seat.ts rule 2: "Never an inline `data:`/base64 blob"). The shipping prompt never forbids `data:` URLs. The sanitizer doesn't strip `data:` image URLs either (see sanitize verdict), so the model *can* emit huge base64 blobs that bloat the stored doc — seat.ts explicitly trains against this; the shipping prompt doesn't. (And note the few-shot at `exemplar.ts:19` itself uses a `data:image/svg+xml` grain texture — directly modeling the behavior seat.ts bans.)
- **The `data-peek-img` image-slot contract** (`<img data-peek-img data-peek-img-desc=... data-peek-img-src="generate|search|upload">`). The shipping CONTRACT has no host-fills-image slot tag at all — it only has `set_media`/`generate_hero_image` tools. So the model has no declarative way to leave a host-filled image slot in authored HTML; it must round-trip a tool. seat.ts's slot contract is strictly better for the "leave a treated slot" instruction the shipping prompt itself gives (line 23).
- **"Render the material, not its outline"** (glass/metal/photoreal guidance) — absent.
- The shipping prompt's gate (lines 82-83) grades on 10 axes but its fatal set is (1)(2)(5)(9)(10); seat.ts's gate makes **movement (3) and font-not-by-reflex (4) fatal** and adds "name fully legible, never covered by the motion" (8). The seat gate is sharper.

Net: **the shipping seat prompt is weaker on exactly the dimensions that produce "generic" output** (object variety, mandatory motion, legibility under overlay, base64 hygiene). Before deploy, replace `PEEK_METHOD`/`PEEK_CONTRACT` with the SEAT content (or port the four missing doctrines + the `data-peek-img` slot). **This is a content swap, not a rewrite of the module** — hence FIX, not REWRITE.

### `lib/curator/pantry.ts` — **KEEP**

Large reference block, cached, no logic. Two trivial cosmetic bugs that will render in-context but are harmless: `#  b0228f` has a stray space (line ~363, `.h-neon`), and `@keyframes countUp{}` is an empty no-op stub by design (commented as "JS — see §9"). The pantry references `.rv`/`[data-peek-reveal]` and the peek-runtime wires `.rv` — consistent. Decorative-only; KEEP.

### `lib/curator/exemplar.ts` — **FIX (one line)**

- **`exemplar.ts:19` uses a `data:image/svg+xml` background** for the paper grain. This trains the model to emit `data:` URLs — which seat.ts explicitly bans and which bloat the stored document. If you adopt the seat prompt's base64 ban, this few-shot **contradicts** the rule and will undermine it (few-shot > instruction for behavior). Swap the grain to an inline `<svg><filter>` + `filter:url(#grain)` as seat.ts prescribes, or to a CSS-gradient grain. Otherwise the example is excellent and on-method. KEEP the rest.

### `lib/curator/tools.ts` — **KEEP**

Clean tool defs, schemas match the `turn.ts` switch (`set_page`/`edit_region`/`set_style`/`set_media`/`resolve_card`/`generate_hero_image`/`publish`). `generate_hero_image.aspect` enum is described in prose (`16:9 | 4:3...`) but not constrained via JSON `enum` — minor; the image port (`image.ts:21`) defaults safely on unknown aspect. No tool description gives a *when-to-call* trigger for `resolve_card`/`generate_hero_image`; per the skill, Opus 4.8 reaches for tools more conservatively, so adding "Call this when the creator pastes a URL or names a specific buyable thing" would lift call rate — but functionally KEEP.

### `lib/curator/page-html.ts` — **FIX**

The server-side mirror of the client's DOM ops, used to maintain `currentHtml` for persistence and feedback. This is where the round-trip breaks.

- **`page-html.ts:36` — `set_style` injects raw CSS** (unsanitized, see turn.ts note). FIX: route through `sanitizeCssText` here too.
- **`page-html.ts:26-32` `patch` uses `el.replaceWith(ev.html)`** via node-html-parser. node-html-parser's `replaceWith(string)` does a textual replace; if `ev.selector` matches a node whose `ev.html` is malformed, the rebuilt tree can subtly differ. More importantly, **`keepDoctype` (16-20) only restores `<!doctype>`; node-html-parser round-tripping a full document via `.toString()` can drop/normalize `<head>`/whitespace/self-closing forms.** Each turn re-parses and re-serializes the *entire* document server-side, so over many edits the stored HTML drifts from what the iframe actually rendered. This is the second half of the round-trip problem (the client and server maintain *two different* copies of the page; only the client's is what the user sees, but only the server's is persisted).
- **`page-html.ts:46-47` `media` background-image** has the CSS-injection-via-url concern noted above; also it appends `;background-image:...` to any existing `style` attr without dedup, so repeated `set_media` on the same slot stacks declarations.
- **`applyPageOp` and the client (`studio/page.tsx`) implement the SAME ops twice, independently.** They will diverge (e.g. the client calls `__PEEK__.rescan()` after a patch; the server can't). The persisted doc is built from the server's reconstruction, not the iframe's actual DOM. Single-source-of-truth is missing.

### `lib/curator/draft.ts` — **FIX**

- **`draft.ts:24` — `emptyPeekDocument` is called with no `status`,** so the stored draft's `peek.status` is whatever `emptyPeekDocument` defaults to. `markPeekPublished` (store.ts:73) checks `status === "published" || "claimed"` — so as long as the default isn't one of those it's fine, but the status is never set to "draft" explicitly here; relies on the core default. Verify `emptyPeekDocument` defaults to a non-published status (not read in this audit — flag to confirm).
- **`draft.ts:31` — `extractSpine` runs on every save** and its `issues` array is **completely discarded** (the return is destructured to `{cards, variant_groups}` only). Every `missing_id`, `duplicate_id`, `unpriced_in_tab`, `locked_without_unlock` warning the extractor carefully produces is thrown away. The operator/curator never sees that the page has a budget tab with unpriced cards (which `extract.ts:308` warns "publish may treat this as an error"). At minimum, log issues; ideally surface count back via the `saved` event.
- **`draft.ts:8` `mintSlug`** strips non-alphanumerics from `peekId` and takes first 12. peekId is a `crypto.randomUUID()` (studio/page.tsx:15) so cleaned → 32 hex chars → first 12. Fine and stable. But the fallback `Math.random().toString(36).slice(2)` is non-deterministic — if `peekId` is ever empty, two saves mint different slugs for the same peek. peekId is never empty in the real path, so low risk.

### `lib/curator/extract.ts` — **KEEP (robust; one edge note)**

Genuinely careful: try/catch around parse (94-106), id derivation + dedup (128-155), kind/rule/unlock defaulting all warn rather than throw, budget/unpriced cross-check (300-311). The failure modes are handled and *reported as issues* — the problem is the **caller throws those issues away** (see draft.ts). 

- **`extract.ts:204` unlock mapping is lossy by design** — `after:<token>` collapses to `UnlockRule.kind="event"` and stashes the token in `metadata.unlock_after_token`, with a warn. The runtime (`peek-runtime.js:78-84`) implements unlock via a *substring* match on `kind|group|id` — so the spine's `UnlockRule` and the live runtime's unlock logic are **two unrelated implementations**. The persisted spine can't reproduce the runtime's unlock behavior. Not a crash, but the IR is not a faithful model of the page. Note for whoever consumes the spine downstream (recipient render).
- **`extract.ts:276` group-rule-conflict** picks `[...acc.rules][0]` (Set insertion order) — deterministic enough. Fine.
- `extractSpine` does not enforce that a `data-budget` region's cards are inside it; budget is page-global. Matches runtime (`peek-runtime.js:26` budget is a single page-level `[data-budget]`). Consistent.

KEEP the module; the fix is to stop discarding its output.

### `lib/sanitize.ts` — **FIX**

- **`data:` URLs are not stripped.** DOMPurify by default allows `data:` on `img src` for safe image types, and the config doesn't `FORBID` it. Combined with the few-shot modeling `data:image/svg+xml` and the missing base64 ban in the prompt, the stored doc can carry large/animated `data:` SVG (SVG `data:` URIs can contain `<script>`? — no, DOMPurify won't parse the data-uri contents, but `data:image/svg+xml` as a CSS `background-image` is **not** sanitized at all because `sanitizeCssText` doesn't touch `data:`). FIX: forbid `data:` in `style`/`src` or cap its length.
- **CSS sanitization only fires on `<style>` *elements* and `style` *attributes* that pass through `sanitizeHtml`.** A `set_style` op never does (turn.ts:94 / page-html.ts:36). **The scrubber is not on the path that needs it most.** Centralize: export `sanitizeCssText` and call it in `applyPageOp`'s `style`/`media` cases.
- **`sanitizeCssText` is regex-based and shallow** — `expression(` → `/*x*/(` and `@import...;` removal are easily evaded (`@imp\ort`, CSS comments splitting the keyword, `expre\ssion`). Modern browsers don't support `expression()` and `@import` is the only real exfil vector for sandboxed CSS; the regex catches the naive case but a determined injection (e.g. via a poisoned product `data-desc` that the model copies into a style) could slip. Low priority given the model authors the CSS, but it's defense-in-depth that's advertised and only ~80% real.
- **`url(javascript:...)` scrub (47)** only matches `url( javascript: )` with optional quotes; `url(\006a avascript:)` (CSS hex escape) evades. Again, model-authored, low-sev.
- The allowed-tags/attrs list is reasonable and forbids `script/iframe/form/input/...` — **good**, and matches the contract's promise. KEEP the tag/attr policy; FIX the CSS path coverage + `data:`.

---

## DEEP DIVES (the items the brief flagged)

### The new `currentHtml` feedback — does it round-trip? **No.**

The client (studio/page.tsx:194-202) builds `currentHtml` from `frameRef.contentDocument.documentElement.outerHTML` — i.e. the **live, runtime-mutated DOM**, not the authored source. It then prepends `<!doctype html>` and strips exactly two things with regex:
```
.replace(/<script>\s*window\.__PEEK__=\{mode:"preview"\};\s*<\/script>\s*/i, "")
.replace(/<script src="\/peek-runtime\.js"><\/script>\s*/i, "")
```
That removes the two injected `<script>` tags. **It removes nothing else the runtime injected or toggled.** The runtime (`peek-runtime.js`) at load time and on interaction:

- **Appends a whole `<div data-peek-sheet>` dialog + its `<style>`** to `<body>`/`<head>` (115-141) when no `[data-peek-sheet]` exists — which is always, since the model rarely authors one.
- **Appends a whole `<div data-peek-bar>` sticky bar + its `<style>`** (158-170).
- **Sets `data-peek-id` on every card that lacked one** (16-19) — mutating authored markup.
- **Toggles `.chosen-on` / `data-peek-picked="1"`** on picked cards (48-52), `.unlocked` / `data-peek-unlocked="1"` on unlocked cards (82), `.open` / `.show` / `body.sheet-open` classes, `[data-peek-tab-fill].style.width`, tab `textContent`, `.in` on reveals (190).

So the `currentHtml` fed back to the model on turn N+1 contains: **two extra full-width fixed-position UI widgets the model never wrote, runtime-injected `<style>` blocks, runtime-assigned ids, and whatever transient picked/open/revealed state the user left the page in.** The model is told (turn.ts:39) "You already authored the page below" — but it did not author the sheet, the bar, the injected styles, or the `data-peek-picked` flags. On an `edit_region` it may target the injected nodes, duplicate the bar/sheet, or "fix" state classes it shouldn't touch. And because the runtime re-injects sheet/bar **only if absent**, feeding back a page that already contains them is at least idempotent for those two — but the injected `<style>` blocks compound (the model's re-`set_page` would include them, then the runtime adds them again → duplicate styles).

**Does it bloat unboundedly across turns?** Yes, monotonically, though not exponentially: each turn the page grows (more cards), the full live DOM (including injected widgets + styles + accumulated state attrs) is posted back and embedded as an uncached system block AND in message history. There is **no size cap, no truncation, no diff**. A 10-turn edit session on a rich page sends the full page ~10 times at full token price. The injected runtime DOM adds a fixed ~2KB of sheet/bar markup+CSS to every feedback. It will not OOM, but it is a real and growing token cost with no guard.

**Fix direction:** feed back the *authored* source (what the model last produced via set_page/edits — the server already maintains this in `currentHtml` via `applyPageOp`!), NOT the iframe's live `outerHTML`. The route already has a server-side `currentHtml` (route.ts:59-68) that is the clean authored version. The client should **not** send `body.currentHtml` from the iframe at all — the server can reconstruct it. As written, the client's dirty `currentHtml` (with runtime cruft) *overrides* the server's clean one at route.ts:59. That's the bug in one line: the client's runtime-polluted page wins.

### SSE parsing — fragile points

- **Client splits the byte stream on `"\n\n"` (studio/page.tsx:230)** and treats each part as one frame, then requires `line.startsWith("data:")` (234), discarding comment frames (`: ping`) correctly. **But** `TextDecoder.decode(value, {stream:true})` is used (229) which correctly handles multi-byte boundaries — good. The real fragility: if a single `data:` JSON payload ever contained a literal `\n\n` it would be split and both halves would `JSON.parse`-fail and be dropped (238 `continue`). `JSON.stringify` never emits a raw newline, so today this can't happen — **but** the contract is undocumented and brittle: any future event whose payload includes a pre-formatted multi-line string breaks silently.
- **Partial trailing frame handling (231 `buf = parts.pop()`)** is correct — keeps the incomplete tail for the next read.
- **No handling for the `done`/`ready`/`saved` event types on the client** (studio/page.tsx:241-255 only handles text/page/patch/style/media/error). The server emits `ready` (turn.ts:138, on `publish`) and `saved` (route.ts:92) and `done` (turn.ts:151) — the client **silently ignores all three.** So `publish` does nothing visible (no checkout trigger, no "ready to publish" UI), and `saved` (the slug!) is dropped — the user is never told the page was saved or what its URL is. **For a "publishing is the business" product, the publish/saved events being dropped client-side is a shipping-blocker-level gap.**

### The tool-loop / MAX_HOPS

- 12 hops, breaks on non-tool_use or zero tool uses. **No user-facing signal on hop exhaustion** (covered above). A `resolve_card`/`generate_hero_image` failure feeds an `is_error` result back (turn.ts:120, 133) inviting a retry — a model that retries image gen 12× on a persistent `FAL_KEY`-missing error (image.ts:19 returns "not configured") will burn all hops doing nothing and exit with a text-only or half-built page. Add a per-tool failure budget or surface "couldn't finish" on exhaustion.

### Sanitizer actual coverage — what gets through

- Through `set_page`/`edit_region`: only the allowlisted tags/attrs; `script/iframe/form/...` forbidden; `style` attrs and `<style>` text get the (shallow) CSS scrub; `target=_blank` gets `rel=noopener`. **Solid for the HTML path.**
- **Through `set_style`: everything** — raw CSS, no scrub. (the hole)
- **Through `set_media`: raw url into src/background** — no scheme check, no CSS-value escaping.
- **`data:` image URLs: allowed** in `set_page` HTML (DOMPurify default) and uncaught in CSS.
- **CSS `@import` / `expression()` / `javascript:` scrub: present but regex-evadable and not on the `set_style` path.**

### extractSpine failure modes

- Parse failure → caught, returns empty spine + error issue (94-106). Good.
- Missing/dup ids → derived + deduped + warned. Good.
- Unknown kind/rule, malformed/lone unlock, lone group, unpriced-on-tab → all warn, never throw. Good.
- **The one real failure: all of it is discarded by the caller (draft.ts).** The module is fine; the integration drops its safety output.

---

## ORDERED PUNCH LIST (generation path)

Ordered by deploy risk (1 = fix before first deploy).

1. **Stop the client from sending iframe `outerHTML` as `currentHtml`.** Either send nothing (let the server's clean `applyPageOp`-maintained `currentHtml` drive feedback) or strip the runtime-injected `[data-peek-sheet]`/`[data-peek-bar]` nodes, injected `<style>`s, and `data-peek-picked`/`.chosen-on`/`.open`/`.in` state before posting. (`studio/page.tsx:194-202`; `route.ts:59`)
2. **Swap in the SEAT-zip prompt** (or port its 4 missing doctrines + `data-peek-img` slot): widen-the-object/anti-paper-rut, make-it-MOVE + motion-behind-the-name, base64/`data:` ban, image-slot tag. (`system-prompt.ts`)
3. **Handle `publish` / `saved` / `ready` events on the client** — wire `publish`→checkout, show the `saved` slug/share URL, surface `ready`. Publishing is the business and is currently a no-op in the UI. (`studio/page.tsx:241-255`)
4. **Run CSS through `sanitizeCssText` on the `set_style` and `set_media` paths** (server `page-html.ts:36,46-47` and client `studio/page.tsx:109,118-119`). Centralize the scrubber. (`sanitize.ts`, `turn.ts:94-106`)
5. **Set/verify the `PEEK_SAFEWORD` env in prod and don't ship `bananahead` as a live default backdoor.** (`route.ts:51`)
6. **Gate the per-turn save on an actual page change**, not merely "currentHtml present." (`route.ts:82`)
7. **Stop discarding `extractSpine` issues** — log them, and emit issue count on the `saved` event (or block publish on `unpriced_in_tab`). (`draft.ts:31`)
8. **Don't silently swallow persistence failures** — log the catch and/or emit an `error`/`save_failed` event. (`route.ts:93-94`)
9. **Surface MAX_HOPS exhaustion** to the user/operator and add a per-tool failure budget so a failing resolve/gen can't eat all 12 hops. (`turn.ts:51,120,133`)
10. **Forbid or length-cap `data:` URLs** in sanitizer (HTML + CSS) and fix the `exemplar.ts:19` `data:` grain so the few-shot doesn't contradict the ban. (`sanitize.ts`, `exemplar.ts:19`)
11. **Cap / truncate / diff the live-page system block** so token cost doesn't grow unbounded across a long edit session; mark it explicitly uncached and bounded. (`turn.ts:35-46`)
12. **Make `applyPageOp` server-side reconstruction the single source of truth** for the persisted doc, and reconcile it with the client's separate op implementation (currently two divergent copies). (`page-html.ts`, `studio/page.tsx:87-121`)
13. **Consider `thinking.display:"summarized"`** so the adaptive-thinking pause shows progress (the keepalive papers over it but the user still sees a stall). (`turn.ts:55`)
14. **De-dup stacked `background-image` declarations** in `set_media` and harden the url against CSS-value breakout. (`page-html.ts:46-47`)
15. **Add when-to-call triggers** to `resolve_card` / `generate_hero_image` descriptions (Opus 4.8 under-reaches for tools). (`tools.ts:56,77`)
16. **Tidy the `route.ts:47` first-user guard** to `if (firstUser === -1) return 400` for clarity. (`route.ts:44-49`)
17. **Reconcile the spine `UnlockRule` with the runtime's substring-match unlock** so the persisted IR faithfully models the live page (or document that the IR is lossy for unlocks). (`extract.ts:204`, `peek-runtime.js:78-84`)

---

## SUMMARY VERDICT TABLE

| File | Verdict |
|---|---|
| `app/api/curator/route.ts` | **FIX** (save-gating, empty catch, safeword default, first-user guard) |
| `lib/curator/turn.ts` | **FIX** (currentHtml feedback, set_style/set_media unsanitized, MAX_HOPS silent, token bloat) |
| `lib/curator/prompt.ts` | **KEEP** (caching correct; carries whatever system-prompt.ts provides) |
| `lib/curator/system-prompt.ts` | **FIX** (ship SEAT-caliber prompt — 4 missing doctrines + image slot) |
| `lib/curator/pantry.ts` | **KEEP** (cosmetic `#  b0228f` only) |
| `lib/curator/exemplar.ts` | **FIX** (one line: `data:` grain contradicts the base64 ban) |
| `lib/curator/tools.ts` | **KEEP** (add when-to-call triggers as polish) |
| `lib/curator/page-html.ts` | **FIX** (unsanitized set_style/media, doctype-only round-trip drift, dual source of truth) |
| `lib/curator/draft.ts` | **FIX** (discards extract issues; verify default status) |
| `lib/curator/extract.ts` | **KEEP** (robust; caller must stop dropping issues) |
| `lib/sanitize.ts` | **FIX** (CSS scrub not on set_style path; `data:` allowed; regex evadable) |

No file warrants **REWRITE-CLEAN** — the architecture is sound and each module is individually coherent. The damage is concentrated in (a) one wrong line feeding dirty iframe HTML back as authored source, (b) an older/weaker prompt shipping instead of the SEAT one, (c) the sanitizer not covering the `set_style` path, and (d) client-side event handling that drops `publish`/`saved`. All are surgical FIXes.
