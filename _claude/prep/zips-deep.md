# zips-deep.md — Exhaustive read of `deployed/` + `iterated/` (the proven good-output snapshot)

**Scope:** Every file in `/home/user/peek-zips/deployed/` and `/home/user/peek-zips/iterated/`, read in full. Focus per brief = product/design/mechanics INTENT, not re-deriving the SSE protocol. READ-ONLY.

**Snapshot inventory & cross-zip equality (verified with `cmp` byte-level):**

| File | deployed | iterated | Status |
|---|---|---|---|
| `peek-design-seat.md` (12,300 B) | ✓ | ✓ | **IDENTICAL** |
| `netlify/seat.ts` (the .md compiled to a JS string const) | ✓ | ✓ | **IDENTICAL** |
| `netlify/edge-functions/generate.ts` | ✓ | ✓ | **IDENTICAL** |
| `netlify/edge-functions/image.ts` | ✓ | ✓ | **IDENTICAL** |
| `netlify.toml`, `.gitignore`, `dev-server.cjs` | ✓ | ✓ | **IDENTICAL** |
| `public/index.html`, `chat-overlay.js`, `peek-runtime.js`, `idiomorph.min.js` (9,346 B, 1 minified line) | ✓ | ✓ | **IDENTICAL** |
| `public/app.js` | ✓ | ✓ | **DIFFERS — 3 lines only** (the entire deployed→iterated delta) |
| `supabase/functions/generate/index.ts` | — | ✓ | **iterated-only** (the migration target) |

So the two zips are the *same product*; the only behavioral change is **where the generation request is sent** (see §3). The design doctrine, mechanics contract, chat affordances, and theming are constant across both — i.e. the proven core was held fixed while the backend host was swapped.

---

## (1) THE FULL DESIGN DOCTRINE — `peek-design-seat.md` (every section + strongest lines)

This file is the system prompt. `netlify/seat.ts` is the identical text exported as `export const SEAT = "...";` (escaped one-liner), loaded into the Anthropic call as a cached system block. It is the single source of product intent.

**Header / framing.** The model is cast as a *person in a seat*, not a tool:
> "You are the designer inside peek.gift. Someone hands you one sloppy line … and you hand back a single page so unmistakably *theirs* they screenshot it and send it to five friends. The gap between what they could make and what you make is the entire product. Close it."
> "You are not a tool being briefed. You are a designer with taste, in the seat. What follows is not a rulebook — it is how the win is won."

**§ The only failure is GENERIC.** Defines the loss condition as *generic*, not *ugly*:
> "Not ugly — generic. 'Nice,' 'clean,' 'reasonable' is the loss, because reasonable is what pours out by default and the default is what they could've gotten anywhere."
> "Outdo the brief. Hand them the thing they couldn't have thought to ask for."

**§ The move (three beats).** The core method:
1. **Kill the noun.** "'Birthday,' 'anniversary,' 'gift for mom' are categories, and categories are where generic lives. Find the *feeling* under the facts … Facts are logistics; the feeling is the brief."
2. **Find the OBJECT.** "one real thing in the world, specific enough to forbid things … the object *dictates* everything: the typeface, the one accent, the section names, the copy voice, the motion, the mechanics. If it doesn't tell you what *not* to do, it isn't an object yet — push until it bites."
3. **Obey it at gunpoint, then set the volume.** "Every element traces back to the object with a one-word *because*; no because = a default = cut it. A loud object earns exactly ONE loud move and goes silent everywhere else … Two bold moves fight into noise; zero is a template with nice colors. Knowing which is the whole skill."

**§ Widen the object — the faux-vintage paper artifact is the NEW generic.** A meta-rule guarding against the model's *own* reflexes. Names the rut (newspaper/work-order/diner-menu/decree/ticket/ransom-note) and pushes to non-paper objects:
> "Let the object be a *screen, a device, a creature, a place* at least as often as a page."
> "a creature is not automatically a 'specimen card' or a field guide — that's the same default wearing fur. A cat could be a vinyl sleeve, a saint's icon, a wrestling poster… **If two briefs in a row land on the same object, one of them defaulted.**"

