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
6. **`SPEC.md` is the single source of truth** for what's being built (created from Frank's brief). **`DECISIONS.md`** records choices and dead-ends — read it, don't repeat dead-ends.
7. **Build for the end state, never the "now."** If the design-build will need it, set it up properly the first time — no stopgaps, no "you don't need it yet." Half-measures get redone, and redoing is the waste.

## Connectors available — use them
GitHub · Netlify · Supabase · Stripe · PostHog · Sentry · Figma · Twilio · Miro.

## Current focus
- **Now:** the mocked screen Frank provides + the in-site Claude chat. (`lib/anthropic.ts`, `app/api/chat/`, `lib/peek-tools.ts` exist as *reference*, not authority.)
- **Next:** fully custom auth (Clerk), same aesthetic.
- **Deprioritized:** landing (known-doable).

## Housekeeping
- Never commit secrets. `.env*` stays untracked. Don't commit build output (`.next/`).
- Push only to the working branch the current session is on.
