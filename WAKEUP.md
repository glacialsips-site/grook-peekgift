# WAKEUP — read this first. Current truth as of 2026-06-04. Don't restart; don't rebuild.

You (a fresh context) are continuing a long build. The #1 failure mode on this project is restarting from
scratch — ~50 non-compounding tries. Do NOT re-derive or rebuild. Read **this**, then `BUILDOUT-STATUS.md`
(what's done + the exact next steps) and `IN-SITE-CHAT-MASTER-PLAN.md` (the architecture). Move the next
step — don't re-mine the repo. If any other doc conflicts with this one, **this wins**; the rest is residue.

## Where the work lives (the only branches that matter — ignore the other ~95)
- **`claude/in-site-chat-buildout` = THE WORK BRANCH.** Latest code + canon live here (PR #13). Forked from
  `studio-integration`. **Push work here. Start every session ON this branch** (else you won't see this work).
- **`claude/studio-vnext` = the Netlify production branch** (deploys to vnext.peek.gift). Deploy by
  fast-forwarding it onto the work branch: `git push origin claude/in-site-chat-buildout:claude/studio-vnext`.
- `claude/studio-integration` = the prior line this forked from (reference). Everything else
  (gallant-planck, atelier-integration, wizardly-mendel, the ~90 packet/wave/lt branches) = OLD residue.

## State (2026-06-04)
- **Green baseline, held at every commit:** `@peek/core` 57 tests · `@peek/web` 47 tests · both
  `tsc --noEmit` clean · `next build` clean (11 routes). Toolchain: node 22, pnpm 10.33.
- **Built this stretch (Phases 1–3a + a deploy fix) — do NOT redo** (full detail in `BUILDOUT-STATUS.md`):
  1. **Chat caliber.** The model was vocabulary-starved (told to vary fonts with no materials → defaulted →
     generic). Injected the design pantry (`apps/web/lib/curator/pantry.ts`), a tagged few-shot
     (`exemplar.ts`), a concept→motion table, and a 10-axis self-critique gate — assembled as 4 cached
     prompt blocks (`prompt.ts`).
  2. **Dual representation.** `PeekDocument = spine (PeekIR, verbatim) + presentation (html)` (`packages/core`).
     `extractSpine()` derives the structured spine from the page's `data-peek-*` tags. The curator route now
     **autosaves** the page (html + spine) every turn — **the write-orphan is dead** (before, the chat's
     output was never saved at all).
  3. **Recipient + security.** `/g/[slug]` serves the AUTHORED page in a sandboxed opaque-origin iframe;
     fixed the unsanitized `custom`-html path; hardened the sanitizer's CSS (`@import`/tabnabbing).
  4. **Deploy fix.** Externalized `@anthropic-ai/sdk` + `node-html-parser` in `next.config.mjs` — Netlify's
     function bundler chokes on the SDK's dynamic shims (curator route 500'd live, fine local + standalone).
- **⚠ DEPLOY IS STUCK — needs Frank.** `studio-vnext` is at the fix (`4e8b226`), but Netlify has not published
  a build since the FIRST one; the live build is still the old pre-fix one (`cgBk-…`), whose `/api/curator`
  500s. The Netlify build pipeline is stalled and the Netlify MCP can't see this site (different team).
  **Frank:** Netlify → `peek-gift-vnext` → Deploys → **"Clear cache and deploy site"**; if the latest build
  shows *failed*, share the error. Also confirm `ANTHROPIC_API_KEY` is on the **Production** context (stray
  503s seen). The fix goes live the moment a build completes — then verify the loop (drive a brief → inspect
  the authored page → confirm the new `peek_v2.peek_documents` row → fetch `/g/[slug]`).

## What this is — the destination (don't lose it)
peek.gift is **V0 of PerfectPurchase, deliberately minus fulfillment.**
- **PerfectPurchase** = a *decision layer between intent and transaction*. User describes a need
  (text/voice/image) → it returns a transaction-ready **assembled bundle** of real products from many
  retailers (masked), for high-friction **"projects, not products"** categories. Own the moment uncertainty
  resolves — not the catalog, not the logistics. Moat = **assembly intelligence** + a system that
  **compounds per category**. Full thesis = Frank's PerfectPurchase Series A brief (confidential; ask him).
- **peek = the wedge**: gift-framed so you ship the proven-hard front-end (aggregate retailers + chat + cool
  presentation) **without owning fulfillment yet** (curator/recipient closes the buy). Gifts are emotional,
  shareable, **self-distributing**.
- **Money model**: peek only needs to **cover COGS + ad spend** (break-even) — the real money is
  PerfectPurchase downstream. Unit economics close via **virality** (every published page ≈ ~free CAC) +
  **controlled COGS** (cap/cache Opus). Both require the output be good enough to forward.
- **Fulfillment (auto multi-retailer buying) is DEFERRED** — build the front-end now; add it when agent
  reliability catches up.

## The V0 win condition — the only two things that matter
1. **Resolution that doesn't break** — reliably turn any link or fuzzy ask into real products (image, price,
   title) across retailers. The `CardResolver` cascade (retailer API → scrape/ZenRows → LLM web+vision) is
   the foundation — stress-test it; everything sits on it.
2. **Output people forward** — the eye-popping, non-generic quality bar. Generic = nobody forwards = the loop
   dies. ("Generic is the only failure.")

## Next (the precise, file-cited list is in `BUILDOUT-STATUS.md` § Remaining)
- **Phase 3b — finish the loop:** publish ($12, now reachable thanks to autosave) → server-validated picks
  (postMessage bridge from the recipient iframe → `/api/pick`, **passing caps** — today caps are never
  passed, so server cap enforcement is dead) → notify (Resend) → `next/og` share card. Terminal gate: one
  real create→publish→pick→notify run (it has never completed; `peek_picks` is empty).
- **Phase 4 — remaining security (before any public launch):** gate `/api/curator` (Turnstile + Upstash
  rate-limit + auth — `apps/web` has NO middleware), CSP, `url()`-host allowlist + image rehosting, SSRF
  guard on `url_scrape`, image moderation.
- **Phase 5 — eval + the concept-gate/reject taste loop** (capture taste as rejections). **Phase 6 —
  PerfectPurchase seams** (log every `resolve_card` as a catalog row, GTINs, pgvector). Master plan §6–7.

## Practical reality
- **Setup:** the SessionStart hook (`scripts/bootstrap.sh`) runs `corepack enable && pnpm install`, so deps
  are ready on startup. It also prints the read-first pointer. Gates listed above.
- **Keys:** `.env*` is gitignored → NOT in a fresh container. Build/tests/typecheck are green **without**
  keys. Netlify holds ANTHROPIC/SUPABASE/STRIPE/etc → the deploy is fully live once it builds. To test the
  curator turn in-session, ask Frank to drop `ANTHROPIC_API_KEY`. Don't nag about key hygiene.
- **Files:** `apps/web/lib/curator/*` = the chat (system-prompt/pantry/exemplar/tools/turn/prompt/page-html/
  draft/extract) · `apps/web/app/api/curator/route.ts` = the SSE turn + autosave · `apps/web/app/g/[slug]/
  page.tsx` = recipient · `apps/web/lib/persistence/store.ts` = envelope persistence · `apps/web/lib/
  sanitize.ts` = the sanitizer · `packages/core` = the spine (PeekDocument, decide/apply, render, picks,
  ports). Tests in `packages/core/tests/` + `apps/web/tests/`.
- Headless screenshots don't paint webfonts — verify caliber on the deploy, not local captures.

## Standing directives (Frank — override older docs)
- Frank = product/taste/vision; Claude = mechanics/functionality. Work *with* him.
- **No embedded checkout** beyond the $12 publish path · **no landing page yet** · build LIVE, no mock · be
  terse (chatting costs ~50× working).
- **Verify before asserting** — never claim missing/broken/stubbed without evidence. Frank loathes base64.
  Frank does not read git.
- All live-prod work (git, deploys, the URL cutover) is Claude's via the connectors; Frank touches nothing live.

## Operating truths (hard-won — the meta-fix)
- **Don't restart. Don't rebuild.** The disease was ~50 non-compounding tries; the cure is one held line +
  this canon. Each session must *add*, not reset.
- **Capture Frank's taste as rejections, not essays** — prose softens into generic mush. His "no"s are the spec.
- **This file is the one source of truth. Keep it current at the END of every session.** Anything not
  reflected here is residue until it is. (Never put a model id in commits/PRs/artifacts.)

Go. The work is real and committed; the only thing between it and live is one stuck Netlify build.