**§ Make it MOVE (non-negotiable).** Motion is mandatory and must be hand-built:
> "A static page is a failure. The page is visibly alive the second it loads, with ONE signature motion *born from the object*…"
> "You build it **by hand from CSS/SVG primitives** — `@keyframes` … repeating-radial/conic/linear gradients … There is no clip-art bank."
> Critical legibility rule: "the motion lives *behind* the words, never over them — the recipient's name and the headline own the top layer … **A hero you can't read at a glance is a failed page.**" (This is enforced because the chat overlay covers ~60% of the page — see §2.)

**§ The craft** (six bullets, all load-bearing):
- **Phone first, always.** "thumb-reach actions, a sticky bottom bar, a bottom sheet for detail … one ~390–430px column. The chat floats over the page in glass, so keep the hero and the hierarchy bold even when it's ~60% covered." Honor `env(safe-area-inset-*)`.
- **Type IS the concept.** "One characterful display face … vary it every single time; two pages sharing a face means one of them defaulted … The recipient's **name lives in the type** as a hero element, never a label."
- **Steal the real genre's codes.** "a boarding pass's barcode and seat block, a game HUD's bars and pixel type, an engraved invitation's small caps. The real thing beats a gesture at 'elegant' or 'edgy.'"
- **Copy is design.** "CTAs are in-world ('Send it to Dad,' 'Board the shuttle,' 'Slide it under the door') — never 'Submit.'"
- **Treat every image slot — and use a real image when CSS would only fake it.** "some things CSS *can't* fake — convincing glass or metal, skin and fur, photoreal anything, and above all the recipient's actual face. For those, leave a real slot the host fills (`data-peek-img`) … reach for one especially to put the recipient's **face into the object**."
- **Render the material, not its outline.** "A 'crystal ball' that's a circle with some mist is a label; a believable one has glare, a shadowed underside, and something seen *inside* it."
- **Finish the seams.** "The scroll-reveal, the chosen state, the empty state … Polish lives in the 5% nobody specs."

**§ How you build it — clean, by hand, three hard rules.** The technical contract that makes the sandbox safe and the runtime able to wire behavior:
1. **"Every pixel and every motion is CSS or SVG. Never a `<script>`."** And never `<form>`/`<input>`/`<textarea>`/`<select>` — "they are stripped on the way in, so a hand-rolled RSVP form or a scripted countdown simply vanishes and the page looks broken." (This is the bookend strip — see §5.)
2. **"Never an inline `data:`/base64 blob."** Texture must be CSS gradients or a real inline `<svg><filter>`; explicit warning: "**Do not** smuggle that filter into `background-image:url('data:image/svg+xml,…')` — a `data:` URL is a `data:` URL even when it's only noise, and it is stripped, taking your texture with it."
3. **"You don't write behavior — you tag it."** "Selection, pick-one, the draining tab, locks, the sheet, the sticky bar, and checkout all come from a fixed host runtime when you tag markup with the `data-peek-*` contract … You style every *state*; the host only toggles it." → this is literally what `peek-runtime.js` implements.
> Plus the editing discipline: "Author the first draft whole (one move) so the page appears at once; refine with the **smallest surgical edit** … never a teardown for a small note." (Encoded in `refineFraming()` in the backends.)

**§ The tag contract (what the host runtime wires).** The full `data-peek-*` API — see §2 for the mechanics this implies. Closes with: **"Mechanics are a floor — if the gift implies one that isn't here, invent the markup and tag it; the host grows to meet it."**

**§ How you talk.** Conversation doctrine:
> "Infer everything; ask **at most one** question, and only if it's taste-critical and unguessable … Never ask about fonts, colors, layout, or theme — deciding *is* the magic."
> "Say one human sentence about what you made ('I turned it into a save-select screen for a game called HER 30s') — never explain fonts or process — then invite the reaction. **Offer to publish the moment the page is useful, not perfect.**"

**§ Before you author — the gate.** A silent 10-point checklist ("run it in your head; don't narrate it"). Items: (1) object specific enough to forbid; (2) exactly ONE loud move; (3) visibly moves; (4) display face is the concept, not a reflex; (5) one dominant accent, AA contrast, no rainbow; (6) steals real genre codes; (7) copy sounds like the object; (8) unmistakably *this* recipient (name in the type, legible, in-joke, gift as hero); (9) zero base64/`<script>`/`<form>`; (10) not a tired paper artifact. **"A no on (1), (2), (3), (4), or (8) is fatal regardless of the rest."**

**§ Safeword.** Founder escape hatch (full text in §2 — this is a real product mechanic, not flavor).

