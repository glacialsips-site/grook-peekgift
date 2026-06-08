# 01-BUILD-PLAN-V2 — the red-team-hardened line (my own)

> Supersedes 00-BUILD-PLAN where they differ. Written after a 6-agent red-team that
> attacked the real clean-slate code (`_claude/prep/redteam-*.md`). Frame stands: the
> existing code is the FLOOR, the zip is the bar to beat, the plan is mine.

## VERDICT (what the red-team proved, with code)
clean-slate is a **beautiful shell with no working loop, and a regression from the zip**:
- **Loop can't close:** recipient `/g/<slug>` serves HTML in a `sandbox="allow-scripts"` iframe with **no `onAction`, no postMessage bridge**; the only `/api/pick` caller is the IR-fallback that never renders. `picks=0` is structural, not incidental. (`redteam-seam` H1, `redteam-deploy-data` L1)
- **No money button** on the frontend; `/api/publish`+webhook are orphaned; no `@stripe/stripe-js`. (`deploy-data` L2)
- **Push deploys nothing:** `.github/` was stripped, `netlify.toml` names the dead `gallant-planck` branch → first deploy is a silent no-op, old atelier keeps serving. (`deploy-data` L4)
- **Caps can't be enforced:** `PeekIR.Peek` has **no budget field**; `buildDraftDocument` discards `budgetCents`; `decidePick` is called without `caps`. (`deploy-data` L3, all six)
- **No notify code** anywhere in `apps/web`. (`deploy-data` L7)
- **Regressions from the zip:** model is **amnesiac** (page HTML never fed back → every edit re-authors the whole page); studio **hard-reloads the iframe** (idiomorph dropped → white-flash, lost state); **no keepalive ping** + Netlify 120s function = the ~90s-Opus timeout the zip escaped by moving to a 150s host. (`redteam-quality-loop` H1/H2/H4)
- **Open `/api/curator`** (no auth/rate-limit/botGate) = ~$90K/day abusable Opus; **fee-at-publish vs compute-at-authoring** = negative economics on non-publishers; **Opus hardcoded** (the dial doesn't exist). (`redteam-cost-abuse`)
- **Security not built:** same-origin `srcDoc` (cookies safe only because `allow-same-origin` is absent — one edit from catastrophe), CSS overlay-clickjack + `url()` exfil (sanitizer is a 4-rule regex), `resolve_card` SSRF, no CSP. (`redteam-security`)
- **"Gate validates the spine" was my own hand-wave:** `decide()` is for structured-IR commands, not HTML-derived cards. The honest gate is `extractSpine.issues[]` + a coverage check — currently **dropped on the floor** (`draft.ts:25`).

## PHILOSOPHY (corrected)
Mine, not theirs. The **zip's proven mechanics are the floor** (freeform + morph + keepalive + feed-back + 150s host) — restore and exceed them. **Meat-first.** Overbuild the **seams + ports**, not a gate. A **local golden-brief harness** kills the deploy→tweak→redeploy spiral structurally. Nothing destructive; live tests on a fresh site only.

## OWNER-CONFIRMED HARD BANS (failure modes — never reintroduce)
**no IR · no base64 · no Tailwind.**
- **No IR (the big one — it deletes a whole class of red-team bugs).** The authored **HTML is the single source of truth.** There is **no maintained structured-IR/spine document** kept in lockstep — that was both the bland-maker the owner scrapped *and* the source of the spine↔skin drift the seam red-team found (server mints one `Card.id`, client mints another → picks miss; edit turns wipe the spine; "the gate validates the spine" was a hand-wave). Persist the **HTML + a few flat indexable columns** (`slug/status/occasion/recipient/budget_cents/curator_id`). Commerce — picks, caps, pick-one/locks/taunt — is a **transient server-side parse of the `data-peek-*` tags at request time**, never a persisted IR. **One id source:** the `data-peek-id` the model authors, read by *both* the runtime and the server (so the id-mismatch bug cannot exist). The only author-time "gate" is a **tag well-formedness + coverage check** (every visible card has a stable `data-peek-id`, prices parse, a budget exists) — surfaced from what `extractSpine.issues[]` already computes and currently throws away.
- **No base64:** real image URLs (fal/upload) + CSS/SVG filters only; sanitizer strips `data:`. (Already in the SEAT doctrine — now a rail.)
- **No Tailwind:** runtime CSS-variable tokens only; pages author their own bespoke CSS; delete the stale root `package.json` Tailwind leftover, never re-add.

## CRITICAL PATH (each step ends in a GATE; a gate that can't pass is a STOP)
- **0 · Local green** — ✅ `pnpm -r build` passes on our branch.
- **1 · Cheap, not-backfillable seams (NOW, before the first real write):** `actorId` on every event; a flat `budget_cents` column (the `data-budget` tag is parsed then discarded today — persist it for enforcement + indexing, no IR); widen `payment.verifyWebhook` return (`session_id/amount/currency/kind/customer`); `referredByPeekId`/`referrerUserId` + a `referral` event kind; occasion-tagged pick/convert logging. *Gate:* migration applies; types compile; a write carries them.
- **2 · THE MEAT — beat the zip (the bar):** feed `presentation.html` back into model context each turn (kill amnesia → `edit_region` targets real nodes); restore **idiomorph morph** in the studio; restore the **`: ping` keepalive**; move generation to the **150s host** (Supabase edge fn) so a ~90s Opus page finishes on cellular; **rewrite the seat prompt (my own, > the zip)** — mandate a stable `data-peek-id` on every card (the spine-join fix). *Gate:* a **local golden-brief harness** batch-screenshots N fixed briefs (ballerina niece, dad's 70th bourbon/BMW, …) with `document.fonts.ready` — output rated ≥ the zip, zero deploys.
- **3 · Close the loop — make it work:** the **postMessage pick bridge** (sandboxed iframe → parent listener validating `event.source` → `/api/pick`); picks carry the `data-peek-id` straight from the tag (one id source — no reconciliation); **enforce caps/locks/pick-one by parsing the stored HTML's `data-peek-*` tags server-side** (no IR); mount the **money button** (the full-i18n Checkout Session in `stripe.ts` already exists — just wire it); **idempotent, fail-CLOSED** webhook + write `webhook_log`; one **Resend creator-notify** on finalize. *Gate:* one real `create → pick-within-a-hard-cap (over-cap blocked) → $12 (test mode) → creator notified`, end to end.
- **4 · A deploy that deploys:** restore the deploy mechanism (workflow or native-git + correct `netlify.toml` branch) to a **fresh, non-destructive Netlify site**, prod-scoped keys present, fail-soft-on-missing-key trap checked. *Gate:* the in-site chat generates on a real URL and you see it beat the zip.
- **5 · Post-green hardening:** auth + botGate (Turnstile) + rate-limit on `/api/curator`; a real **CSS sanitizer** (position/overlay/`url()` allowlist) + CSP + **sandbox subdomain** + SSRF guard on `resolve_card`; the **Opus-artist / Sonnet-hands dial** behind `LLMPort`; the full `decide` gate if/when undo/replay/multi-actor earns it; Sentry; usage metering on the paid path.

## SEQUENCING LAW
Cheap-but-irreversible (step 1) before durable-but-deferrable. The MEAT (step 2) is the bar you judge, so it leads. The loop (step 3) makes it real. Hardening (step 5) is post-green — but the **open-endpoint abuse gate is the one piece pulled forward** to the moment anything is publicly reachable.
