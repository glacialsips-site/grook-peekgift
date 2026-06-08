# RED-TEAM — path-to-live + data layer (clean-slate base)

_Produced 2026-06-08. Adversarial read-only pass over the clean-slate-derived working tree (`claude/tender-babbage-ukn6Q`, tip `9e72854`). Goal: not "it builds" — find what detonates on the FIRST real deploy and the FIRST live $12. Every claim cites a file:line or a live MCP read. Edited nothing; ran no writes._

> **The one-line verdict:** the loop **cannot close on the path the recipient actually uses**, and the **money button does not exist on the frontend**. The build will go green and the deploy will publish — and then the product does nothing end-to-end. "It'll deploy" is exactly the trap here.

---

## RANKED LANDMINES

### L1 — [TACTICAL] The recipient pick NEVER reaches the server on the live (HTML) path → the loop is structurally incapable of closing. **WORST.**
**Evidence.**
- `/g/[slug]` serves `presentation.html` inside a sandboxed iframe (`app/g/[slug]/page.tsx:29-37`): `frameDoc(sanitizeHtml(html, true), "recipient")`, `sandbox="allow-scripts"` (no `allow-same-origin` — good for XSS, fatal for picks).
- `frameDoc` (`lib/curator/page-html.ts:11-14`) injects only `window.__PEEK__={mode:"recipient"}` + `peek-runtime.js`. It **never sets `cfg.onAction`**.
- `peek-runtime.js:181` fires `if (typeof cfg.onAction === "function") cfg.onAction(type, summary)` — `onAction` is undefined, so the pick is a no-op. There is **no `postMessage` to the parent** in the runtime (`grep postMessage/parent` = none) and **no `message` listener** in the parent page.
- The only code that actually POSTs `/api/pick` is `components/recipient-view.tsx:18`, and `RecipientView` renders **only on the fallback branch** (`page.tsx:40-41`), i.e. when `presentation.html` is **null**. Every real authored peek has non-null HTML, so the React pick path is dead in production.
- Live proof of the dead loop: `peek_v2.peek_picks` = **0 rows**, `peek_v2.picks` = **0 rows** (MCP `list_tables`). The loop has still never closed.

**Impact.** Recipient taps a card → nothing persists → creator never gets picks → publish→pick→notify is unreachable. This is the THE-milestone blocker, sitting under a build that passes.
**Mitigation.** Build the postMessage bridge: runtime sets `cfg.onAction` to `parent.postMessage({type:'pick',...}, ORIGIN)`; parent page mounts a client island with a `message` listener (origin-checked) that POSTs `/api/pick` and posts state back so the iframe can paint `data-peek-picked`. This is the Ch-3 "pick bridge," and it is a hard gate, not polish.

### L2 — [TACTICAL] The money button does not exist on the frontend. Publish is unreachable; the $12 can never be charged on vNext.
**Evidence.**
- `app/studio/page.tsx`: zero references to `publish`, `/api/publish`, `clientSecret`, `data-peek-action`, or Stripe (grep = empty). The studio never offers checkout.
- No `@stripe/stripe-js` / `@stripe/react-stripe-js` dependency in `apps/web/package.json` — even with a `clientSecret` from `/api/publish`, there is **no client to mount the embedded Checkout** (`createPublishCheckout` returns `ui_mode:"embedded"` → a `client_secret`, `lib/payment/stripe.ts:26-40`).
- So the backend ($12 publish route + webhook) is real but **orphaned**: nothing calls `/api/publish`.

**Impact.** vNext stays at $0. "Ch 4 — the money button" has no frontend at all; the build/deploy hides this completely.
**Mitigation.** Wire the publish CTA in studio (call `/api/publish` with the saved `peekId`), add `@stripe/stripe-js`+`@stripe/react-stripe-js`, mount `<EmbeddedCheckout>`. Gate = one test-mode checkout returning to `/studio?published=…`.

