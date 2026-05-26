# Auth rip-out notes — claude/affectionate-tesla-IMMcr

## Scope completed

- Rewrote `atelier/components/auth/custom-sign-in-form.tsx`, `custom-sign-up-form.tsx`, `forgot-password-form.tsx` to use modern v7 Signal-based API from `@clerk/nextjs` (no `/legacy` imports anywhere in repo — verified with grep).
- Updated `atelier/components/auth/clerk-error.ts` `parseClerkError()` to accept both legacy `ClerkAPIResponseError` (`{ errors: [{code, message, longMessage}] }`) and modern v7 `ClerkError` (`{ code, message, longMessage }`) shapes returned from `signIn.x()` / `signUp.x()` `{ error }` tuples.
- Standardized auth-form redirect query param on `?returnTo=` (4 of 5 call sites in `/build/*` already used `returnTo`; sign-in form previously read `redirect_url`; sign-up form too). One-line change in each form. `/build/page.tsx` not touched.

## Files NOT touched (verified canonical for v7)

- `atelier/app/sso-callback/page.tsx` — `AuthenticateWithRedirectCallback` is still exported from `@clerk/nextjs` and is the canonical SSO-callback component for the default-success path.
- `atelier/proxy.ts` — `clerkMiddleware`, `createRouteMatcher`, `auth.protect()` all v7-canonical.
- `atelier/lib/env.ts` — all Clerk env var names unchanged in v7.
- `atelier/app/layout.tsx` — `<ClerkProvider>` from `@clerk/nextjs` is v7-canonical.

## Behavior preserved

Sign-in flow keeps the email-first → password/email-code → optional MFA step machine. Forgot-password keeps the request → reset-code+new-password two-form flow (now with proper status transition via `signIn.resetPasswordEmailCode.{sendCode,verifyCode,submitPassword}`). Sign-up keeps firstName/lastName + email/password → email-code verify flow.

## Deviations from the brief

- **Forgot-password form was logically slightly different in legacy** — it submitted code + password in one call to `signIn.attemptFirstFactor({ strategy: 'reset_password_email_code', code, password })`. The v7 modern API splits this into two methods: `resetPasswordEmailCode.verifyCode({code})` then `resetPasswordEmailCode.submitPassword({password})`. To preserve the existing UX (single submit button that accepts both fields), I kept the single form but the submit handler now does both calls sequentially (with a `codeVerified` flag to avoid re-verifying on a retry after `submitPassword` fails). User experience unchanged.
- **Captcha placeholder div** kept on sign-up form. Modern Clerk auto-mounts the captcha widget into `#clerk-captcha` when needed; harmless if not.
- **`isLoaded` removed** — the modern `useSignIn()` / `useSignUp()` hooks always return a non-null `signIn` / `signUp` resource, so no loading state needs rendering. (Forms render immediately, and `fetchStatus === 'fetching'` is folded into the existing `submitting` flag.)

## Build status

`npm run typecheck` — clean.
`npm run lint` — pre-existing errors in other files (no-html-link, no-danger rule missing); zero issues in the changed files.
`npm run build` — clean (with `APP_URL` env set for sandbox; the build was already env-gated this way).

## v7 notes file

`_packets/_orch-desktop/CLERK-V7-NOTES.md` documents the v7 modern API surface for future sessions: SignInFutureResource methods, SignUpFutureResource methods, the OAuth round-trip mechanics, error shape, and a theory for why the OAuth bounce-back was happening (legacy resource on signIn-side + modern callback handler = client-store desync across the OAuth round-trip).