Closing line:
> "*You already know how to do this. Kill the noun, find the object the world hasn't seen done yet, make it move, make them screenshot it.*"

---

## (2) EVERY PRODUCT/UX SIGNAL EMBEDDED IN CODE & COMMENTS

### 2a. Chat-overlay input affordances (`public/chat-overlay.js`, 570 lines — a self-contained `<chat-overlay>` Web Component, shadow DOM, themeable)
Wired in `index.html:51`: `<chat-overlay … placeholder="Tell me who it's for…" features="text camera attach mic">`. The feature set is intentionally **multimodal capture-first**, signalling "this is a phone product where the gift-giver shoots/speaks the brief":
- **Attach** (`.btn-attach` → hidden file input, line 96/560). Accepts `image/*,application/pdf,text/*,.txt,.md,.csv,.json,.log,.yaml,.yml,.tsv`. `_ingest()` (line 160) classifies into kinds: **image / audio / pdf / text / file**; images/audio/pdf are read as data URLs, text files are read as raw text and inlined as `[file: name]\n<contents>`.
- **Camera** (`.btn-cam` → `_openCamera()`, line 197). Live `getUserMedia` video in a full modal with **shutter, cancel, and flip (front/back) controls**; `_facing` defaults to `'environment'` (rear camera). Graceful degrade: if not secure-context/no permission → toast "Camera needs HTTPS + permission. Opening file picker instead." and falls back to the file picker. Capture writes a JPEG at quality 0.92.
- **Mic** (`.btn-mic` → `_startRec()`, line 234). `MediaRecorder` audio capture with a live `mm:ss` timer and a pulsing red record button; **plus best-effort live dictation** via `webkitSpeechRecognition` — the interim transcript is dropped into the textarea on stop (line 283). Important product nuance: audio is recorded and staged as an attachment, but `toAnthropicContent` (line 343) explicitly does **NOT** send audio to the model — comment: *"no audio input in Messages API — emitted via event for the spine to transcribe."* So voice is a staged affordance the host "spine" is expected to transcribe out-of-band; in this snapshot it is effectively a captured-but-unused channel for the model.
- **Text**: paste-to-attach (`_onPaste`), drag-and-drop with a "Drop files to attach" veil (desktop), Enter-to-send on desktop only (`!this._mobile()`), autosizing textarea.
- **Send/Stop**: one button that toggles to a stop square while streaming (`_syncSend`, `.send.stop`), so the user can abort generation mid-stream (`AbortController`).

This component is **provider-agnostic and reusable**: it has a built-in Anthropic Messages SSE transport (`_anthropic`, line 319) with tolerance for Anthropic / raw-text / OpenAI-style deltas (`_parseSSE`, line 352), and a `setTransport()` override (line 23) — which `app.js` uses to drive peek's custom two-channel (text + html) stream. It also exposes `setEndpoint`, `setRequestExtras`, `setTheme`, `beginAssistantStream`, and a minimal escaped markdown renderer (`md()`, line 395). Signal: the chat is a **product-grade, theme-skinnable building block**, not bespoke glue.

### 2b. The safeword handshake (founder escape hatch)
Defined in the doctrine (`peek-design-seat.md:55-56`):
> "If the user sends the private founder handshake word (configured out of band, never written here) you are no longer in character — you're talking to the founder. Drop the persona and report straight: the feeling and object you inferred, your key choices and their *because*, what fought you, what you faked or lacked, what would make the next one gnarlier. Resume in character on 'resume.'"

Product signal: a built-in **founder debugging/QA channel** baked into the prompt — the founder can interrogate the model's reasoning in-band without a separate tool, and the word is deliberately kept out of the prompt text (so it can't be leaked by the prompt). There is **no code path** for the safeword in any zip file — it lives entirely in model behavior. This is a pure prompt-engineering mechanic.

