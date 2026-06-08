# Implementation Audit — Render + Runtime (pre-deploy, line-by-line)

Scope: studio page, recipient page(s), preview/scenes/frames/reveal components, and the host runtime `peek-runtime.js`. READ-ONLY review. Every item carries `file:line`.

Verdict in one line: **the recipient pick loop does not close.** A tapped card in the live recipient page reaches a `doAction` that calls an `onAction` nobody ever sets, with no `postMessage` bridge and no parent listener — picks=0 is structural, not incidental. Details below.

---

## 0. THE CRITICAL ONE — recipient pick path, traced end to end

### What actually mounts on `/g/[slug]`
- `apps/web/app/g/[slug]/page.tsx:27` — `if (doc.presentation?.html)` gates the render. When true, it returns a raw `<iframe srcDoc=…>` (`:31-37`).
- `:29` — `frameDoc(sanitizeHtml(doc.presentation.html, true), "recipient")` builds the iframe document.
- `apps/web/lib/curator/page-html.ts:11-14` — `frameDoc` injects ONLY `<script>window.__PEEK__={mode:"recipient"}</script>` + `<script src="/peek-runtime.js"></script>`. **It never assigns `cfg.onAction`.**

### Is `presentation.html` ever null (so the React fallback renders)?
No — not on any path that produces a persisted doc. `apps/web/lib/curator/draft.ts:40-45` (`buildDraftDocument`, the only doc builder, invoked from `app/api/curator/route.ts:85`) ALWAYS sets `presentation.html` to the authored HTML. Therefore `page.tsx:27` is effectively always-true for any real published peek, and the React branch at `page.tsx:40-41` (`<RecipientView>`) is **dead code in production.**

### Where the pick is supposed to go vs. where it goes
- `apps/web/public/peek-runtime.js:86-111` — the document-level click handler. A tap on a card's CTA hits `data-peek-action` → `:91` `doAction(action.getAttribute("data-peek-action") || "publish")`. The exemplar the model is told to emit uses exactly this: `lib/curator/exemplar.ts:142` `<button … data-peek-action="claim">Send it to Dad →</button>`.
- `apps/web/public/peek-runtime.js:178-183` — `doAction`:
  ```js
  function doAction(type) {
    var items = []; for (var k in order) items.push(order[k]);
    var summary = { items: items, total: total(), budget: budget() };
    if (typeof cfg.onAction === "function") cfg.onAction(type, summary);
    else if (cfg.mode !== "recipient") { try { console.log("[peek] action:", type, summary); } catch (e) { void e; } }
  }
  ```
  `cfg.onAction` is **never a function** in the recipient iframe (nothing sets it — see `page-html.ts:11-14`), so the `if` is false. The `else` only logs, and only when `cfg.mode !== "recipient"`. In recipient mode it is `"recipient"`, so the `else` is also skipped. **Net result: a recipient taps "Send my picks" / "Send it to Dad" and absolutely nothing happens — no fetch, no postMessage, no navigation, no error.**

### The bridge that should exist but doesn't
- `peek-runtime.js` contains **zero** references to `parent`, `window.parent`, `postMessage`, or `window.top` (grep over the file: 0 matches). The sandboxed iframe has no channel out.
- No parent page anywhere registers a `message` listener (grep `addEventListener("message"` across `apps/web`: 0 matches).
- `/api/pick` (`apps/web/app/api/pick/route.ts`) is correct and complete server-side, but its ONLY caller is `apps/web/components/recipient-view.tsx:18` — the React fallback that, per the gate above, never renders for a real peek. So the working pick endpoint is unreachable from the page users actually see.

**Exact gap (quote):** `peek-runtime.js:181` `if (typeof cfg.onAction === "function") cfg.onAction(type, summary);` — `onAction` is undefined in the recipient iframe and there is no else-branch that reaches the network, no `parent.postMessage`, and no parent-side listener. The recipient pick can physically never leave the iframe.