### L3 — [STRATEGIC] Server-side cap enforcement is not "unwired" — it is **structurally impossible**: there is no budget field on the spine to enforce against.
**Evidence.**
- `decidePick` accepts `caps?` and enforces `hardCents`/`softCents` (`packages/core/src/picks/engine.ts:21-73`).
- The pick route calls it WITHOUT caps: `decidePick(doc, current, { type: "toggle", cardId })` (`app/api/pick/route.ts:22`). Known dead-enforcement.
- **Deeper:** `extractSpine` computes `budgetCents` (`lib/curator/extract.ts:108-110`) but `buildDraftDocument` **drops it** — it only carries `cards` + `variant_groups` onto the spine (`lib/curator/draft.ts:25,37-38`). And `PeekIR.Peek` has **no `budget_cents` field at all** (`packages/core/src/document/contract.ts:166-190`; `emptyDocument` confirms, `empty.ts:52-73`).
- Net: the cap lives only as a render-time `data-budget` attribute the client thermometer reads (`peek-runtime.js:26`). The server has nothing to read.

**Impact.** Even after L1's bridge lands and you pass caps to `decidePick`, there's no persisted hard cap → a recipient can pick over budget and the server accepts it. Budget enforcement is purely cosmetic. The "genuinely defensible core" (the rules engine) is enforcing against `undefined`.
**Mitigation.** Add `budget_cents` (+ optional soft/hard) to `Peek`; have `buildDraftDocument` persist `extractSpine().budgetCents`; pass `{hardCents, softCents}` into `decidePick` in the pick route. Gate = the existing engine test extended: over-cap toggle returns `INVARIANT`.

### L4 — [STRATEGIC] DEPLOY MECHANISM MISMATCH: clean-slate has NO `.github` workflow, but the live deploy fires via a GitHub-Actions → build-hook. Pushing this branch deploys NOTHING.
**Evidence.**
- Live deploy is **not** the native git connector — it's `atelier-integration:.github/workflows/netlify-deploy.yml` POSTing to build hook `6a14cf135c167288ad60f6a9?trigger_branch=atelier-integration` (`services-ops.md §2B`).
- This tree has **no `.github/` directory** (`ls -la` root: `.claude .git _claude apps packages scripts supabase` + config files — no `.github`). The comment-strip / "isolate the live app" commits removed the CI workflow along with everything else.
- Therefore code reaching THIS branch never triggers a build. Going live requires either (a) re-pointing the Netlify site's **production branch** to this branch AND relying on the native git connector being reconnected (it was offline 06-02), or (b) re-adding a build-hook workflow. Neither is present/verified.

**Impact.** First "deploy" is a no-op surprise: push succeeds, nothing rebuilds, `vnext.peek.gift` keeps serving the old atelier commit. Compounds with the doc lie in L5.
**Mitigation.** Decide the mechanism explicitly at Ch-0: re-add `.github/workflows/netlify-deploy.yml` (build-hook POST) OR confirm the native connector is live and repoint the production branch in the Netlify dashboard. Verify with an actual triggered deploy, not a push.

### L5 — [TACTICAL] `netlify.toml` points at the WRONG branch and contradicts the build plan's chosen base.
**Evidence.**
- `netlify.toml:1-5` (comment) says: _"To go live: point the Netlify site's PRODUCTION BRANCH at this branch (claude/gallant-planck-pu51x)."_ — gallant-planck is the **abandoned, superseded** structured-IR line (`provenance-weed.md §2`), not clean-slate, not this branch (`tender-babbage`).
- The build plan ratifies **clean-slate** as the base (`00-BUILD-PLAN.md` Ch-0/§THE CALLS-2). The toml's own self-description is stale residue carried up with the monorepo config.

**Impact.** A human (or an agent trusting the toml) repoints production to gallant-planck — the wrong, older tree — and ships the demoted architecture. Silent wrong-horse cutover.
**Mitigation.** Fix the toml comment to name the actual deploy branch; treat the branch name in any toml/WAKEUP as untrusted (corpus already flags studio-vnext/gallant WAKEUPs as self-declared residue).