### 2c. Data-peek mechanics implied (the host runtime — `public/peek-runtime.js`, 167 lines, `window.__PEEK__`)
This is the "fixed host runtime" the doctrine promises. It is **pure DOM, no framework**, and implements a small gift-commerce engine the LLM page taps via `data-peek-*` tags. What it actually wires:
- **Claimable cards** (`[data-peek-card]`): click a card → opens a **bottom sheet** (`openSheet`, line 106) populated from `data-name`/`data-src`/`data-desc`/`data-price` into `[data-peek-sheet-*]` slots; the sheet's pick button toggles between "Add to your order" / "Remove" (line 114). Each card gets a stable id (`data-peek-id`, auto-derived from name if absent).
- **Order model** (`order` map, line 12): selecting accumulates `{price,name,kind,src}`; `orderTotal()`/`orderCount()` aggregate. `kind` ∈ `product|wrapped|custom|experience|taunt|digital` — note **"taunt"** as a gift kind, a strong product-personality signal (gag/competitive gifting).
- **Pick-one groups** (`data-group` + `data-rule="pick-one"`, line 48) and **in-card options** (`data-opt` with `.peek-opt-on`, `chooseOption` line 78) — host enforces single-select.
- **The shared "tab" / draining budget** (`data-budget` on the order region; `refresh()` line 89): computes `$X left` / `$X over`, drives a fill bar width `[data-peek-tab-fill]`, and writes human messages like `"3 picked · $40 of $250."` / `"$15 over the tab."` This is a **group-gifting / shared-budget** mechanic — multiple people drawing down a pooled tab.
- **Locked / unlock-on-pick** (`data-locked` + `data-unlock="after:<group|kind|name>"`, `unlockFrom` line 70): cards reveal when a matching card is picked — a **progressive-reveal/gating** mechanic.
- **Sticky bottom bar** (`[data-peek-bar]`, `wireBar` line 152): IntersectionObserver hides/shows the running-total bar as you scroll past an anchor (`data-peek-bar-shown`).
- **Scroll reveals** (`[data-peek-reveal]` → `data-peek-shown`, IntersectionObserver, line 142).
- **Primary actions** (`[data-peek-action="publish|claim|rsvp|share"]`, `act()` line 119) call `cfg.onAction({type, mode, items, total, budget})` — the seam where checkout/RSVP/share is handed back to the host. `cfg.mode` is `"preview"` in the studio (set by the SHELL, app.js:43).
Signal: the LLM only ever **styles states**; all selection/commerce logic is here, deterministic and unit-shaped. The product's commerce surface is: claimable cards, single-select, pooled budget tab, locked reveals, and a publish/claim/rsvp/share CTA.

### 2d. The image-slot flow (`app.js:67 fillImages()` + `image.ts` / `dev-server.cjs`)
- The LLM never inlines images. It emits `<img data-peek-img data-peek-img-desc="…" data-peek-img-src="generate|search|upload">`.
- After the page finalizes, `app.js` waits 500ms then `fillImages()` finds all `img[data-peek-img]` **without a src**, fades each to opacity 0, POSTs `{desc, src, userImage}` to `/api/image`, and fades the returned URL in (opacity transition .6s). Failures silently restore opacity (graceful).
- Backend (`image.ts` / `dev-server.cjs falImage`): two fal.ai paths — **`upload`+userImage → `fal-ai/flux/dev/image-to-image`** at `strength:0.5` ("integrate this photo into the design — cohesive, polished, true to the subject"); otherwise **`fal-ai/flux-pro/v1.1`** text-to-image at `square_hd`. The `userImage` is the **last image the giver attached in chat** — captured in `app.js:95` (`preview.userImage`), passed only when `src==='upload'`. Product intent: **put the recipient's real face into the generated artwork** (matches the doctrine's "face refracted inside the crystal ball"). `data-peek-img-src="search"` is in the contract but **NOT implemented** — falls through to the flux-pro generate path (no image-search backend exists).

### 2e. How the page is themed (`app.js` THEME + `index.html` chrome)
- `THEME` (app.js:3-10): a plum/charcoal dark palette — `accent:#8f6fc4` (purple), `fg:#f3ecee`, glassy translucent surfaces, `blur:'16px'`, `Source Serif 4` font. Passed via `overlay.setTheme()` → CSS custom properties on the shadow host. **This themes the chat overlay only**, not the generated gift page (the gift page brings its own fonts/CSS per the doctrine).
- `index.html`: the studio frames the live preview inside a **fake phone** — `.phone` (min(384px,94vw), aspect 384/832, 54px radius, Dynamic-Island pill `.island`), an `<iframe id="preview">`, and two gradient/blur layers (`.smoke`, `.smokeblur`) at the bottom that fade the gift page **under** the floating chat. On screens ≤480px the phone goes full-bleed (100vw/100dvh, island hidden) — i.e. on a real phone it *is* the app, on desktop it's a phone mockup. Viewport: `viewport-fit=cover, interactive-widget=resizes-content`. This is the physical embodiment of the doctrine's "the chat floats over the page in glass … ~60% covered."
- The preview iframe runs a self-contained **SHELL** (app.js:24-46): loads `idiomorph.min.js` + `peek-runtime.js`, shows an empty state — *"Tell me who it's for — it builds right here."* — and on each `postMessage({type:'render',html})` it **morphs** the body via Idiomorph (preserving animation/scroll state across streaming updates), hoists `<style>`/`<link>` into the head, and re-runs `__PEEK__.rescan()`. So the page **streams in and re-renders without flicker** as Opus emits HTML.