**Fix shape (item #1 in the punch list):**
1. In `peek-runtime.js`, when `cfg.mode === "recipient"`, set `cfg.onAction` (or post directly) to `parent.postMessage({type:'peek:action', action, summary, cardId}, '*')`. Also post on every card toggle (`pick()`, `peek-runtime.js:53-76`) so the parent can persist incrementally, not just on the final CTA.
2. On `/g/[slug]`, render the iframe from a small **client** component that registers `window.addEventListener("message", …)`, validates `event.source === iframe.contentWindow` (origin will be `"null"` under `sandbox="allow-scripts"` — do NOT string-match origin), then `POST`s `/api/pick` with `{slug, cardId}` and posts the server-confirmed `picks[]` back into the iframe so the runtime can paint `data-peek-picked`. Re-derive everything server-side from the slug; treat the payload as untrusted.
3. The current page is a server component returning a bare `<iframe>` — it cannot hold a listener. This is net-new client code.

---

## 1. Studio (`app/studio/page.tsx`) — bugs, unhandled cases, races, silent failures

### SSE consumer (`send()`, lines 204-263)
- **`saved` / `ready` / `done` / `tool` events are silently dropped (`:241-255`).** The consumer's `if/else` chain handles only `text`, `page`, `patch`, `style`, `media`, `error`. But the server emits `{type:"saved", slug, peekId}` (`app/api/curator/route.ts:92`), `{type:"ready"}` (`turn.ts:138`), `{type:"done"}` (`turn.ts:151`), and `{type:"tool",…}` (`turn.ts:116,119,…`). The studio therefore **never learns the published slug/share URL** — after a successful build+persist there is no way for the creator to get to `/g/<slug>`. This is a product-blocking gap for the publish step, not just cosmetic. `tool` events (resolve_card / generate_hero_image progress + failures) are also invisible to the user.
- **`ev.type === "media"` requires `ev.url` truthy (`:250`) but a legitimately empty media op is just ignored** — minor; acceptable.
- **SSE comment lines (`: warming up`, `: ping`) are handled correctly** — `:234` requires `line.startsWith("data:")`, so heartbeat comments are skipped. Good.
- **Partial-frame robustness is OK** — `buf.split("\n\n")` with `buf = parts.pop()` (`:230-231`) correctly retains an incomplete trailing frame across reads.
- **No timeout / abort on the reader (`:226-257`).** If the server stalls mid-stream (the 15s ping keeps the socket open), `busy` stays `true` indefinitely and the composer is locked. There is no `AbortController`. With `maxDuration = 120` on the route this resolves eventually, but a dropped TCP connection mid-stream leaves the UI wedged until reload.
- **A stream error after `setPage` already ran still shows "(updated the page)" (`:258`)** if no text accumulated — minor messaging issue.

### `setPage` / iframe lifecycle (lines 77-94, 270)
- **`onFrameLoad` fires for EVERY load, including the initial empty `about:srcdoc`.** `frameReady.current` is set true on first load (`:82`) before any page exists. Then `setPage` (`:90`) flips it back to false and queues are cleared. Net behavior happens to work, but the readiness flag is driven by raw `load` events with no correlation to which document loaded — a `patch` queued during the brief window between `setPage` assigning `srcdoc` and the new doc's `load` can be lost if `onFrameLoad` from the *previous* document fires late. Race is narrow but real.
- **`setPage` blows away the entire iframe document on every full re-author (`:92` `f.srcdoc = …`).** Every `set_page` from the model causes a hard reload: animations restart, scroll resets, reveal state is lost, and any in-flight `pendingOps` are dropped (`:91`). The prior generation morphed the body (Idiomorph) to stream without flicker; this implementation does not. For streaming re-authors this is a visible regression but not a correctness bug.
- **`runOrQueue` checks `frameRef.current?.contentDocument` (`:78`)** — under `sandbox="allow-scripts allow-same-origin"` (studio) this works. It would throw/return null under a stricter sandbox; see §4.

### `patchRegion` / `addStyle` / `setMedia` (lines 95-121)
- **`patchRegion` uses `el.outerHTML = html` (`:100`) then calls `__PEEK__.rescan()` (`:101`).** `rescan` re-runs reveals + meter refresh but does NOT re-bind anything per-element (the runtime uses document-level delegation, so that's fine). However, replacing `outerHTML` detaches the old node; if the selector matched the element the sheet/bar were derived from there's no issue since those are body-level. OK.
- **`addStyle` appends a new `<style>` every call (`:108-111`)** with no dedupe — repeated `set_style` ops accumulate unbounded `<style>` nodes. Memory/ď­perf creep over a long session; not fatal.
- **`setMedia` background-image branch (`:119`)** sets `el.style.backgroundImage` directly, overwriting any existing inline background shorthand. Minor.
- **All three silently no-op if the selector misses (`:99,118`)** — the model gets no feedback that its edit hit nothing (the studio doesn't surface tool errors anyway — see the dropped `tool`/`error` UI note). The SERVER-side mirror (`page-html.ts:applyPageOp`) also silently returns unchanged HTML on a missed selector (`page-html.ts:28-30,44-46`), so a bad selector means the persisted `currentHtml` and the visible iframe can quietly diverge from the model's intent.

### The new `currentHtml` capture (lines 194-202)
- **The strip regexes are brittle (`:199-200`).** They remove the injected runtime via:
  - `/<script>\s*window\.__PEEK__=\{mode:"preview"\};\s*<\/script>\s*/i`
  - `/<script src="\/peek-runtime\.js"><\/script>\s*/i`
  But `frameDoc` (studio-local, `:42`) injects with a leading `\n` and specific spacing; after the browser parses and re-serializes via `documentElement.outerHTML`, attribute quoting/whitespace can change (e.g. the browser may keep `src="/peek-runtime.js"` but reorder or normalize). If either regex fails to match, the **runtime `<script>` tag is sent back into `currentHtml`** and then (a) re-fed to the model as "the live page" and (b) persisted via the curator route. On the next `set_page` round-trip the model may echo it, and `frameDoc` would inject a SECOND runtime script. Fragile coupling between two independently-defined `frameDoc`s (studio `page.tsx:41-44` vs server `page-html.ts:11-14`) that emit slightly different markup.
- **`documentElement.outerHTML` drops the doctype**; the code prepends `"<!doctype html>\n"` (`:198`) to compensate. OK, but note the server's `frameDoc` re-test for `</body>` (`page-html.ts:13`) will still work.
- **Capture reads `contentDocument` (`:196`) under same-origin sandbox** — works in studio only. Would be `null` if the studio iframe sandbox were tightened.

### Other studio issues
- **`startMic` (`:131-146`)**: `SpeechRecognition` result typing is hand-rolled; `onerror` is not handled, so a mic permission denial leaves `listening` stuck true (the pill stays active) until `onend` fires — most browsers do fire `onend` after an error, so usually self-heals, but a hard failure can wedge the active state.
- **`onFile` (`:123-129`)**: revokes the previous preview URL before replacing — good. No size/type guard beyond `accept="image/*"`; a huge file goes straight to `/api/upload`.
- **`send()` image branch**: on upload failure it returns early (`:170,175`) but has already pushed the user's display message and cleared the composer (`:153-155`) — the typed text is lost on a failed upload. Minor UX.
- **`peekId` is generated client-side once per mount (`:56`, `newPeekId`)** and sent to the curator route. The route uses it as the DB primary key (`route.ts:84-90`, `draft.ts:30`). A page refresh mints a NEW id, so the creator silently starts a brand-new document and the prior draft is orphaned — there's no resume.

---

## 2. The runtime's `data-peek-*` wiring — what's wired, stubbed, broken

File: `apps/web/public/peek-runtime.js`.

| Surface | Status | Notes (file:line) |
|---|---|---|
| Card selection / toggle | **wired** | `pick()` `:53-76`; click delegation `:104-110`; `markCard` sets `data-peek-picked` `:48-52`. |
| Pick-one (single-select) | **wired** | `:57-63` honors `data-group` + `data-rule="pick-one"`, deselects prior group member. Matches system-prompt contract (`system-prompt.ts:75`). |
| `data-opt` sub-options | **wired** | `:94-103` single-select within a card, writes chosen `data-price` back to the card before `pick`. |
| Budget tab (drain meter) | **wired** | `refresh()` `:30-46` reads `[data-budget]`, updates `data-peek-tab-amount/-fill/-msg`, toggles `.over`. Matches `system-prompt.ts:76`. |
| Sticky order bar | **wired + auto-injected** | `:157-170` uses authored `[data-peek-bar]` or injects a fallback; `updateBar` `:171-176`; show/hide via IntersectionObserver on `#top`/`header`/first card `:197-204`. |
| Bottom sheet | **wired + auto-injected** | `:114-155`; opens on card tap, populates `[data-peek-sheet-*]`, pick button toggles add/remove. |
| Locks / unlock | **wired** | `isLocked` `:22-25`; `maybeUnlock` `:78-84` matches `data-unlock="after:<token>"` against kind|group|id. Matches `system-prompt.ts:77`. |
| Reveals | **wired** | `wireReveals` `:185-194`, IntersectionObserver → `.in`; reduced-motion fallback. |
| Image slots / `set_media` | **N/A in runtime** | The runtime does not handle media swaps; that's a studio/server op. Recipient images are baked into the persisted HTML. Fine. |
| **Primary CTA → server** | **BROKEN** | `data-peek-action` → `doAction` → `cfg.onAction` (never set in recipient). See §0. **This is the whole loop.** |

### `data-peek-id` minting — does server == runtime?
**They drift when the model omits `data-peek-id`.** Two independent minting algorithms:
- **Server** (`apps/web/lib/curator/extract.ts:126-155`): if `data-peek-id` absent → `id = kebab(data-name ?? text)`, else `card-<index+1>-<shortHash>`; duplicates get `-2`/`-3`. This id becomes `Card.id` (the join key `/api/pick` validates against via `decidePick`).
- **Runtime** (`apps/web/public/peek-runtime.js:16-19`): if `data-peek-id` absent → `card.getAttribute("data-name") || ("c" + ++uid)` — **raw `data-name` (not kebabbed), or `c1/c2…` (not `card-N-hash`).**

So for a card with `data-name="Leather Work Gloves"` and no id: server mints `leather-work-gloves`, runtime stamps `Leather Work Gloves`. Even once the bridge exists, the `cardId` the runtime emits would 404 against `decidePick`. **Mitigation: make the runtime trust the server's id only** — never auto-mint client-side; and have the server guarantee every card gets a `data-peek-id` written into the persisted HTML (extract.ts already computes it; persist it back onto the element). The happy path is safe today because the exemplar (`exemplar.ts:108-129`) and the system prompt push explicit `data-peek-id` on every card — but "model forgot an id" is a likely live failure and silently mis-picks.

---

## 3. Sandbox attributes on every iframe

| Iframe | `sandbox` | `allow-same-origin`? | file:line |
|---|---|---|---|
| Studio preview | `allow-scripts allow-same-origin` | **YES** | `app/studio/page.tsx:272` |
| Recipient | `allow-scripts` | **no** | `app/g/[slug]/page.tsx:34` |

- **Studio's `allow-same-origin` (`page.tsx:272`) is required by this implementation** — the studio drives the iframe by reaching into `frameRef.current.contentDocument` for `setPage`/`patchRegion`/`addStyle`/`setMedia` (`page.tsx:97,108,116`) and for the `currentHtml` capture (`:196`). Remove `allow-same-origin` and all of those return `null`/throw and the studio stops working. The content is model-authored HTML; with `allow-same-origin` + `allow-scripts` that script runs in the **app's own origin**, so it can read app cookies/`localStorage` and call same-origin endpoints. **Cookie-theft / same-origin-exfil risk** if any authored script is hostile. It's mitigated by `sanitizeHtml(html, true)` stripping `<script>` before `set_page` (`turn.ts:83`) — but the studio iframe is also where the host injects its own `peek-runtime.js`, and the model controls all surrounding markup. This is the classic "never combine `allow-scripts` + `allow-same-origin` for untrusted content" footgun. Recommend: move studio control to `postMessage` (same bridge as recipient) so the studio iframe can also drop `allow-same-origin`. Until then, it's a known risk, acceptable only because authoring is the creator's own session.
- **Recipient `allow-scripts` (no same-origin) is correct** — the runtime needs scripts but must NOT run same-origin. The consequence: under this sandbox the iframe's origin is `"null"`, so the eventual pick bridge must validate `event.source === iframe.contentWindow` (NOT `event.origin === <string>`). Removing `allow-scripts` from the recipient iframe would kill the runtime entirely (no selection, no sheet, no bar). So `allow-scripts` is load-bearing on the recipient side and correctly scoped.

---

## 4. Components — correctness notes (lower severity, the render path itself)

These render the React fallback (`RecipientView`/`PeekPreview`) which, per §0, does not currently mount for real peeks — but the studio does NOT use them either (studio is iframe-only). **`components/preview.tsx`, `scenes.tsx`, `frames.tsx`, `reveal.tsx` are effectively only exercised if/when the React recipient fallback is reachable.** Flagging real bugs in case the fallback is revived (or used for SSR preview):

- `preview.tsx:1183-1188` — `held`/`liveCard`/`openId` triple-state for the sheet: when a card disappears from the model mid-open, `openId` is cleared on the next effect tick (`:1186-1188`) but `held` retains the stale card so the closing animation still has content. Reasonable, but `setHeld(liveCard)` only updates when `liveCard` is truthy (`:1184`), so `held` can show a stale card if the user opens A, A is removed, then opens B before the close animation — narrow.
- `preview.tsx:1219` `<FontLink>` injects a Google Fonts `<link>` per render based on `--peek-font-*` cssVars; `:1166` filters out `inter`. If a cssVar font value isn't quoted (`familyFromVar` requires a leading `"`, `:1159`) the font is silently skipped — depends entirely on the IR emitting quoted family names.
- `preview.tsx:1083` `Custom` section uses `dangerouslySetInnerHTML={{__html: sanitizeCustomHtml(html)}}` — sanitized (`sanitize.ts:76`), OK.
- `scenes.tsx` — pure CSS/SVG scene layers; `Styles` uses `dangerouslySetInnerHTML` with static keyframe strings (`:91-93`) — no injection, OK. `Scene` returns `null` for unknown kinds (`:68`) — safe.
- `frames.tsx` — pure presentational; `VinylFrame` hardcodes `#111`/`#0e0e10` (`:120-121,135`) ignoring theme — cosmetic only.
- `reveal.tsx` — IntersectionObserver with a 1100ms failsafe (`:30`) so content can't get stuck hidden; reduced-motion short-circuits to shown (`:11-14`). Solid.
- `preview.tsx:803-844` `Countdown` runs a 1s `setInterval` (`:810`) — fine; cleans up on unmount.

No crash-level bugs in the component tree. Their bigger problem is **they're a parallel renderer to the iframe path** — two ways to render a recipient page (React IR vs authored HTML), only one of which (HTML) is wired to persist and only the React one of which is wired to pick. That's the architecture fault behind §0.

---

## PER-COMPONENT VERDICT

| File | Verdict | Why |
|---|---|---|
| `public/peek-runtime.js` | **FIX** | All `data-peek-*` surfaces wired EXCEPT the one that matters: `doAction`/`onAction` dead-ends in recipient mode (`:178-183`). Add the `postMessage` bridge + stop client-side id minting (`:16-19`). Core logic is otherwise sound. |
| `app/g/[slug]/page.tsx` | **FIX (REWRITE the render branch)** | Server component returns a bare `<iframe>` with no listener (`:31-37`); must become/wrap a client island that bridges `postMessage` → `/api/pick`. The React fallback (`:40-41`) is dead and should either be deleted or made the canonical path. |
| `app/studio/page.tsx` | **FIX** | SSE consumer drops `saved`/`ready`/`done`/`tool` (`:241-255`) so the creator never gets the share URL; brittle runtime-strip regexes in `currentHtml` capture (`:199-200`); no stream timeout/abort; `srcdoc=` full-reload kills streaming polish; refresh orphans the draft (new `peekId`). No crash bugs. |
| `components/preview.tsx` | **KEEP (with caveats)** | No crash bugs; but it's a second, currently-unmounted recipient renderer. Decide: revive as the canonical recipient (wired to `/api/pick`) or delete. If kept, it's the cleaner path to the closed loop than the runtime bridge. |
| `components/scenes.tsx` | **KEEP** | Pure presentational, safe, unknown-kind → null. |
| `components/frames.tsx` | **KEEP** | Pure presentational; only cosmetic hardcoded colors. |
| `components/reveal.tsx` | **KEEP** | Correct, has failsafe + reduced-motion. |

---

## ORDERED PUNCH LIST (render + runtime)

1. **[BLOCKER] Build the recipient pick bridge.** Recipient taps currently reach `peek-runtime.js:181` `cfg.onAction(...)` where `onAction` is undefined → nothing happens. Runtime: `parent.postMessage(...)` on card toggle AND on `data-peek-action` CTA. Parent: convert `/g/[slug]` render to a client island that listens for `message`, validates `event.source === iframe.contentWindow` (origin is `"null"` under the recipient sandbox — don't string-match), POSTs `/api/pick`, posts confirmed `picks[]` back so the runtime paints `data-peek-picked`. Without this, picks=0 forever. (`page-html.ts:11-14`, `peek-runtime.js:178-183`, `g/[slug]/page.tsx:31-37`, unreachable `/api/pick` + `recipient-view.tsx:18`.)
2. **[BLOCKER] Unify the `data-peek-id` join key.** Stop the runtime auto-minting (`peek-runtime.js:16-19`); have the server write its computed id back onto every card in the persisted HTML (`extract.ts:126-155`). Otherwise a model that omits an id makes the runtime emit a `cardId` that 404s in `decidePick`, even after the bridge lands.
3. **[HIGH] Studio: consume the `saved` event** (`app/api/curator/route.ts:92` → `app/studio/page.tsx:241-255`) and surface the resulting `/g/<slug>` share link. Right now a successful publish produces no reachable URL in the UI. Also handle `ready`/`done`/`tool`/`error` for publish state + tool failure feedback.
4. **[HIGH] Decide the recipient renderer once.** Two parallel renderers (authored-HTML iframe vs React `PeekPreview`) with split wiring is the root cause of #1. Either make the React path canonical (it already calls `/api/pick`) or commit to the iframe+bridge and delete `RecipientView`/`recipient-view.tsx`. Don't ship both half-wired.
5. **[MED] Studio: harden `currentHtml` runtime-strip** (`page.tsx:199-200`). The regexes depend on byte-exact serialization of two separately-defined `frameDoc`s (`page.tsx:41-44` vs `page-html.ts:11-14`). Strip by DOM (remove `script[src="/peek-runtime.js"]` and the `__PEEK__` setter node) instead of regex, or share one `frameDoc`. Prevents the runtime script leaking into persisted HTML / double-injection.
6. **[MED] Studio: add stream abort/timeout** (`page.tsx:226-257`). No `AbortController`; a dropped/stalled SSE connection wedges `busy=true` and locks the composer until reload.
7. **[MED] Reduce studio same-origin exposure** (`page.tsx:272` `allow-same-origin`). Required today because the studio drives the iframe via `contentDocument`. Move studio control to the same `postMessage` bridge so `allow-same-origin` can be dropped, closing the cookie/same-origin-exfil footgun on model-authored markup.
8. **[LOW] Studio: persist/resume `peekId`** (`page.tsx:56`). A refresh mints a new id (`newPeekId`) and orphans the in-progress draft; store it (URL param / localStorage) to allow resume.
9. **[LOW] Runtime/studio polish:** `addStyle` dedupe (unbounded `<style>` accumulation, `page.tsx:108-111`); restore morph-based streaming instead of `srcdoc=` full reload (`page.tsx:92`) to stop animation/scroll resets on every `set_page`; `startMic` handle `onerror` to avoid a stuck `listening` pill (`page.tsx:131-146`).

Punch-list item count: **9** (2 blockers, 2 high, 3 medium, 2 low — #9 bundles three low-sev polish items).

Note on the LLM call (not a render/runtime item, verified as sound): `lib/curator/turn.ts:14` uses model id `claude-opus-4-8` with `thinking: {type:"adaptive"}` (`:55`) and `.stream()` (`:61`) — all current and correct for Opus 4.8; no migration needed.
