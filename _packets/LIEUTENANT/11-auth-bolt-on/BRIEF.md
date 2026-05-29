# BRIEF 11 — Auth bolt-on (Clerk headless + custom UI)

**Source of need:** the spine-thread runs with `curator_id = null` and `metadata.spine = true` — no real auth. This brief installs production auth. **Engine = Clerk; face = ours.** ZERO Clerk-branded UI.

**Read first:**
1. `_packets/SPINE/STACK-LOCK.md` — auth row.
2. `_packets/LIEUTENANT/01-spine-thread/RETURN.md` — pitfall #2 (Clerk middleware default-protects; need `isPublicRoute` entries); pitfall #8 (cookies-in-middleware for `/g/[slug]`).
3. `atelier/proxy.ts` — current Clerk middleware (2 lines added by spine for `/spine` whitelist).
4. Existing `atelier/lib/auth/*` + `atelier/components/auth/*` — read for context, but these are likely Tailwind-era; assess what survives vs razes.
5. Clerk headless / Elements docs (use WebSearch; Anthropic ships fast — verify the current API).
6. **Reference:** Anthropic Console's sign-in (Frank's stated taste target). Match that energy: clean, minimal, no logo dominance, smooth OAuth flow.

## DELIVERABLES

### 1. Custom auth UI

`atelier/components/auth/` (raze existing, replace):
- `sign-in.tsx` — Clerk headless `<SignIn>` Elements or `<SignIn.Root>` composition. NO `<SignIn />` default. Email + OAuth (Google, Apple) only; SMS + magic link future.
- `sign-up.tsx` — same pattern.
- `verify-email.tsx` — Clerk's email verification flow, custom UI.
- All components use `--vibe-*` tokens (the auth pages have their OWN neutral vibe — landing-frame style; do not vibe-shift auth).
- Mobile-first: full-screen, single-column, 16px+ inputs, 44px+ tap targets.

### 2. Routes

- `atelier/app/sign-in/[[...rest]]/page.tsx` — Clerk's catch-all route convention; mounts `<SignIn>` custom component.
- `atelier/app/sign-up/[[...rest]]/page.tsx` — same for sign-up.
- `atelier/app/sso-callback/page.tsx` — Clerk OAuth callback (use Clerk's `<AuthenticateWithRedirectCallback>` if needed).

### 3. Middleware

`atelier/proxy.ts`:
- Confirm `isPublicRoute` includes `/`, `/sign-in/*`, `/sign-up/*`, `/sso-callback`, `/spine` (already added), `/spine/*`, `/g/*`, `/api/og/*`.
- For protected routes (build/published-curator-actions), Clerk's middleware handles auth challenge.

### 4. Server-side helpers

`atelier/lib/auth/`:
- `current-user.ts` — `getCuratorOrNull()` returning `{ userId, email, firstName } | null` for SC reads. Fail-soft (returns null, never throws).
- `require-user.ts` — `requireCurator()` returning the same shape; throws redirect for protected server actions.
- Cookies: any cookie writes (anon-session, recipient-session) live in `proxy.ts`, NOT in Server Components. (Spine RETURN.md pitfall #8.)

### 5. Migration from guest → authenticated curator

When a curator who started in guest mode signs in:
- The build route detects the auth state change post-sign-in.
- Server action `claim-guest-peek.ts` transfers the existing draft peek (matched by anon-session cookie) from `curator_id = null` to the real `curator_id`. Idempotent.
- The chat session continues — Peek doesn't know auth changed; just sees the existing peek state.

### 6. Webhook handler

`atelier/app/api/webhooks/clerk/route.ts`:
- Verify Svix signature against `CLERK_WEBHOOK_SIGNING_SECRET`.
- Handle `user.created` (insert into `users` / `curators` table); `user.updated` (update email/name); `user.deleted` (cascade per RLS or soft-delete depending on retention).
- Return 200 always after verification — never reveal whether the user exists.

### 7. Tests

- Sign-in / sign-up component renders without Clerk branding (no `Clerk` text, no logo in image alt-text).
- Server helpers return null for unauthenticated request, user for authenticated.
- `isPublicRoute` matches expected list.
- Guest → authenticated peek claim is idempotent.
- Webhook handler verifies signature, rejects unsigned.

## HARD RULES

- **ZERO Clerk branding visible.** No "Powered by Clerk", no Clerk logo, no `<UserButton />` default. Custom UI everywhere. If Clerk's headless components emit branded subtree, override the slot.
- **Anthropic-grade aesthetic.** Match Frank's reference (Anthropic Console sign-in). Calm, minimal, clear hierarchy.
- **No Tailwind.** CSS Modules + `--vibe-*` tokens.
- **`curator_id` NULL allowed.** Guest mode is first-class. Auth is opt-in, gated at publish.
- **Don't break legacy.** Clerk app is shared with legacy peek.gift (`pk_live_Y2xlcmsucGVlay5naWZ0JA`). Don't change Clerk config, OAuth providers, or anything in the Clerk dashboard without explicit Frank go.
- **Branch:** `lt/auth-bolt-on` off `claude/bold-ride-Li5zK`. Push.

## VERIFICATION

- `npm --prefix atelier run typecheck` — 0.
- `npm --prefix atelier run test` — pass + new auth tests.
- `npm --prefix atelier run build` — clean.
- Smoke-test: `/sign-in` and `/sign-up` render in mobile viewport; OAuth flow works in browser (lieutenant runs locally with creds or flags as Frank-verify).

## RETURN.md

Sections: what you built; visible-Clerk-branding audit (grep for "Clerk", screenshot any leftover branding); guest→authenticated migration test; webhook verification test; any Clerk-headless quirks; Frank-verifiable smoke steps. Honesty section.

Per PROTOCOL.md: push `lt/auth-bolt-on`, write RETURN.md.
