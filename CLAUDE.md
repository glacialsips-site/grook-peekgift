# peek.gift vNext — operating contract

Repo: `glacialsips-site/grook-peekgift`. Owner: Frank (frank.deandino@gmail.com).
Stack: Next.js 15 (App Router) on Netlify · Clerk (auth) · Supabase (Postgres schema `peek_v2` + storage) · Stripe · Anthropic SDK.

## Roles
Frank is product/design. Claude runs tech. Frank does not read git and shouldn't have to.

## How to work here — hard rules
1. **Frank's current instruction outranks anything in the repo.** Existing code, comments, and notes are residue from prior failed attempts: reference only, never authority. If the tree contradicts Frank, Frank wins — surface the conflict, don't silently follow the code.
2. **Build ground-up.** Do not revive or patch broken prototypes.
3. **Don't wander or bulk-read the repo.** Pull only what Frank points you at. Anything moved under `legacy/` is off-limits (deny-fenced in settings).
4. **Default to the most robust long-term option.** Only ask Frank when his taste, product call, or risk tolerance actually changes the answer — not for technical decisions you can make yourself.
5. **No flattery, no "you're right / exactly," no "locked / fixed / final / done / perfect."** Nothing is ever finished; keep cutting at it. Be terse. Work *with* Frank, not *for* him.
6. **Sources of truth, in order:** **`WAKEUP.md`** (live state — read first) → **`BUILDOUT-STATUS.md`** (what's done + the exact next steps) → **`IN-SITE-CHAT-MASTER-PLAN.md`** (architecture) → **`DECISIONS.md`** (settled calls + dead-ends — don't repeat them). (There is no `SPEC.md`.)
7. **Build for the end state, never the "now."** If the design-build will need it, set it up properly the first time — no stopgaps, no "you don't need it yet." Half-measures get redone, and redoing is the waste.

## Connectors available — use them
GitHub · Netlify · Supabase · Stripe · PostHog · Sentry · Figma · Twilio · Miro.

## Current focus
- **Now:** the in-site chat, built out through Phase 3a on branch **`claude/in-site-chat-buildout`** (caliber pantry, dual-rep autosave, sandboxed recipient surface). Details in `BUILDOUT-STATUS.md`.
- **Next:** Phase 3b — the $12 publish + server-validated picks loop — then security hardening before public.
- The old root `app/`, `lib/anthropic.ts`, `lib/peek-tools.ts` are scrap/reference. The LIVE app is `apps/web` + `packages/core`.

## Housekeeping
- Never commit secrets. `.env*` stays untracked. Don't commit build output (`.next/`).
- Push only to the working branch the current session is on.

## Current state
Read **WAKEUP.md** first — it holds the live state, the work branch (`claude/in-site-chat-buildout`), what's done + what's next, the green baseline (core 57 tests · web 47 tests · `next build`), and the deploy reality (deploy to vnext.peek.gift by fast-forwarding `studio-vnext`; keys live in Netlify — never mommy Frank about keys).