### L6 — [TACTICAL] First monorepo build is untested and fragile by the author's own admission; the build command + plugin wiring have specific failure points.
**Evidence.**
- `netlify.toml:7-12`: `base="apps/web"`, `command="cd .. && corepack enable && pnpm install --frozen-lockfile && pnpm --filter @peek/web build"`, `publish=".next"`. Author's caveat (`gallant-planck:_packets/SPINE/DEPLOY.md`, quoted in `services-ops.md §2D`): _"first-draft monorepo config I could not test against Netlify… if the first build fails it's almost certainly the install/base interplay."_
- `--frozen-lockfile` + `packageManager: pnpm@10.33.0` (root `package.json:5`) means a single drifted `pnpm-lock.yaml` fails the install hard. `@peek/web` depends on `@peek/core` via `workspace:*` (`apps/web/package.json:15`) — `^build` must produce `@peek/core` before web's `next build`, but **`@peek/core` has no `build` script wired into the Netlify command** (the command runs `pnpm --filter @peek/web build` only; turbo's `^build` dependsOn is bypassed because Netlify calls the filter directly, not `turbo build`). If `@peek/core` exports raw TS via `package.json` exports it may resolve; if it expects a `dist/`, web's build breaks on import. **Verify `@peek/core`'s `main`/`exports` and whether it needs compilation.**
- `base="apps/web"` + `publish=".next"` is relative to base → publishes `apps/web/.next` (correct for `@netlify/plugin-nextjs`), but the install runs from repo root (`cd ..`). The plugin auto-detects functions; the `/api/curator` route declares `maxDuration=120` (`app/api/curator/route.ts:8`) — **Netlify's default function cap is 10s (26s on some plans); 120s requires Background Functions or a plan that allows it.** A 120s SSE curator turn will be **killed at the platform limit** unless the site is on a tier that honors `maxDuration=120`. The streaming response (`text/event-stream`) also fights serverless buffering/timeouts.

**Impact.** Likely first-build red on the install/workspace-build interplay; even if green, the Opus authoring turn (the whole product) times out at the platform function ceiling, not at 120s.
**Mitigation.** Add an explicit `@peek/core` build (or confirm TS-export resolution) and use `turbo build` so `^build` ordering holds; verify the Netlify plan's max function duration vs `maxDuration=120` (the curator turn is the long pole — confirm it's allowed or move to a background/edge strategy); test the SSE route survives the platform proxy.

### L7 — [STRATEGIC] The publish→pick→notify loop has NO notify leg anywhere in `apps/web`.
**Evidence.**
- `grep -rln "resend|Resend|notify|sendEmail|RESEND_API_KEY|fulfillment" apps/web/` → **NONE**.
- The Stripe webhook (`app/api/stripe/webhook/route.ts:23-32`) only calls `markPeekPublished` — no creator email, no fulfillment hook. The pick route (`app/api/pick/route.ts`) persists picks but **never notifies the creator** either.

**Impact.** Even after L1+L2+L3 are fixed and a $12 lands, the creator is never told what was picked. The "creator notified to fulfill" milestone (the whole point of Tier-1 Studio) is absent. `RESEND_API_KEY` is keyed live but unused.
**Mitigation.** Add a Resend call on pick-finalize (and/or webhook), behind the planned `fulfillment` port stub. Gate = a delivered email on a real pick.

### L8 — [STRATEGIC] Webhook idempotency fails OPEN / absent → live retries double-fire, and `webhook_log` is never written.
**Evidence.**
- `grep -rn "webhook_log|idempot|Upstash|redis" apps/web/` → **NONE**. The webhook has no idempotency guard and no dedup store (`app/api/stripe/webhook/route.ts` whole file).
- `markPeekPublished` is itself idempotent on status (`store.ts:73`: short-circuits if already published) — so a duplicate `checkout.session.completed` won't double-publish. **But** the moment a notify/fulfillment side-effect (L7) is added, Stripe's at-least-once delivery double-sends and there's no `webhook_log` to dedup → duplicate creator emails / duplicate fulfillment. Live `webhook_log` = 0 rows (MCP) confirms nothing logs.
- This matches corpus B15 ("idempotency fails OPEN") but the real exposure is the *future* notify side-effect, not the publish itself.

**Mitigation.** Insert a `webhook_log` row keyed on `event.id` with a unique constraint (fail-CLOSED: if the row exists, skip side-effects); only fire notify after the insert succeeds.

### L9 — [STRATEGIC] `payment_intent.succeeded` branch reads `metadata.peek_id` that won't exist → that webhook event silently no-ops.
**Evidence.**
- `createPublishCheckout` sets `metadata:{peek_id,...}` on the **Checkout Session** only (`lib/payment/stripe.ts:30`) — there is **no `payment_intent_data.metadata`** (grep `payment_intent_data` = NONE).
- The webhook handles both `checkout.session.completed` AND `payment_intent.succeeded`, reading `obj.metadata?.peek_id` for both (`stripe/webhook/route.ts:23-26`). For `payment_intent.succeeded`, `obj.metadata` is the **PaymentIntent's** metadata, which is empty (session metadata does not propagate to the PI). So that branch finds no `peekId` and does nothing.
- Today this is harmless redundancy (the `checkout.session.completed` branch covers it). It becomes a live bug if the registered endpoint subscribes only to `payment_intent.*` events, or if you switch flows.

