# PROVENANCE WEED-OUT — canonical vs superseded-dead, with hard evidence
_Produced 2026-06-08. READ-ONLY pass over the shared tree (`git show`/`ls-tree`/`merge-base`/`log`). Every verdict is backed by an ancestry fact or a dated in-repo "this wins" claim, not by trusting the prior recon docs. Where I contradict the priors (`_claude/notes/RECON-FINDINGS.md`, `ASSET-MAP.md`), I flag it._

---

## 0. TL;DR for the rollup (the only thing you must internalize)

- **There is ONE continuous rebuild spine, not 6 competing islands.** The "robust" line and the "freeform-HTML" line are the **same git lineage**: `bold-feynman → gallant-planck → studio-integration → studio-vnext → in-site-chat-buildout → clean-slate`. Each is a *strict git ancestor* of the next. clean-slate (06-04) literally **contains** gallant-planck (06-02). The pivot from structured-IR to freeform-HTML happened *inside one branch family*, not as a fork war.
- **The atelier line is a SEPARATE family** that branched off the common packet-bootstrap root (`ef5647c`, 05-25) and never re-merged into the clean-slate family. It is the **most-built + only live-verified** line, but it is **older (≤05-29)** and is NOT an ancestor of the newest work.
- **NEWEST + CLEANEST = `clean-slate` (06-04, `8b3a700`).** Most-complete-of-the-money-loop in one tree = also clean-slate (it has create→author→persist→recipient wired; only publish-CTA + pick-bridge unbuilt). **Most-complete-backend = the atelier frontier (`peek-clean`/`intelligent-brahmagupta`)** but on the older, abandoned family.
- **The "this wins" war is RESOLVED by date.** Three WAKEUP docs each claim canon; they form a clean dated supersession chain (gallant 06-02 < studio-vnext 06-03 < in-site/clean-slate 06-04). The newest wins; the older two are self-declared-residue **by their own successors**.
- **Biggest noise sources to ignore:** 25 `worktree-agent-*` exhaust branches, the entire `packet-01..40` bootstrap (absorbed), the `build/peek-vnext` duplicate (byte-identical to atelier-integration), and the stale root `package.json` (Tailwind/Next leftover that fools stack audits).

---

## 1. Dated lineage map — the real architecture lines

### Common root
- **`ef5647c` (2026-05-25 07:50, = `claude/youthful-ramanujan-ovHXp`)** — the packet-bootstrap merge point. **EVERY** real line forks from here: atelier, bold-feynman, gallant, studio-integration all share this exact merge-base. This is the trunk. No standalone value; it is the seed.

### Line A — the packet bootstrap (DEAD, absorbed)
- `claude/packet-01-foundation … packet-40-prompt-caching` (05-25 → 05-28). 40+ branches.
- **Verdict: fully absorbed into the atelier line; zero standalone value.** Matches the `ASSET-MAP` prior. They are the raw material the atelier merge consumed.

### Line B — atelier (Next.js single app under `atelier/`) — MOST-BUILT, LIVE-VERIFIED, OLDER
Forks from `ef5647c`. 330 commits to its tip.
- **`atelier-integration` (`dec5312`, 05-28 04:16)** — packet-absorbed deployed base. The only **live-verified** tree (vnext.peek.gift deploy was on this family). Tailwind **v4** (`atelier/package.json` `tailwindcss ^4.3.0`).
- **`build/peek-vnext` (`dec5312`)** — **BYTE-IDENTICAL tip to atelier-integration** (`git rev-parse` both = `dec53122…`; mutual ancestor). Pure duplicate ref.
- **`intelligent-brahmagupta-WsoSb` (`7372241`, 05-27 19:37)** — the integrated FEATURE tip (Stripe, usage, security, anon, moderation, landing). **Confirmed ancestor of `peek-clean`** (`merge-base --is-ancestor` = YES) → peek-clean absorbs it.
- **`peek-clean` (`033a64b`, 05-29 09:03)** — atelier HEAD **+37 commits**: grammar engine + spine + multi-vertical/brand-config. **The true frontier + cleanest tree of this family.** No Tailwind in its own stack listing (the v4 dep is in the inherited `atelier/` subtree).
- Feeders into this line (all 05-29, all DEAD-once-absorbed): `bold-ride-Li5zK` (06-13… 05-29 06:13), `research/depth-layer-ux`, `lt/01-spine-thread`, `lt/grammar-presets`, `lt/edge-plumbing`, `lt/setup-concierge`, `lt/mutation-log-schema` (the only mutation-log code; NOT merged anywhere).

