# `_claude/` — Claude's recon + working space

This directory is Claude's own scratch/working space for the peek.gift effort. It is
isolated from the application code on purpose. Nothing here is shipped to users.

## Prime directive
Get a real human (arriving from Instagram) to a working product and **money into the
owner's bank account**, collectable from every non-sanctioned country. The end-to-end
loop (create → publish/pay → recipient picks within rules → creator notified) is the
only milestone that counts. Everything else is in service of that.

## Operating contract (adopted from docs/PEEK_GIFT_BUILD.md)
1. **Prove, never claim.** "Done" = a passing test, a 200, a real deploy, or a screenshot.
2. **No skeletons / no `// TODO: implement` / no lorem.** Write the body or say I can't.
3. **Build for LIVE.** Wire real adapters; a stub is a zero-key fallback, never the plan.
4. **Small diffs, one concern each.** Unsure of scope → do less and stop, not more and guess.
5. **Honest status.** If a gate can't pass, STOP and report what blocks — don't fake it.

## Contents
- `snapshots/deployed/`  — extracted contents of `peekcodebaseDEPLOYED06072253.zip`
  (the owner's most recent *deployed* snapshot: vanilla HTML/JS + edge functions that
  generate the gift page live via Claude. Bookends — landing/auth/checkout — were
  intentionally stripped by the owner; they consider those the easy bolt-on.)
- `snapshots/iterated/`  — extracted `peekappiterated.zip` (minimal diff vs deployed:
  moved the generate endpoint Netlify Edge → Supabase Edge for the timeout headroom).
- `snapshots/_zips/`     — the original uploaded zips, untouched.
- `docs/`                — the owner-supplied briefs:
  - `peekgift_product_intent_source_orientation.md` (product intent)
  - `PEEK_GIFT_BUILD.md` (operating contract + decided architecture + source map +
    live-service inventory + the gated Chapter 0→8 BUILD-BOOK)
- `notes/`               — Claude's running recon notes / decisions (added as work proceeds).

## Status
Recon in progress. See `notes/` for the live picture and the horse-pick decision.