**Mitigation.** Either drop the `payment_intent.succeeded` branch or pass `payment_intent_data:{metadata:{peek_id}}` in `createPublishCheckout`. Confirm the registered `we_1Tb7Ph…` endpoint actually subscribes to `checkout.session.completed`.

### L10 — [STRATEGIC] Recipient HTML is served same-origin via `srcDoc` with `sandbox="allow-scripts"` — NOT the isolated sandbox subdomain the corpus mandates.
**Evidence.**
- `app/g/[slug]/page.tsx:34`: `sandbox="allow-scripts"` (no `allow-same-origin` — opaque origin, so cookies/storage are blocked: this part is sound).
- BUT it is a **same-document `srcDoc` iframe on `vnext.peek.gift`**, not a separate sandbox origin (`00-CORPUS §7.2`, `00-BUILD-PLAN §5` require an isolated origin / subdomain). The studio preview is worse: `sandbox="allow-scripts allow-same-origin"` (`studio/page.tsx:262`) — that combination is a known DOMPurify-bypass amplifier (scripts + same-origin = can reach parent), though it's the author's own preview not the recipient surface.
- CSS sanitizer (`lib/sanitize.ts:42-48`) is regex-based: strips `@import`, `expression()`, `behavior`, `javascript:` urls — but does **not** neutralize full-viewport fixed overlays, `position:fixed` clickjacking, or `url()` to arbitrary external hosts (no host allowlist), and there is **no CSP header** anywhere. SSRF guard on scrape: not checked here (card-resolver), flag for the security pass.

**Impact.** A sanitizer miss in the recipient HTML can't steal cookies (opaque origin is the saving grace), but can still phish/clickjack/exfil via CSS `url()` beacons and overlay traps; the studio same-origin preview is a genuine bypass surface. Below L1–L2 only because the loop is broken anyway.
**Mitigation.** Move the recipient render to a sandbox subdomain; add CSP (`default-src 'self'`, `img-src`/`style-src` allowlist); add a `url()` host allowlist to the CSS sanitizer; drop `allow-same-origin` from the studio preview or isolate it too.

---

## SCHEMA DRIFT — live verification (Supabase MCP, project `ewqpujqerdnrkjqlpobo`)

- **`peek_documents` EXISTS live** — 1 row, RLS on. **`peek_picks` EXISTS live** — 0 rows, RLS on. Both vNext additive tables are applied (migrations `vnext_peek_documents` 20260602124925 + `vnext_peek_picks` 20260602131500 present in `list_migrations`). The migration files in-repo match.
- **The drift is real and live:** the vNext write path writes recipient selections to `peek_v2.peek_picks` (jsonb `picks` array, one row/peek — `lib/persistence/picks.ts:23-30`). The **legacy `peek_v2.picks` table** (0 rows, RLS on) carries the `beg_message`/`beg_approved_at`/`fulfilled_at`/`fulfillment_notes` columns the spec's notify/fulfillment loop expects (`00-CORPUS §3.1`). **Nothing in this tree reads or writes `picks`.** A recipient pick lands in `peek_picks` (a flat id array with no beg/fulfillment columns); any notify/fulfillment path modeled on the legacy `picks` shape would read an empty table. → **The recipient pick writes somewhere the (future) notify path does not read.**
- `peek_picks` is **single-row-per-peek** (`peek_id` PK) → single-recipient only; no per-recipient, no beg state, no fulfillment timestamps. Collaboration/multi-recipient is unrepresentable without a schema change (the `actorId`/multi-actor seam the corpus wants is absent here too).
- Minor: corpus said `source_citations` doesn't exist on `cards`; live migration `0014_card_source_citations` (20260528044707) shows it WAS added — corpus is stale on that one point (not a deploy risk).

---

## CUTOVER — what breaks the live $12 during any cutover

