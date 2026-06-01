# Clerk v7 modern (Signal-based) API — notes for future sessions

Reference for the rip-out of `@clerk/nextjs/legacy` from custom auth forms.
Source of truth: `atelier/node_modules/@clerk/shared/dist/types/index.d.ts` + Clerk v7 custom-flow docs.

## Two API surfaces in @clerk/nextjs@^7

`@clerk/nextjs/legacy` (the v6→v7 compat shim) re-exports `useSignIn`/`useSignUp` from `@clerk/react/legacy`. Returns the v6 `{ isLoaded, signIn, setActive }` shape where `signIn` is `SignInResource` (methods: `.create()`, `.prepareFirstFactor()`, `.attemptFirstFactor()`, `.authenticateWithRedirect()`, `.attemptSecondFactor()`, etc.).

`@clerk/nextjs` (modern) exports `useSignIn`/`useSignUp` from `@clerk/react`. Returns `SignInSignalValue`/`SignUpSignalValue`:

```ts
interface SignInSignalValue {
  errors: SignInErrors;             // { fields: SignInFields; raw: unknown[] | null; global: ClerkGlobalHookError[] | null }
  fetchStatus: 'idle' | 'fetching';
  signIn: SignInFutureResource;     // always non-null in modern hook
}
interface SignUpSignalValue {
  errors: SignUpErrors;
  fetchStatus: 'idle' | 'fetching';
  signUp: SignUpFutureResource;     // always non-null
}
```

There is no `isLoaded` and no `setActive` from these hooks. Session activation happens via `signIn.finalize()` / `signUp.finalize()`, or `useClerk().setActive(...)` for the SSO-callback transfer cases (see below).

## SignInFutureResource API surface

All write methods return `Promise<{ error: ClerkError | null }>` — they do NOT throw on Clerk API errors. They DO throw on real runtime errors (network, etc.).

Read-only state (Signal-tracked, auto-updates UI):
- `status: SignInStatus` — `'needs_identifier' | 'needs_first_factor' | 'needs_second_factor' | 'needs_client_trust' | 'needs_new_password' | 'complete'`
- `supportedFirstFactors: SignInFirstFactor[]`
- `supportedSecondFactors: SignInSecondFactor[]`
- `firstFactorVerification: VerificationResource`
- `secondFactorVerification: VerificationResource`
- `identifier: string | null`
- `createdSessionId: string | null`
- `userData`
- `isTransferable: boolean` — set when a sign-in identifier exists on the sign-up side instead
- `existingSession?: { sessionId: string }`

Methods (all returning `Promise<{ error }>`):
- `create(params: { identifier?, password?, strategy?, redirectUrl?, transfer?, ticket?, signUpIfMissing? })` — populates `supportedFirstFactors` (use this to discover whether the user has password configured).
- `password({ password, identifier | emailAddress | phoneNumber })` — submit password (canonical for email+password sign-in).
- `emailCode.sendCode({ emailAddress? | emailAddressId? })` — send code to email.
- `emailCode.verifyCode({ code })` — verify email code.
- `phoneCode.sendCode({ phoneNumber? | phoneNumberId, channel? })`
- `phoneCode.verifyCode({ code })`
- `resetPasswordEmailCode.sendCode()` — requires `create({ identifier })` first.
- `resetPasswordEmailCode.verifyCode({ code })` — moves status to `'needs_new_password'`.
- `resetPasswordEmailCode.submitPassword({ password, signOutOfOtherSessions? })` — moves status to `'complete'`.
- `sso({ strategy, redirectUrl, redirectCallbackUrl })` — start OAuth. `redirectCallbackUrl` is the in-app callback page (e.g. `/sso-callback`); `redirectUrl` is the final post-auth destination.
- `mfa.sendPhoneCode()` / `verifyPhoneCode({ code })` / `sendEmailCode()` / `verifyEmailCode({ code })` / `verifyTOTP({ code })` / `verifyBackupCode({ code })`
- `finalize({ navigate? })` — set newly-created session as active. `navigate` callback receives `{ session, decorateUrl }` — `decorateUrl` may return an http URL (Safari ITP refresh) in which case use `window.location.href`.
- `reset()` — clear local state without API call.

## SignUpFutureResource API surface

Same `{ error }` return contract. Status: `'missing_requirements' | 'complete' | 'abandoned'`.

