# IN-SITE CHAT — BUILDOUT STATUS

_Branch `claude/in-site-chat-buildout` (forked from `studio-integration`; originals untouched — revertible by ignoring this branch). PR #13. Companion: `IN-SITE-CHAT-MASTER-PLAN.md` is the design; this file is the live progress._

**Green baseline, held at every commit:** `@peek/core` 57 tests · `@peek/web` 47 tests · both `tsc --noEmit` clean · `next build` clean (11 routes). Nothing was committed that regressed it.

---

## ✅ Done (committed + verified)

### Phase 1 — Chat-brain caliber
The voice was canonical but **vocabulary-starved** — told to vary fonts / steal genre codes with no materials, so it regressed to default fonts (= generic). Fixed:
- `pantry.ts` — the house design pantry (`DESIGN_ENGINE_TOOLKIT` §1–§9: the ~211-font personality taxonomy + pairs-with, the type-art CSS library, palettes, worlds, motion/scenes/motifs/frames), faithfully transcribed and **reframed** as "raw material, never a rulebook"; the rejected §10 resolver/IR engine stripped.
- `exemplar.ts` — one tagged few-shot (the "For the Old Man" work order; design preserved, `data-peek-*` tags added with stable ids).
- `system-prompt.ts` — split into `PEEK_METHOD` + `PEEK_CONTRACT`; added the phone-under-glass canvas, a concept→motion seed table, the "what the page can't contain" sanitizer reality, and a 10-axis **self-critique gate** (runs in the model's thinking).
- `prompt.ts` — `buildCuratorSystem()` assembles **4 byte-stable cached blocks** (method · pantry · few-shot · contract).
- Stood up the `@peek/web` vitest harness.

### Phase 2 — Dual representation (the architecture)
The model keeps authoring freeform HTML for caliber; a structured spine is kept in lockstep for commerce/state/PerfectPurchase.
- **Envelope** (`@peek/core`): `PeekDocument = { spine: PeekIR (verbatim), presentation: { html, html_hash, runtime_version } }`; `validatePeekDocument` accepts bare v1 IRs (back-compat, +4 tests).
- **Extraction** (`extract.ts`): `extractSpine(html)` derives `Card[]` + `VariantGroup[]` + budget from the `data-peek-*` tags; `KIND_MAP` folds the 6 authoring kinds → the 4 canonical `CardType`s. 24 tests, verified against the real exemplar.
- **Persistence** (`store.ts`): stores the whole envelope in the existing `doc` jsonb column — **no schema change, the live DB is untouched**. `loadPeek*` return the spine (commerce/pick callers unchanged); `loadDocument*` return the envelope.
- **Autosave** (`route.ts` + `page-html.ts` + `draft.ts`): the curator route reconstructs the page server-side (`applyPageOp`) and persists the envelope after every turn — best-effort, key-gated, surviving a mid-turn disconnect. **This kills the write-orphan** (the chat's output was never saved before; the route persisted nothing and the "client serializes the iframe" path was never built).

### Phase 3a — Recipient surface + security
- **`/g/[slug]` serves the AUTHORED page** (the caliber the curator built) inside a **sandboxed, opaque-origin iframe** (`allow-scripts`, NO `allow-same-origin`), re-sanitized, runtime in recipient mode — so the page runs its own CSS/SVG/runtime but **cannot reach the app's cookies/Clerk/Stripe**. The IR renderer is kept as the fallback + future og surface.
- **Security fixes:** the unsanitized `custom.html` path (`preview.tsx`, audit **P0**) now sanitizes at paint; the sanitizer's **CSS is hardened** (strip `@import`/`expression`/`behavior`/`javascript:`-in-`url()`; force `rel=noopener noreferrer` on `target=_blank`) while keeping keyframes/gradients/pseudo-elements.

---

## ▶ What works now (end to end, by construction)
land `/studio` → the chat authors a caliber page (live preview) → **autosaved** as `{ html + extracted spine }` → `/g/[slug]` serves that authored page **safely**. The loop's pieces are wired and green.

## ⏳ Built, but the LIVE gate needs a keyed deploy
The live behavior (the real curator turn, persistence, recipient render) needs `ANTHROPIC_API_KEY` + Supabase env — present in the `vnext` Netlify env, absent in the build container. The code is green (typecheck/test/build); the live gate verifies on deploy. To deploy: fast-forward `studio-vnext` onto this branch (per the canon's deploy note), or open it for review first.

---

## 🔜 Remaining (precise next steps)

### Phase 3b — finish the commerce loop
- **Publish ($12):** the studio handles the `saved`/`ready` SSE events → a "Publish · $12" CTA → `POST /api/publish` (**now reachable** — autosave creates the draft it loads) → Stripe checkout (the route + webhook already exist; `markPeekPublished` preserves the presentation). Decide embedded vs. hosted checkout; needs Stripe keys to verify live.
- **Server-validated picks:** the recipient iframe is opaque-origin, so picks need a **postMessage bridge** (iframe runtime → parent → `/api/pick`). Wire `peek-runtime.js` recipient-mode `onAction` → `postMessage`; the parent posts to `/api/pick`. **Critical:** `/api/pick` must pass **caps** to `decidePick` (today caps are never passed → server cap enforcement is dead code). Caps are re-derivable from the stored html via `extractSpine(html).budgetCents` — no extra storage needed.
- **Notify** (port Resend into `apps/web`) + **`next/og`** share card (deterministic, rendered from the spine).
- Terminal gate: one real create→publish→pick→notify run (it has never completed — `picks` table is empty).

### Phase 4 — remaining security (before a public keyed deploy)
- **Gate `/api/curator`** — `apps/web` has **no middleware**, so the paid Opus endpoint is fully open. Add Turnstile (bot/cost) + Upstash rate-limit + auth, key-gated/graceful.
- **CSP + security headers** (next.config / netlify.toml) — verify against the studio on deploy.
- **`url()`-host allowlist** in the sanitizer, paired with **rehosting all imagery** onto the app bucket (so it can't double as an exfil host).
- **SSRF guard** on `url_scrape` (`card-resolver` fetchHtml); **image moderation** on upload/generate/publish.
- The **studio preview** iframe still uses `allow-same-origin` (load-bearing for its direct-DOM patch ops) — refactor those ops to `postMessage` to drop it.

### Phase 5 — eval + taste loop · Phase 6 — PerfectPurchase seams
Per master plan §6: the aesthetic lint floor + vision-judge CI gate; the `commit_concept` / keep-again **taste corpus** compiled into a cached prompt suffix; logging every `resolve_card` as a structured catalog row + GTIN capture + the `CatalogPort`/`EmbeddingPort` stubs.

---

## How to continue
Work on this branch; keep the green baseline; each phase ends in a verifiable gate. Subagents are effective for bounded, isolated modules (the extraction parser + the pantry were built this way and integrated clean). The master plan holds the architecture; this file holds the progress — keep it current so the work keeps compounding.