- Real money flows through the **LEGACY webhook `we_1TRbB2…`** → `peek.gift/api/payment-webhook` (Vite app, off-repo, 31+ charges). vNext's `we_1Tb7Ph…` has zero traffic. **Cutover risk is concentrated at the webhook swap** (`services-ops.md §2E` step 2).
- **`share_url` is built at write-time** (`store.ts:84`: `share_url: \`/g/${slug}\``) — note this is a **relative path**, not `${APP_URL}/g/…`, so the M01 "APP_URL baked in" risk is partially neutralized here (the path is origin-relative). BUT `/api/publish` uses `process.env.APP_URL ?? origin` for the Stripe `return_url` (`publish/route.ts:21`) — a stale `APP_URL` sends post-payment users back to `vnext.peek.gift` after an apex cutover. Confirm `APP_URL` is updated in lockstep with the domain (corpus cutover step 4).
- **Idempotency fails open (L8)** during the window when both legacy + vNext webhooks could receive overlapping events for the same Stripe account → if vNext starts firing notify side-effects before legacy is fully decommissioned, double-notify. Sequence: land L8 (fail-closed `webhook_log`) **before** swapping the webhook.
- The legacy repo location is still unknown (corpus open item) — you cannot test that the trickle survives the swap from inside this tree. Treat the swap as one-way until the legacy source is in hand; rollback = revert the single webhook-URL field (corpus: 5 single-field reverts).

---

## RUNTIME ENV — does a non-production deploy context inherit the keys?

- All persistence/payment/LLM code reads keys from `process.env` at call time and **fails soft** when absent: `persistenceConfigured()`/`paymentConfigured()` gate on key presence (`store.ts:19`, `stripe.ts:12-14`); curator 503s without `ANTHROPIC_API_KEY` (`curator/route.ts`). So a context **without** the keys doesn't crash — it silently serves a dead app (publish 503, recipient "persistence isn't configured", curator 503).
- **The landmine:** Netlify scopes env vars by **deploy context** (production / deploy-preview / branch-deploy). The corpus states keys live on `peek-gift-vnext` in the **production** context. A **branch-deploy or preview** of this branch inherits production-context vars **only if they're set to "all contexts"** (or the specific context). If any of `ANTHROPIC_API_KEY`/`STRIPE_*`/`SUPABASE_SERVICE_ROLE_KEY` is production-only, a preview deploy comes up **keyless and dead** — and because everything fails soft, it looks "deployed and fine" while doing nothing. This is the exact "build is green, product is dead" trap. **[STRATEGIC]**
- Mitigation: confirm each required key's Netlify context scope; for a parallel vNext that's a production deploy this is moot, but any preview/branch-deploy used for screenshots/QA must have the keys scoped to its context or it will mislead. Verify via the Netlify env-var context settings before trusting any non-production URL.

---

## SUMMARY TABLE (ranked)

| # | Landmine | Class | Detonates when |
|---|---|---|---|
| L1 | Recipient pick never reaches server (no postMessage bridge; onAction undefined) | TACTICAL | First recipient tap — loop can't close |
| L2 | No publish CTA / no Stripe client on frontend | TACTICAL | First attempt to charge $12 |
| L3 | No `budget_cents` on spine → cap enforcement impossible | STRATEGIC | Over-cap pick accepted server-side |
| L4 | No `.github` workflow → push deploys nothing | STRATEGIC | First "deploy" is a silent no-op |
| L5 | `netlify.toml` names the wrong (abandoned gallant) branch | TACTICAL | Human repoints to wrong tree |
| L6 | Untested monorepo build + `maxDuration=120` vs platform cap | TACTICAL | First build / first Opus turn timeout |
| L7 | No notify/fulfillment leg anywhere in apps/web | STRATEGIC | After a pick lands — creator never told |
| L8 | Webhook idempotency absent / fails open; `webhook_log` never written | STRATEGIC | Stripe retry + a notify side-effect |
| L9 | `payment_intent.succeeded` reads non-propagated metadata | STRATEGIC | If endpoint subscribes to PI events |
| L10 | Recipient HTML same-origin srcDoc, studio preview `allow-same-origin`, no CSP | STRATEGIC | A sanitizer/CSS miss (phish/clickjack) |

_The build is the easy gate. The loop and the money are the real ones, and both are dark on the path users actually take._