Methods:
- `create({ emailAddress?, password?, firstName?, lastName?, phoneNumber?, username?, strategy?, transfer?, ticket?, web3Wallet?, unsafeMetadata?, legalAccepted?, locale? })`
- `update({ ...same as additional })`
- `password({ password, emailAddress | phoneNumber | username, ...additional })` — shorthand for `create({ password, emailAddress })`.
- `verifications.sendEmailCode()` / `verifyEmailCode({ code })` / `sendEmailLink({ verificationUrl })` / `sendPhoneCode({ channel? })` / `verifyPhoneCode({ code })`.
- `sso({ strategy, redirectUrl, redirectCallbackUrl, ...additional })`
- `finalize({ navigate? })`
- `reset()`

Captcha: drop `<div id="clerk-captcha" />` on the sign-up form. Clerk auto-mounts when needed.

## OAuth / SSO callback in v7

`AuthenticateWithRedirectCallback` is still exported from `@clerk/nextjs` and works fine for the canonical case (no transfer, no MFA). It auto-finalizes the session and navigates.

For custom flows that need to handle `signIn.isTransferable` / `signUp.isTransferable` (account-doesn't-exist edge case), Clerk v7 also exports `HandleSSOCallback` from `@clerk/react` with `navigateToApp`/`navigateToSignIn`/`navigateToSignUp` callbacks. Both work; `AuthenticateWithRedirectCallback` is the simpler default.

`AuthenticateWithRedirectCallback` accepts `signInFallbackRedirectUrl` and `signUpFallbackRedirectUrl`. **Keeping this for atelier — it's the right v7 canonical choice for the default OAuth-success path.**

## Error handling

The modern `errors` object from `useSignIn()` / `useSignUp()` updates reactively after each method call:

```ts
errors.fields.identifier?.message  // for sign-in
errors.fields.password?.message
errors.fields.code?.message
errors.fields.emailAddress?.message  // for sign-up
// ...
errors.global  // ClerkGlobalHookError[] | null — top-level errors
errors.raw     // unknown[] | null — raw API errors
```

The `{ error }` returned from each method call is a single `ClerkError | null`. The instance properties are:
- `code: string`
- `message: string`
- `longMessage: string | undefined`
- `clerkError: true`
- `cause?: Error`

`parseClerkError(e)` in `atelier/components/auth/clerk-error.ts` was written to handle the legacy `ClerkAPIResponseError` shape (`{ errors: [{ code, message, longMessage }] }`). For the modern returned `ClerkError`, we read `.code` / `.message` directly. Both shapes get unified in the updated parser.

## proxy.ts middleware

`clerkMiddleware`, `createRouteMatcher`, and `auth.protect()` are all v7-canonical. **No changes needed to `atelier/proxy.ts`.**

## ClerkProvider

`<ClerkProvider>` from `@clerk/nextjs` is v7-canonical. Confirmed in `node_modules/@clerk/nextjs/dist/types/index.d.ts`. **No changes needed to `atelier/app/layout.tsx`.**

## Env vars

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` — all still v7-canonical. **No changes needed to `atelier/lib/env.ts`.**

## Redirect-param standard

App-internal route guards (`/build/*`, etc.) redirect with `?returnTo=/path`. The sign-in form previously read `?redirect_url=`. Standardized on **`returnTo`** in the form since most call sites already use it (4 of 5).

## Why the OAuth bounce-back was happening

`@clerk/nextjs/legacy` `useSignIn()` returns a `SignInResource`. Calling `signIn.authenticateWithRedirect({ strategy, redirectUrl: '/sso-callback', redirectUrlComplete: '/build' })` is the v6-style flow. With the v7 `<ClerkProvider>` mounted, the legacy `authenticateWithRedirect` *can* still post to Clerk's frontend API, but the SSO callback page using v7 `AuthenticateWithRedirectCallback` then handles the return. The v6/v7 boundary across the OAuth round-trip can desync the client-stored sign-in resource — particularly when the modern hook's signal-based reactive store doesn't observe the legacy mutation. Net effect: callback fires, session token gets set, but the sign-in resource on the client thinks it never started, so navigation back to `/build` triggers the route guard which re-redirects to `/sign-in`.

Switching the entire flow to modern (`signIn.sso()` → `<AuthenticateWithRedirectCallback />` → server `auth()` sees the session) keeps the resource consistent across the round-trip.
