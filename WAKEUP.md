# WAKEUP — read this first. Current truth as of 2026-06-03. Don't restart; don't rebuild the engine.

You (a fresh context) are continuing a long build. **It's real, deployed, and LIVE.** The #1 failure
mode on this project is restarting from scratch — ~50 non-compounding tries. Do NOT re-derive or
rebuild. Read this, move the **next step** — not the whole thing. If any other doc conflicts with this
one, **this wins**; the rest (`_packets/*`, older WAKEUPs) is residue.

## Live right now
- **Deployed: https://vnext.peek.gift** (Netlify site `932646db-…`), serving commit `47fb836`.
- **Branches that matter** (gallant-planck + the 80 other branches are OLD residue):
  - `claude/studio-vnext` = **Netlify production branch** (what deploys). At `47fb836`.
  - `claude/studio-integration` = **work branch**; canon + latest live here. **Push work here; deploy by
    fast-forwarding `studio-vnext` onto it.**
- Build green: `@peek/core` 53 tests · `@peek/web` `tsc --noEmit` + `next build`.

## What this is — the destination (don't lose it)
peek.gift is **V0 of PerfectPurchase, deliberately minus fulfillment.**
- **PerfectPurchase** = a *decision layer between intent and transaction*. User describes a need
  (text/voice/image) → it returns a transaction-ready **assembled bundle** of real products from many
  retailers (masked), for high-friction **"projects, not products"** categories. (Reef-tank example: the
  pain is *knowing what to buy + assembling it*, not the buying.) Own the moment uncertainty resolves —
  not the catalog, not the logistics. Moat = **assembly intelligence** + a system that **compounds per
  category**. Full thesis = Frank's PerfectPurchase Series A brief (Mar 2026); ask him for it — NOT
  committed here, it's confidential.
- **peek = the wedge**: gift-framed so you ship the proven-hard front-end (aggregate retailers + chat +
  cool presentation) **without owning fulfillment yet** (curator/recipient closes the buy). Gifts are
  emotional, shareable, **self-distributing**.
- **Money model**: peek only needs to **cover COGS + ad spend** (break-even / self-funding) — the real
  money is PerfectPurchase downstream. Unit economics close via **virality** (every published page lands
  in a recipient's hands ≈ ~free CAC) + **controlled COGS** (cap/cache Opus). Both require the output be
  good enough to forward.
- **Fulfillment (auto multi-retailer buying) is DEFERRED** — it's the boss fight and today's agents
  aren't reliable enough. Build the front-end now; add fulfillment when agent reliability catches up.

## The V0 win condition — the only two things that matter
1. **Resolution that doesn't break** — reliably turn *any* link or fuzzy ask ("a 40-gal reef setup")
   into real products (image, price, title) across retailers. The `CardResolver` cascade (retailer API
   → scrape/ZenRows → LLM web+vision) is the **foundation** — stress-test it to death; everything sits
   on it.
2. **Output people forward** — the eye-popping, non-generic quality bar. Generic = nobody forwards =
   the loop dies. ("Generic is the only failure.")

Everything else is downstream or deferred.

## Done this session (2026-06-03) — do NOT redo
fal hero-image gen wired into the turn (real image → Supabase-hosted URL; degrades to themed gradient
if `FAL_KEY` absent) · real per-kind section renderers (countdown/gallery/lede/rail/lookbook/tracklist/
courses/tiers/stubs) so nothing renders blank · `custom` sections sanitized server-side (DOMPurify) then
painted · bottom-sheet first-paint flash fixed (`live ?? held`) · action-bar CTA scrolls to gifts ·
curator route hardened (emit/close disconnect guards + leading-non-user-message strip) · dead
non-streaming `runCuratorTurn` removed · **deployed live to vnext.peek.gift.**

## Next (when Frank says go)
- **Harden the resolver** (win-condition #1) — reliability across real retailers. It's the foundation of
  the entire business; if this is flaky, "easy + cool" is a house on sand.
- **Concept-gate + reject loop** (win-condition #2) — model commits a concept FIRST (one line + the one
  bold move); Frank one-taps `keep` / `too safe, again`; every keep/reject logs into a growing taste
  corpus that feeds the system prompt. Turns "explain my taste" (failed for 2 months) into "react" — and
  the rejections **compile** into the canon that makes output forwardable. (Frank owns the taste; Claude
  builds the loop.)

## Practical reality
- **Keys**: `.env*` is gitignored → NOT in a fresh container. Netlify env holds ANTHROPIC/SUPABASE/STRIPE,
  so the deploy is fully live. To re-verify the turn in-session, ask Frank to re-drop `ANTHROPIC_API_KEY`.
  `FAL_KEY` makes hero images real (else themed gradient). Don't nag about key hygiene.
- **Setup**: node 22, pnpm 10.33. `pnpm install --filter @peek/web...` then `pnpm --filter @peek/web
  build`. Core alone: `cd packages/core && pnpm install --ignore-workspace && pnpm test`.
- **Deploy**: Netlify normally auto-builds on push to `studio-vnext`. If it stalls, Frank triggers
  "Clear cache and deploy site" manually. Netlify MCP has been flaky/down — can't trigger from here.
  Clear-cache after any dependency/lockfile/next.config change.
- **Files**: `apps/web/components/{scenes,frames,reveal,preview,recipient-view}.tsx` = renderer + studio ·
  `apps/web/lib/curator/*` = the SSE turn (system-prompt, tools, turn) · `apps/web/lib/ports/*` =
  resolver + image(fal) · `apps/web/lib/persistence/*` = Supabase store + picks · `apps/web/lib/
  sanitize.ts` = custom-html. `packages/core` = the spine (decide/apply maker-checker, PeekIR, render(),
  tokens, selection engine, ports). **53 tests green.**
- Headless screenshots don't paint webfonts (captures show fallback fonts); real browsers + deploy load
  them. Don't chase font screenshots.

## Standing directives (Frank — override older docs)
- Frank = product/taste/vision; Claude = mechanics/functionality. Work *with* him.
- **No embedded checkout** — it's a later full-custom build. `/api/publish` + webhook are harmless
  backend. **No landing page yet.** Build LIVE, no mock. Be terse; chatting costs ~50× working.
- **Verify before asserting** — never claim missing/broken/stubbed without evidence. Frank loathes
  base64. Frank does not read git.

## Operating truths (hard-won 2026-06-03 — the meta-fix)
- **Don't restart. Don't rebuild the engine.** The disease was ~50 non-compounding tries; the cure is
  one held line + this canon. Each session must *add*, not reset.
- **Capture Frank's taste as rejections, not essays** — explaining it in prose failed for 2 months
  (the model softens prose into generic mush). His "no"s are the spec.
- **This file is the one source of truth.** Keep it current at the end of every session. Anything not
  reflected here is residue until it is.

Commit footer this session: `https://claude.ai/code/session_01JiokF2zrryfLtJwoGqyGM4`. Never put a model
id in commits/PRs/artifacts.

Go. It's live. Move the next step — don't rebuild what's already real.
