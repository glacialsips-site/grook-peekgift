# Packet 28 — integration notes

## Deviations

**Import path: `@clerk/nextjs/legacy` instead of `@clerk/nextjs`.**

Clerk 7.x ships two `useSignIn` / `useSignUp` hooks:

- `@clerk/nextjs` re-exports the new **signal-based** future hooks. `useSignIn()` returns `SignInSignalValue = { errors, fetchStatus, signIn: SignInFutureResource }`. No `isLoaded`, no `setActive`, no `supportedFirstFactors`/`prepareFirstFactor`/`attemptFirstFactor` on the resource — those have been replaced by `signIn.password({...})`, `signIn.emailCode.sendCode()`, etc. with promise returns of `{ data, error }`.
- `@clerk/nextjs/legacy` re-exports the **classic** `useSignIn` / `useSignUp` which return `UseSignInReturn` (the `{ isLoaded, signIn, setActive }` discriminated union) and the `SignInResource` shape the packet prompt was written against (with `create`, `prepareFirstFactor`, `attemptFirstFactor`, `attemptSecondFactor`, `authenticateWithRedirect`).

The packet prompt's hook surface (line 86-141 etc.) matches the classic API verbatim, so I imported from `/legacy`. The legacy hooks are not deprecated — they are the documented hooks for custom flows and are what `clerk.com/docs/custom-flows/overview` shows. They will continue to be supported. If a future cleanup wants to migrate to the signal API, it's a rewrite of all three forms.

## Files added

- `components/auth/auth-card.tsx` — centered shell with peek.gift wordmark + tagline, ~360px column, no card chrome.
- `components/auth/clerk-error.ts` — `parseClerkError(unknown)` mapping ~20 known Clerk error codes to short human strings; falls back to `longMessage`, then `message`, then a generic.
- `components/auth/form-error.tsx` — `role="alert"` + `aria-live="polite"` text in destructive color.
- `components/auth/oauth-button.tsx` — outline button + inline brand SVG for google/apple/github. Only google is wired into flows; the other two glyphs are ready if needed later.
- `components/auth/custom-sign-in-form.tsx` — 4-step state machine: `start` (email + Google) → `password` OR `email_code_sent` → optional `needs_2fa`. "Send me a code instead" link on the password step.
- `components/auth/custom-sign-up-form.tsx` — 2-step: `start` (Google + first/last/email/password) → `verify_email` (6-digit code). Includes `<div id="clerk-captcha" />` for invisible CAPTCHA mount (required by default Clerk instance config; renders no-op if CAPTCHA disabled).
- `components/auth/forgot-password-form.tsx` — 2-step reset_password_email_code flow.
- `app/sso-callback/page.tsx` — `'use client'` thin wrapper around `<AuthenticateWithRedirectCallback />` with fallback URLs to `/build`.
- `app/forgot-password/page.tsx` — server component wrapping `<ForgotPasswordForm />` in `<AuthCard>`.

## Files replaced

- `app/sign-in/[[...rest]]/page.tsx` — was a one-liner `<SignIn />`; now renders `<AuthCard><CustomSignInForm /></AuthCard>` with footer link to sign-up.
- `app/sign-up/[[...rest]]/page.tsx` — was a one-liner `<SignUp />`; now renders `<AuthCard><CustomSignUpForm /></AuthCard>` with footer link to sign-in.

## Files modified

- `proxy.ts` — added `/forgot-password(.*)` and `/sso-callback(.*)` to `isPublicRoute` matcher. Both must be reachable unauthenticated (the password-reset start and the OAuth callback respectively).

## Behavior notes

- Mobile-first: all inputs and buttons are `h-11` (44px); 6-digit code inputs use `inputMode="numeric"`, `autoComplete="one-time-code"`, `pattern="[0-9]*"`, `maxLength={6}`, and strip non-digits on change.
- Form submits on Enter via default `<form onSubmit>`; submit buttons disabled while in-flight via `submitting` state.
- All error messages mapped through `parseClerkError`; no Clerk internal codes leak to UI.
- `redirect_url` query param honored on sign-in / sign-up start steps (default `/build`); ignored on `forgot-password` (always redirects to `/build` after reset). OAuth flow forwards `redirect_url` via `redirectUrlComplete`.
- 2FA: handles `totp`, `phone_code`, `email_code` second factors with shared 6-digit code input.
- `oauth-button.tsx` ships three provider glyphs (Google, Apple, GitHub) but only Google is wired into the forms. Adding Apple/GitHub later = one `<OAuthButton>` line each, plus enabling the strategies in Clerk dashboard.

## Constraints checked

- Zero Clerk branding visible: `<SignIn />` / `<SignUp />` / `<UserProfile />` not used anywhere new. Only `<AuthenticateWithRedirectCallback />` (invisible processor) remains.
- TS strict, no `any`. Clerk error parser uses a typed `ClerkErrorShape` cast at the boundary.
- `package.json`, `app/layout.tsx`, `components/providers.tsx` untouched.
- No narrative comments. `_packets/COMMENTS.md` not amended.

## Build

`cd atelier && APP_URL=http://localhost:3000 npm install && npm run build` — green. All 23 routes compile, including new `/forgot-password` (static prerender) and `/sso-callback` (static prerender). `APP_URL` is required by `lib/env.ts` schema at module load; the Netlify deploy already has it set, so no orchestrator action needed.

## Live verification (orchestrator/user task)

User to visit `https://peek-gift-vnext.netlify.app/sign-in`, `/sign-up`, `/forgot-password` and confirm:
1. Custom forms render (no Clerk branding/iframes).
2. Google OAuth round-trips through `/sso-callback` and lands on `/build`.
3. Email + password sign-in succeeds for an existing account.
4. Sign-up with new email sends a 6-digit code, code completes the session, lands on `/build`.
5. Forgot password sends a code, accepts new password, signs in.

If any throws `clerk: domain not allowed`, the Clerk Dashboard → Domains list is missing `peek-gift-vnext.netlify.app` and needs it added (user task — Clerk MCP doesn't expose this).
