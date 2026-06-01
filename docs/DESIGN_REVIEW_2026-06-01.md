# DESIGN REVIEW — peek.gift renderer (2026-06-01)
### From the design seat to Claude Code. Read top-to-bottom, then deploy (last section).

> How these findings were produced (so you trust them): the design side imported the
> **real** `lib/peek-render` modules from this branch and ran `mountPeek` against authored
> IRs in an in-browser harness (Babel-transpiled, schema shimmed) — i.e. **your actual
> renderer code**, not a re-implementation. A verifier subagent then read the **live DOM**
> for facts (static screenshots flatten dynamic fonts + motion, so DOM facts are
> authoritative). Three IRs were tested: dad-60th (restrained work-order), a loud neon
> rave, and a multi-source gift bundle.

---

## 1. What's LANDING at caliber (keep / don't regress)

**Renderer consumes the contract and restructures per concept** — the archetype fix worked.
- **dad-60th → "For the Old Man" caliber.** Hero "FOR THE OLD MAN" in **Oswald @103px**,
  exact palette **kraft `#C9B795` / olive `#39411F` / rust `#B0532A`**, the model-authored
  **ticket-stub `custom` block rendered**, "The Haul" work-order line items, all IR sections,
  in-world sticky CTA. Display font varied correctly (not a default sans).
- **Loud concept (neon rave) renders AND animates at caliber.** "PLUG IN" in **Orbitron
  @114px**, neon **magenta `#FF2D95` / cyan `#28E0FF`** on near-black, and crucially the
  **scene animates** (`gridfloor` → `peek-floor` 1.8s scroll), load-cascade (`peek-rise`),
  reveals resolve, custom block renders, sticky "Get tickets". Motion genuinely fires.
- **Across all:** theming, gift-bundle structure (hero + note + grid + how-it-works — NOT an
  invite skeleton), **retail source badges** (NIKE/HOMEMADE), and the **taunt** card
  (`peek-card-taunt` + taunt_text) all render well. No errors, no broken layout, no
  unresolved `var()` tokens.

---

## 2. CONFIRMED GAPS — fix these next (priority order)

> Context: the product (per `concept-breakdown`) is **collecting items across many
> retailers + custom/homemade inputs + experiences (itinerary-wrapped) + taunts, chosen by
> the recipient under curator-set RULES.** It is **not** an invite/scheduler. Two of those
> core differentiators are currently **silently dropped by the renderer** — the data is in
> the IR; the renderer ignores it. This is the real drift, at the renderer level.

### GAP 1 — Selection / RULES engine is not rendered (HIGHEST priority — it's the defensible core)
- Verified on a `pick_one` variant group ("Pick one pair", cards c1/c2/c3): they render as
  **three independent tiles** — no grouping container, no group label, no pick-one affordance.
- Worse, **every** card carries an identical generic **"★ GOT IT"** badge, so `pick_one` vs
  `pick_any`/free-for-all vs beg-to-unlock are **indistinguishable**.
- **Fix:** render `variant_groups` as a *grouped, labeled* set with a **rule-aware affordance**:
  `pick_one` → single-select; `pick_any`/free-for-all → multi-select; `is_locked` / `unlock_rule.kind:'beg'` → locked-until-unlock. The claim affordance must reflect the actual rule, not a uniform badge. The recipient surface must enforce it.

### GAP 2 — Experience-as-itinerary is dropped
- Verified on an `activity` card ("Dinner at Otto") with `proposed_date`, `location_hint`,
  and `metadata.itinerary = [3 plan lines]`: it **collapses to a generic product tile** —
  the itinerary lines are **entirely absent**; an experience reads identical to a product.
- **Fix:** render `activity` cards as an **itinerary/plan treatment** (date + place + the
  steps), not a product tile. Recommend promoting **`itinerary` to a first-class field on
  activity cards** in the contract (not buried in `metadata`) so it surfaces reliably.

### GAP 3 — smaller, real
- **`glow:true` not wired to hero type.** On neon concepts the headline has
  `text-shadow:none / filter:none` despite `palette.glow:true`. Wire glow → a neon
  text-shadow on the hero display type (+ section headings). It's the "good→rave-caliber" gap.
- **Homemade/custom** items use the **same badge style as retail** — give custom/homemade a
  visually distinct treatment.
- **Card descriptions render inconsistently** (some show, some don't) — normalize.

---

## 3. Also pending (not renderer)
- **Three product docs are NOT in git** (`peekgift-concept-breakdown.md`,
  `peek-gift-REQUIREMENTS-SPEC.md`, `backendservices-revised.md`) — they were only pasted
  into chats. **Commit them under `/docs/` and reference from `WAKEUP.md`** so every fresh
  chat inherits them.
- **Reconcile against the contract/PLAN** two concept-doc features not yet covered:
  **collaboration** (multiple curators add items → merged page, hero locked by creator) and
  **voice + `+` attachment (images/camera/files) chat UI** (the Claude-app paradigm).
- **Success-metric guardrail** for the chat: get to checkout fast *without* speedrunning past
  the personal note + theming (the part that makes it more than a gift card).

---

## 4. DEPLOY FIRST (before the fixes above — founder wants to test live)
1. Confirm `next build` passes.
2. Deploy this branch to the **`peek-gift-vnext` Netlify site** (the one with env vars).
3. Reply with live URLs: **`/studio`** (chat-over-preview), **`/render-check`** (dad
   conformance render), **`/build`** (curator flow), and a sample **`/g/[slug]`** recipient page.
4. If `ANTHROPIC_API_KEY` isn't set in that site's env, **deploy anyway** — the renderer runs
   on stubs (structure/theming/motion testable); note which routes need the key to be fully live.
5. **Hold GAP 1–3 fixes until the founder has tested live.** On the live site the two core
   gaps (rules, itinerary) will be visible — they're known-pending, judge structure/theming/
   motion around them.

---

## 5. Sequence from here
Deploy (§4) → founder tests live → then GAP 1 (rules engine) + GAP 2 (itinerary) as the
priority pair (they ARE the product), then GAP 3 polish → design verifies each via the real
renderer → then §3 reconciliation. Commit STATE.md + hand to a fresh chat before ~70% context.