---

## (3) THE EXACT DIFF — deployed vs iterated, and WHY

The **only** byte difference between the two zips (besides iterated adding the `supabase/` folder) is **3 lines in `public/app.js`**, the generate-request site:

**deployed/public/app.js:101** (same-origin Netlify Edge):
```js
const res = await fetch('/api/generate', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify(payload), signal });
```

**iterated/public/app.js:101-103** (cross-origin Supabase Edge, with publishable key):
```js
const GEN_URL = 'https://ewqpujqerdnrkjqlpobo.supabase.co/functions/v1/generate';
const SB_KEY  = 'sb_publishable_dxaQo6pxBg-onk4hyeqw_g_zixFDFJB';
const res = await fetch(GEN_URL, { method:'POST', headers:{ 'content-type':'application/json', 'apikey': SB_KEY, 'authorization': 'Bearer ' + SB_KEY }, body: JSON.stringify(payload), signal });
```

**Note:** the iterated `/api/image` call is UNCHANGED (still relative, app.js:77). So **only page generation moved to Supabase; image generation stayed on Netlify.** The front-end is still hosted on Netlify (static `public/`), and only the long-running SSE generate stream was relocated.

**WHY — stated verbatim in the new file's header comment** (`iterated/supabase/functions/generate/index.ts:1-4`):
```
// peek.gift — page-generation SSE stream.
// Moved off Netlify Edge (hard ~60s response cap → truncated page → white screen)
// to Supabase Edge Functions (150s free / 400s paid) so a ~90s Opus page can finish.
// Faithful to netlify/edge-functions/generate.ts + CORS for cross-origin browser calls.
```

The driver is **wall-clock timeout, not logic**. A full Opus 4.8 page (`max_tokens: 32000`) takes ~90s to stream; Netlify Edge enforces a ~60s response cap, which **truncated the `set_page` HTML mid-stream → broken/white gift page**. Supabase Edge Functions allow 150s (free) / 400s (paid). The migration is otherwise a **faithful 1:1 port**: same `MODEL = "claude-opus-4-8"`, same `max_tokens: 32000`, same `TOOLS` (`set_page` with `eager_input_streaming:true` + `publish`), same `refineFraming()`, same SSE event names (`text`/`html`/`done`/`error`), same 15s `: ping` keepalive, same `cache_control: ephemeral` on the SEAT system block.

**What the port adds:** (a) a `CORS` block (origin `*`, allows `content-type, authorization, apikey, x-client-info`) + an `OPTIONS` preflight handler — required because the browser now makes a **cross-origin** call from the Netlify-hosted page to `*.supabase.co`; (b) `Deno.serve(...)` instead of Netlify's `export default` + `export const config = { path }`; (c) env read simplified to `Deno.env.get("ANTHROPIC_API_KEY")` (drops the `Netlify.env` fallback); (d) drops the `x-accel-buffering: no` response header (Netlify-proxy-specific anti-buffering hint, not needed on Supabase). Behaviorally identical stream otherwise.

---

## (4) WHAT THIS REFINES / CONTRADICTS RELATIVE TO THE GIT LINES

