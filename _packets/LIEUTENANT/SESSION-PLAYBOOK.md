# SESSION PLAYBOOK — 5-hour hardcore session

_Use this as the decision-tree when you sit down. Tier-by-tier fire/merge/repeat. Adjust as conditions change._

---

## State at session start (verify with `git log --oneline -10 origin/claude/bold-ride-Li5zK`)

**Merged on bold-ride (394 tests green, edge route confirmed):**
- Slug renderer + 40-preset library + 22-occasion taxonomy
- Edge plumbing slice (`lib/anthropic-edge` + `lib/db-edge`)
- Spine thread at `/spine/*` (chat → mutate → publish → recipient view)
- All 6 research REPORTs

**In your inbox when you sit down (from the 30-min prep window):**
- ✅ **Structural variation showcase** RETURNED — 42 SSR renders across 3 vibes × all variants. Files already sent to you. **Critical finding**: hero variants 5/5 distinct (✅), product-set variants nominally 6 but **visually distinct on mobile = 4** (❌). `editorial-full-bleed` ≈ `single-hero-product` (near-twins); `collage-masonry` doesn't activate at typical 3-4 card counts. **This is the structural root of your "feels like what we had" concern — the grammar's structural vocabulary is too narrow.**
- ⏳ Mobile vibe gallery (40 presets × mobile viewport × proper fonts) — sub still working.

**🆕 BRIEF 20 written: grammar variant expansion.** Adds 4 new `ProductSetVariant` values (`feature-pair`, `zigzag-prose`, `stacked-polaroids`, `gallery-wall`) + decision on whether to prune `single-hero-product`. **Independent of all other briefs — can fire ANY time after Tier 1 lands. This directly attacks "feels like what we had".**

**Lieutenants in flight at session start:**
- Lieutenant C (BRIEF 08 mutation-log-schema) — was firing 60+ min ago, no branch push yet. Likely stalled. Three options when you sit:
  - Check the browser session: if it's working, let it finish.
  - If stalled/crashed: re-fire with the same one-liner — fresh session, paste again.
  - If you want to skip: I can fold the mutation log into BRIEF 04 instead (it's small).

---

## Wave 1 — finish Tier 1A (5 min total)

Goal: get Lieutenant C across the line so we can fire BRIEF 04.

1. Check Lieutenant C session. If pushed, send me "C pushed" and I merge + verify. If stalled, re-fire:
   > On branch `claude/bold-ride-Li5zK`, read `_packets/LIEUTENANT/PROTOCOL.md` then `_packets/LIEUTENANT/08-mutation-log-schema/BRIEF.md` and execute fully. Spawn your own subs. Report per the protocol.

---

## Wave 2 — Tier 1B + Tier 2 (3-4 parallel lieutenants, ~60 min)

After Lieutenant C merges, fire BRIEF 04 (depends on all of Tier 1A) + BRIEFs that DON'T strictly depend on 04:

**Lieutenant 04** (mutation tools — Tier 1B):
> On branch `claude/bold-ride-Li5zK`, read `_packets/LIEUTENANT/PROTOCOL.md` then `_packets/LIEUTENANT/04-mutation-tools/BRIEF.md` and execute fully. Spawn your own subs. Report per the protocol.

**Lieutenant 09** (cinematic reveal rebase — independent of 04):
> On branch `claude/bold-ride-Li5zK`, read `_packets/LIEUTENANT/PROTOCOL.md` then `_packets/LIEUTENANT/09-cinematic-reveal/BRIEF.md` and execute fully. Spawn your own subs. Report per the protocol.

**Lieutenant 10** (landing — independent of 04):
> On branch `claude/bold-ride-Li5zK`, read `_packets/LIEUTENANT/PROTOCOL.md` then `_packets/LIEUTENANT/10-landing/BRIEF.md` and execute fully. Spawn your own subs. Report per the protocol.

**Lieutenant 20** (grammar variant expansion — the radical-vibes fix; independent of EVERYTHING; recommend firing in parallel with Wave 2 since it's the highest-leverage fix to your "feels like what we had" concern):
> On branch `claude/bold-ride-Li5zK`, read `_packets/LIEUTENANT/PROTOCOL.md` then `_packets/LIEUTENANT/20-grammar-variants-expansion/BRIEF.md` and execute fully. Spawn your own subs. Report per the protocol.

Fire these 3 in parallel sessions. While they cook, scan the vibe gallery + structural showcase to give me your taste read.

---

## Wave 3 — Tier 2 UI + Tier 3 bolt-ons (4-5 parallel, ~90 min)

After Wave 2 merges:

**Lieutenant 05** (curator-Sonnet prompt) — depends on 04, 07 (both merged after wave 2).
**Lieutenant 06** (depth-layer mobile chat UI — **THE MOCKUP**) — depends on 04, 08.
**Lieutenant 11** (auth bolt-on Clerk headless) — independent of UI work.
**Lieutenant 14** (image gen wired) — depends on 04 + FAL key. If FAL key still missing, defer to Wave 4.
**Lieutenant 15** (scrape wired into add_card) — depends on 04.

5 parallel sessions. Maximum bandwidth.

---

## Wave 4 — Tier 3 features + cleanup (~60 min)

After Wave 3 lands:

**Lieutenant 12** (checkout bolt-on Stripe).
**Lieutenant 16** (meter implementation).
**Lieutenant 17** (product graph v1).

---

## Wave 5 — Canonical cutover (~60 min)

**Lieutenant 13** (raze legacy, promote spine to canonical paths).

After this, `/spine/*` becomes `/build/*` + `/g/[slug]` + `/api/chat`. Legacy Tailwind code dies.

---

## Wave 6 — first deploy + verify (~30 min)

When Wave 5 is merged + verified clean:
- I push to `atelier-integration` to trigger a Netlify build (per the deprecated-trunk pattern), OR
- We set up a new deploy trigger from `claude/bold-ride-Li5zK` directly (cleaner). Your call.

Smoke test live: real curator flow end-to-end on `vnext.peek.gift`.

---

## Status / cost / coordination signals

Send me when you have them:
- **"C pushed"** / **"C re-fired"** — Wave 1 status
- **"Wave 2 fired"** when 3 lieutenants kicked off
- **"<lt-name> reports done, pushed"** — any lieutenant returning
- **"taste check on X"** — your read on a vibe / demo
- **"need stack rethink on X"** — if something feels wrong

I auto-fetch + verify + merge any reported lieutenant. You don't need to coordinate the git side.

---

## Decision points to flag for you mid-session

- **If a lieutenant returns with a real architecture concern** (not just integration friction), I'll surface it before merging — your call whether to merge as-is or send back for revision.
- **If FAL key isn't wired by Wave 3 start**, BRIEF 14 (image gen) gets deferred; image generation no-ops, placeholders render fine.
- **If MCP gateway flakes during a merge verify** (we've seen 502s today), I'll retry; if it stays flaky, I push without the MCP-verified env check and we re-verify post-restart.
- **If the depth-layer UI (BRIEF 06) returns and doesn't feel like the mockup**, that's a tighten-and-rerun situation — I write the follow-up brief, you fire it.

---

## What you do NOT need to do during the session

- Manage git. I do it.
- Coordinate lieutenants with each other. Briefs reference each other; lieutenants check git themselves per the protocol.
- Verify lieutenant claims. I run typecheck/test/build on main after every merge.
- Hand-paste secrets. Setup concierge is the path; talk to it if a key comes up.

Your job: **fire lieutenants, give taste reads, make architecture calls when I surface them.** Mine: orchestrate the rest.

Let's eat.