### Line C — the rebuild SPINE (one linear chain; structured-IR → freeform-HTML pivot)
This is the headline correction. **All of the following are a single ancestor chain** (each `--is-ancestor` of the next, verified):

| Branch | Tip | Date | Δ commits | Role |
|---|---|---|---|---|
| `claude/bold-feynman-SZzaO` | `1049d0c` | 2026-06-01 14:07 | +19 from root | **STRUCTURED-IR substrate.** `lib/ir/` PeekIR + ports + renderer. "Model is the resolver, no deterministic engine." Fences `engine-parametric-REJECTED/`. |
| `claude/gallant-planck-pu51x` | `cf57963` | 2026-06-02 14:29 | +71 from feynman | **Event-sourced re-architecture.** `packages/core` Zod `PeekDocument` + neverthrow `decide/apply`, 10 core test files (prior says "17/53 tests" — counts vary by what's run). |
| `claude/gallant-planck-pu51x-snapshot-2026-06-02` | `5ac2eca` | 06-02 | descendant of gallant tip | Frozen snapshot of gallant. Archival only. |
| `claude/studio-integration` | `5f63907` | 2026-06-03 | +21 from gallant | Studio work branch; forked **directly off gallant's tip** (`cf57963`). |
| `claude/studio-vnext` | `4e8b226` | 2026-06-04 06:21 | +10 from studio-int | Declared "Netlify **production** branch" (06-03 doc). |
| `claude/in-site-chat-buildout` | `67b1b2d` | 2026-06-04 08:27 | forked off studio-integration; PR #13 | **THE FREEFORM-HTML buildout** (dual-rep, autosave, sandboxed iframe recipient). |
| **`claude/clean-slate`** | **`8b3a700`** | **2026-06-04 10:11** | **+3 from in-site** | **NEWEST TIP OF EVERYTHING.** Strips ~167 legacy files + all docs/comments → `apps/web` + `packages/core` + build config only. |

- **gallant ⊂ clean-slate proven:** `merge-base --is-ancestor gallant clean-slate` = YES; 34 commits gallant→clean-slate. The event-sourced `packages/core` is *still in* clean-slate (10 core test files present), just with the freeform-HTML layer on top.
- **The SEAT magic is in-framework on this line:** clean-slate ships `apps/web/public/peek-runtime.js`, `lib/sanitize.ts`, `lib/curator/{pantry,exemplar,prompt,extract,draft,page-html,turn}.ts`, sandboxed `recipient-view.tsx`. This is the deployed-zip generative approach, inside Next.

### Line D — jolly-mccarthy (color math + a REJECTED generator)
- **`claude/jolly-mccarthy-QMqC9` (`67e2787`, 05-31)** — `packages/vibe-harmony` OKLCH/culori contrast math (KEEP per priors). Its `vibe-resolve`/`vibe-genome` knob-expansion generator = DROP (closed-vocabulary = the generic-maker). **NOT an ancestor of gallant** (`--is-ancestor` = NO) → its color math was *referenced/reimplemented*, not git-merged into the spine. Its real content is mostly a `workspace/north-stars/…/design_handoff_mobile_chat_sites/` HTML mockup pile (design reference, not app code).

### Line E — wizardly-mendel (the in-site master-plan doc source)
- **`claude/wizardly-mendel-b643n` (`45668f6`, 2026-06-04 02:28)** — authored `IN-SITE-CHAT-MASTER-PLAN.md` ~20 min before `in-site-chat-buildout` adopted it (in-site's copy: 06-04 02:48). It is the **doc/spec feeder**; the code lives on in-site/clean-slate. **NOT an ancestor of in-site or clean-slate** → the plan was copied in, the branch itself is residue.

### Line F — gallant-shannon + studio siblings (peripheral)
- `claude/gallant-shannon-QYFrN` (05-27) — "grook" mobile chat UI shell + `clerk-safe` fail-soft auth. Old; harvest `lib/clerk-safe.ts` only.
- `claude/eager-cray-eXRlp` / `claude/modest-cray-bqm9e` / `claude/affectionate-tesla-IMMcr` / `claude/intelligent-brahmagupta` siblings — atelier-era feature spikes, absorbed or superseded.

### The zips (working tree, NOT git) — the creative north star, not buildable
- `_claude/snapshots/deployed/` (from `peekcodebaseDEPLOYED06072253.zip`, dated 06-07 — **newest artifact of all**): vanilla JS `public/{app,chat-overlay,peek-runtime}.js` + `idiomorph.min.js` + Netlify `edge-functions/{generate,image}.ts` + the **`peek-design-seat.md`** persona prompt. Freeform live-AI HTML generation. **No auth / no persistence / no payment** (bookends stripped on purpose).
- `_claude/snapshots/iterated/` (`peekappiterated.zip`): minimal diff — moved `generate` from Netlify Edge → Supabase Edge (beat the ~60s edge timeout). Hardcoded Supabase URL+anon key in browser JS.
- `_claude/snapshots/_zips/`: the untouched original uploads.
- **Role: the aesthetic/UX north star + the proof the freeform approach "kinda works and looks good."** The clean-slate line is the in-framework realization of exactly this. **Not a build target itself** (no money path).

### Legacy Vite (the ONLY thing that ever made money) — OFF-REPO
- A **separate repo** (`peek.gift`, Vite + Netlify Functions). 31+ real $12 Stripe charges (`product:'peek.gift'`). The live Stripe webhook still points here.
- **NOT present in this git tree** (no `legacy/` path tracked on clean-slate; `.claude/settings.json` denies `Read(./legacy/**)` but no such dir is committed). It exists only as a Netlify-env reference (`VITE_APP_URL=https://peek.gift`, `VITE_STRIPE_PUBLISHABLE_KEY`, per `atelier-integration:_packets/SPINE/VERIFIED-STATE.md`).
- **Role: the live revenue rail to cut OVER from, not a codebase to build on.** Where the repo lives is an OPEN ITEM for the owner.

### Newest / most-complete / closest-to-good-output — the three rankings
- **Newest:** zips (06-07, off-git) → `clean-slate` (06-04, git) → in-site (06-04) → studio-vnext (06-04) → wizardly (06-04) → gallant (06-02) → bold-feynman (06-01) → jolly (05-31) → peek-clean (05-29) → atelier (05-28).
- **Most-complete (whole product, backend depth):** `peek-clean`/`intelligent-brahmagupta` (atelier frontier) — rules engine, security, moderation, scrape, image, usage, anon, reveal, notification, real Stripe — **but on the abandoned family and never closed the loop.**
- **Most-complete CLOSED-LOOP-in-one-tree + closest to the good (zip-caliber) output:** `clean-slate` — freeform-HTML authoring + persist + sandboxed recipient render are wired green; gaps are publish-CTA + pick postMessage-bridge (the prior estimates loop ~65%, money ~40%).

---

## 2. CANONICAL vs DEAD — verdict per meaningful branch/doc (with evidence)

### CANONICAL (current — trust / build-on candidates)
| Item | Verdict | Evidence |
|---|---|---|
| `claude/clean-slate` (`8b3a700`, 06-04) | **CANONICAL — newest tip, cleanest tree, the horse the rebuild line points at** | Newest committerdate; strict descendant of gallant+studio+in-site (`--is-ancestor` all YES); last commits "isolate the live app" + "strip every comment". Carries the SEAT runtime in-framework. |
| `claude/in-site-chat-buildout` (`67b1b2d`, 06-04) | **CANONICAL (the documented twin of clean-slate)** — read for the *why* | clean-slate is in-site minus docs (in-site is its direct ancestor). in-site's `WAKEUP.md` + `BUILDOUT-STATUS.md` + `IN-SITE-CHAT-MASTER-PLAN.md` are the surviving narrative for clean-slate (which stripped its own). |
| `peek-clean` (`033a64b`, 05-29) | **CANONICAL-as-PARTS-DONOR** (best atelier-frontier backend) — NOT the build base | atelier+37; absorbs `intelligent-brahmagupta`; cleanest atelier tree. Older family, never closed the loop. |
| `atelier-integration` (`dec5312`, 05-28) | **CANONICAL-as-LIVE-REFERENCE only** | The only line ever deployed+verified live. `_packets/SPINE/VERIFIED-STATE.md` is the only env-grounded doc. Not the newest; do not build forward on it. |
| The zips (`_claude/snapshots/deployed`) | **CANONICAL as the AESTHETIC/UX north star** | Owner's newest deployed artifact (06-07). Proves the freeform approach. Not a build target (no money path). |

### SUPERSEDED-DEAD (do not build on — keep only as parts/reference)
| Item | Verdict | Evidence |
|---|---|---|
| `claude/gallant-planck-pu51x` (06-02) + its `-snapshot-` | **SUPERSEDED** — absorbed into clean-slate | `--is-ancestor gallant clean-slate` = YES. Its own successors call it "OLD residue" (studio-vnext + in-site WAKEUPs). |
| `claude/studio-vnext` (06-04) | **SUPERSEDED by in-site/clean-slate** despite self-declaring "production branch" | studio-vnext WAKEUP (06-03) says "this wins"; in-site WAKEUP (06-04) explicitly re-designates studio-vnext as merely the *deploy target* and names in-site the work branch. Its deploy commit `47fb836` is an ancestor of in-site. |
| `claude/studio-integration` (06-03) | **SUPERSEDED** — the line in-site forked from | Ancestor of studio-vnext AND clean-slate; in-site WAKEUP calls it "the prior line this forked from (reference)." |
| `claude/bold-feynman-SZzaO` (06-01) | **SUPERSEDED** — the IR substrate gallant re-architected | `--is-ancestor feynman gallant` = YES, and feynman ⊂ clean-slate. KEEP as the renderer/IR reference (`lib/ir/`, `peek-jumpoff/`). |
| `claude/jolly-mccarthy-QMqC9` (05-31) | **SUPERSEDED / parts-only** | NOT an ancestor of the spine; only `packages/vibe-harmony` worth lifting; its generator is REJECTED-by-design. |
| `claude/wizardly-mendel-b643n` (06-04) | **DEAD branch, LIVE doc** | Not an ancestor of in-site/clean-slate; only contributed `IN-SITE-CHAT-MASTER-PLAN.md` (already copied into the canonical line). |
| `build/peek-vnext` | **DEAD DUPLICATE** | Byte-identical tip to `atelier-integration` (`dec5312`). |
| `packet-01..40`, `wave1-*`, `wave1-5-*`, `wave2-*`, `feat-*`, `fix-*`, `lt/*`, `proof/*`, `audit/*`, `chore/*` (≈05-25→05-29) | **DEAD as branches; CANONICAL as PART SOURCES** | These are the atelier-era feature spikes catalogued in `ASSET-MAP.md`. Absorbed or harvestable per-file; none is a build base. |
| 25× `worktree-agent-*` | **DEAD EXHAUST** (one exception below) | Ephemeral subagent worktrees. Keep only `worktree-agent-a89c9d…/prototypes/mobile-vibe-gallery/` as design proof (per `ASSET-MAP`). |
| `claude/gallant-shannon-QYFrN`, `eager-cray`, `modest-cray`, `affectionate-tesla`, `bold-ride`, `research/depth-layer-ux`, `memory-nav-test-001`, `inventory-concepts` | **SUPERSEDED / parts-only** | Old feature/feeder spikes; harvest specific files (`clerk-safe.ts`, curator memory schema, `CONCEPT-INVENTORY.md`), don't ride. |
| `tender-babbage-ukn6Q` (current local HEAD, 06-08) / `youthful-ramanujan-ovHXp` | **WORKSPACE / ROOT** | tender-babbage = Claude's `_claude/` workspace branch (the recon notes live here). ramanujan = the `ef5647c` bootstrap root. Neither is a product line. |

---

## 3. THE "DO NOT BUILD ON / DO NOT TRUST" LIST (explicit)

1. **`engine-parametric-REJECTED/` (director.js + resolver.js)** — explicitly fenced by bold-feynman's `DECISIONS.md` ("The model is the resolver. No mandatory deterministic design engine"). Survives on bold-feynman/gallant/studio lines; **already pruned from clean-slate** (good). Do not resurrect the lookup-table/parametric-IR caged approach.
2. **`vibe-resolve` / `vibe-genome` (jolly-mccarthy)** — the deterministic knob-expansion generator. **DROP.** The defect is the FIXED VOCABULARY (caps divergence = generic-maker), not "deterministic." Keep only OKLCH contrast-repair as a safety-net.
3. **Dead packet/wave/lt/worktree branches as BUILD BASES** — 100+ refs. Use as part sources via `ASSET-MAP.md`; never branch from them.
4. **`build/peek-vnext`** — duplicate of atelier-integration. Delete from mental model.
5. **The stale ROOT `package.json`** (`peek-gift-vnext`, has `tailwindcss 3.4.14` + `next dev`/`next build` scripts) — it is a **bootstrap leftover** present across the whole repo. The actual monorepo apps (`apps/web` on the clean-slate line) do **NOT** depend on Tailwind in their own `package.json`; they use runtime CSS-vars (`apps/web/app/globals.css`). **Do not read the root file as the stack** — it will make you think the clean-slate app is Tailwind when it is not. (The atelier line genuinely IS Tailwind v4, in `atelier/package.json`.)
6. **gallant's residual `tailwind.config.ts` + root `app/globals.css`** — dead duplicates on the gallant/studio lines; clean-slate removed them. Don't reintroduce.
7. **STALE / SELF-DEMOTED WAKEUPs** — do NOT orient off:
   - `gallant-planck:WAKEUP.md` (06-02, "push ONLY here") — **superseded** by both successors.
   - `studio-vnext:WAKEUP.md` (06-03, "this wins, production branch") — **superseded** by in-site (06-04), which re-cast studio-vnext as just the deploy target.
   - `bold-feynman:WAKEUP.md` (06-01) — superseded; valid only as IR/renderer reference.
   - Any `_packets/*` WAKEUP/STATE on the atelier line as a statement about the *newest* code (they describe the older atelier family).
8. **`SLUG_MODEL.ts` `@ts-nocheck` "canonical schema" stub** (per RECON prior) — authoritative-sounding, unvalidated. Don't trust as schema-of-record.
9. **Worktree exhaust** — 25 `worktree-agent-*` refs are subagent scratch; treat as noise.
10. **The atelier backend's absence on clean-slate is REAL** — verified: clean-slate has **no** `rules`/`moderation`/`rate-limit`/`security/origin.ts`/`idempotency` files. If you ride clean-slate you must **port** those from `peek-clean`/`intelligent-brahmagupta`; do not assume they're already there.

### Two prior-claims I verified and want to flag for the rollup
- **PAY_MODE — the priors say "defaults to mock" but the LIVE Netlify env said `PAY_MODE='live'`** (`atelier-integration:_packets/SPINE/VERIFIED-STATE.md`, 05-27). Both can be true: the *code default* is mock, the *deployed atelier env var* was `live`. The clean-slate line **dropped `PAY_MODE` entirely** for `paymentConfigured()` (key-presence) per RECON-FINDINGS. → For the rollup: PAY_MODE is an atelier-era concern; on the canonical (clean-slate) line the gate is key-presence + an **unwired publish CTA**, not a mock flag. Verify against the actual branch you ride.
- **Test counts drift** (priors cite "17 / 53 / 57" core tests; I count **10 core `.test` files** on both gallant and clean-slate). The discrepancy is test-files vs test-cases and what suite is run (`@peek/core` vs `+@peek/web` 47). Not a contradiction; just don't quote a single number as gospel.

---

## 4. SOURCES OF TRUTH — the shortlist (what the rollup should trust)

**For "what is the current code":**
1. **`claude/clean-slate` (`8b3a700`)** — the newest, cleanest, deployable tree. The build base if the owner picks freeform-HTML.
2. **`claude/in-site-chat-buildout`** — clean-slate's documented twin; read `WAKEUP.md` + `BUILDOUT-STATUS.md` + `IN-SITE-CHAT-MASTER-PLAN.md` for the *why*, the precise remaining-steps list, and the security-gap list (no `/api/curator` middleware, caps-not-passed-to-`decidePick`, etc.).

**For "what works live / real env + IDs":**
3. **`atelier-integration:_packets/SPINE/VERIFIED-STATE.md`** — the ONLY env-grounded, MCP-verified doc (Netlify keys, Stripe price `price_1TapZICEKPUsVee1ddG4n14M`, Supabase `ewqpujqerdnrkjqlpobo`, the keyed-vs-unkeyed matrix, the legacy-Vite compat keys). Explicit self-declared conflict-winner *for the atelier family*. **(Treat its claims as 05-27 atelier truth; re-verify against live before acting.)**
4. **`atelier:CLAUDE.md` + `_packets/MEMORY.md`** — operating contract + memory.

**For "where the best version of capability X lives":**
5. **`_claude/notes/ASSET-MAP.md`** (working tree) — the by-capability `branch:path` harvest map. Verified-accurate on the ancestry claims I spot-checked (packet→atelier absorption, brahmagupta⊂peek-clean).

**For "the decision context + the owner's constraints":**
6. **`_claude/notes/RECON-FINDINGS.md` + `SESSION-HANDOFF.md` + `_claude/README.md`** (working tree) — the 7-agent verified intel + how-to-work-with-Frank + the open horse-pick (freeform `clean-slate` vs structured `gallant` vs milk-legacy-first).

**For the creative bar:**
7. **`_claude/snapshots/deployed/` (the SEAT zip)** + its `peek-design-seat.md` persona — the aesthetic north star the freeform line is chasing.

**Explicitly NOT sources of truth:** any gallant/studio-vnext/bold-feynman WAKEUP for "what's canonical"; the root `package.json`; the REJECTED engine; the lt/wave/packet branch docs as anything but part-pointers.

---

## 5. Coverage & gaps (honesty section)

**Covered (verified by ancestry / dated docs, not trusted):** the full 6-line landscape + zips + legacy; the single-chain nature of the rebuild spine (every `--is-ancestor` edge run); the three-way "this wins" supersession resolved by date; the atelier-vs-rebuild family split at root `ef5647c`; build/peek-vnext duplicate; the Tailwind/root-package.json trap (verified app-level deps); REJECTED-engine fence; clean-slate's trimmed backend (verified file absence); zip nature (file listing); the PAY_MODE + test-count contradictions with the priors.

**Biggest gap:** I did **not** verify *live* infra state (Netlify deploy status, Supabase row counts, Stripe charges, which commit is actually serving on vnext.peek.gift) — those are MCP/runtime facts, out of scope for a read-only git provenance pass, and the relevant claims (50 peeks / 0 picks / 0 payments / webhook→legacy / studio-vnext deploy stuck) come from the prior recon docs and `VERIFIED-STATE.md`, not re-verified here. The rollup should re-confirm "what commit is live right now" via Netlify MCP before committing to a build base, because the studio-vnext/in-site WAKEUPs say the last deploy was **stuck/pre-fix** — meaning the live site may NOT reflect clean-slate at all.