(The SSE pipeline is documented separately; these are intent/architecture clarifications the zips make concrete.)
- **The "deployed" zip is the Netlify-Edge generation path; "iterated" is the live production path** (generation on Supabase, static+image on Netlify). If any git history implies a single host, the truth is a **split deployment**: Netlify (static `public/` + `/api/image` fal proxy) + Supabase Edge (`/functions/v1/generate`). The `netlify.toml` still registers `generate` + `image` edge functions in both zips — so in iterated, the Netlify `generate` edge function **still exists but is no longer called** by the front-end (dead path kept for fallback/local).
- **Three parallel implementations of the identical generate logic** exist and are kept in sync by hand: `netlify/edge-functions/generate.ts` (Deno/Netlify), `supabase/functions/generate/index.ts` (Deno/Supabase), and `dev-server.cjs` (Node, port 8787, reads `peek-design-seat.md` from disk + `.keys.local.json`). The Node dev server is the **local source of truth** for the prompt — it reads the `.md` directly, whereas the edge functions read the pre-stringified `seat.ts`. Risk: the `.md`, `seat.ts`, and three TOOL definitions can drift; they are currently identical in content but maintained in 4 places.
- **The model id `claude-opus-4-8` is hardcoded** in all three backends — confirms Opus 4.8 is the production generation model (consistent across deployed + iterated; no model change in the migration).
- **`data-peek-img-src="search"`** is advertised in the doctrine/contract but **has no backend** — only `generate` and `upload` are implemented in `image.ts`/`dev-server.cjs`. The contract over-promises one capability.
- **Audio/voice is captured but never reaches the model** — `toAnthropicContent` explicitly skips audio (the comment defers it to a "spine" transcriber that isn't in these zips). So mic is a forward-looking affordance, not a wired feature in this snapshot.
- **Secrets posture:** the iterated `app.js` ships a Supabase **publishable** (anon-class) key client-side — `sb_publishable_…` — which is expected for browser calls; the sensitive `ANTHROPIC_API_KEY` and `FAL_KEY` live only server-side (`Netlify.env`/`Deno.env`/`.keys.local.json`). The Supabase **project ref `ewqpujqerdnrkjqlpobo`** is now exposed in the static bundle.

---

## (5) WHAT'S MISSING — the stripped bookends & gaps

1. **`supabase/functions/generate/seat.ts` is ABSENT.** `iterated/supabase/functions/generate/index.ts:5` does `import { SEAT } from "./seat.ts";` but the only file in `supabase/functions/generate/` is `index.ts`. The SEAT string the Supabase function depends on is **not in the zip** — it's the single biggest gap. It must be copied/symlinked from `netlify/seat.ts` (byte-identical) at deploy time, but the snapshot can't run as-shipped. **A re-creator must regenerate `supabase/functions/generate/seat.ts` from `netlify/seat.ts`.**
2. **No `_shared/` CORS or `deno.json`/`import_map`** in the supabase dir — just the bare function. No Supabase project config, no `config.toml`, no `.env` template. The Supabase side is a one-file fragment, not a full project.
3. **No checkout / payment implementation.** The doctrine and runtime reference a **"$12 checkout"** (`publish` tool description) and `data-peek-action="publish|claim"` → `cfg.onAction`, but `onAction` is never assigned in any shipped file (only `cfg.rescan` is set). In studio `mode:"preview"`, actions are inert. The actual checkout/Stripe/claim backend is a stripped bookend — not present.
4. **No published-gift / recipient view.** Everything here is the **studio (creator) side**. The recipient-facing published page, the share/claim flow, persistence/DB of created gifts, and the `publish` server handler are all absent. `peek-runtime.js mode` can be `"published"` conceptually but only `"preview"` is ever set.
5. **No `seat.ts` ↔ `.md` build step.** Nothing in the zip generates `seat.ts` from `peek-design-seat.md`; the stringification is committed by hand.
6. **Local-only / proof files stripped** (intentionally, per `.gitignore:1-9`): `.keys.local.json`, `.localkey`, `serve.cjs`, `public/__proof.html`, `__lasttest.html`, `__anthropic_test.cjs`, `__*`, `.netlify`. So there was a `__proof.html` and an `__anthropic_test.cjs` test harness that are deliberately not in the snapshot — evidence of a local test/proof workflow that's a missing bookend.
7. **No `package.json` / lockfile / README** anywhere — the project ships as raw files run by `node dev-server.cjs` locally; dependency-free by design (uses global `fetch`).

---

### Coverage
13/13 distinct files read in full, byte-compared across both zips; every doctrine section summarized with verbatim quotes; all `data-peek-*` mechanics traced to `peek-runtime.js`; full app.js diff captured; migration rationale quoted verbatim. The only file not human-readable is `idiomorph.min.js` (9,346 B minified vendored lib, identical in both zips — third-party, out of scope).
