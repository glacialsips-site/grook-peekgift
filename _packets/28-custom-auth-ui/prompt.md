# Packet 28 — Custom auth UI (replace Clerk's prebuilt `<SignIn />` / `<SignUp />` with our own)

- **Worker:** cc-on-web
- **Branch:** `claude/packet-28-custom-auth-ui`
- **Depends on (sequencing):** `atelier-integration` (after Clerk allowed-origin is set on dashboard — confirmed pre-dispatch)
- **Imports from siblings:** `@/components/ui/*`, `@/lib/utils`
- **Validation:** `cd atelier && npm install && npm run build`, then visit `https://peek-gift-vnext.netlify.app/sign-in` and `/sign-up` — both should render OUR styled forms (no Clerk branding visible anywhere) and successfully sign someone in/up using `useSignIn()` / `useSignUp()` hooks.
- **Target paths:** `atelier/app/sign-in/**`, `atelier/app/sign-up/**`, `atelier/components/auth/**` (new)

## Context

Packet 06 dropped Clerk's prebuilt `<SignIn />` and `<SignUp />` components in because they were the fastest path to working auth. The user wants zero Clerk branding visible — our look, our copy, our flow. Clerk's React SDK exposes the underlying hooks (`useSignIn`, `useSignUp`, `useUser`, `useClerk`) that drive the same auth state machine — we build the form, validation, error handling, and step transitions ourselves while Clerk still handles the actual authentication, sessions, JWT issuance, etc.

The shape is:
- Email + password as primary path
- Email + 6-digit OTP as the verification step on signup AND as an alternative sign-in (Clerk calls it "email code" / "email_code" strategy)
- Password reset via email link
- Google OAuth as a one-click option (Clerk handles the redirect)
- All using `@/components/ui/{button,input,label}` from packet 05's shadcn-v4 set — no third-party UI
- Errors mapped from Clerk's error format to readable text we control

## Inputs

None. Reference: https://clerk.com/docs/custom-flows/overview for hook usage patterns. Clerk 7.x is what's installed (`@clerk/nextjs@7.4.1`).

## Deliver

### `atelier/components/auth/auth-card.tsx` (new)

A shared shell component that the sign-in and sign-up pages wrap their forms in. Centers content, applies our visual styling, displays our peek.gift wordmark + tagline at the top (text only — no logo asset), holds the form below. Same width on mobile and desktop, ~360px. No drop-shadow card, just clean centered content on `bg-background`.

### `atelier/components/auth/oauth-button.tsx` (new)

A `'use client'` button styled with our shadcn `<Button variant="outline">`. Accepts `provider: 'google' | 'apple' | 'github'` and an `onClick` that delegates to Clerk's `signIn.authenticateWithRedirect({ strategy: 'oauth_google', redirectUrl: '/sso-callback', redirectUrlComplete: '/build' })` (or equivalent for the relevant hook context). Renders a small inline SVG glyph for the provider plus "Continue with Google" etc. NO Clerk SDK glyphs.

### `atelier/app/sso-callback/page.tsx` (new)

The OAuth redirect target. Renders `<AuthenticateWithRedirectCallback />` from Clerk (this one is unbranded — it's a thin wrapper that processes the callback and routes). After completion, redirects to `/build` or wherever the user came from.

### `atelier/app/sign-in/[[...rest]]/page.tsx` (REPLACE)

Delete the `<SignIn />` body. Render `<CustomSignInForm />` (new client component below) inside `<AuthCard>`.

### `atelier/components/auth/custom-sign-in-form.tsx` (new — `'use client'`)

State machine, hand-rolled. Two modes: `'password'` (default) and `'email_code'` (OTP fallback). Uses Clerk's `useSignIn()` hook.

```tsx
'use client';

import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OAuthButton } from './oauth-button';

type Step =
  | { kind: 'start' }
  | { kind: 'password'; email: string }
  | { kind: 'email_code_sent'; email: string }
  | { kind: 'needs_2fa'; firstFactor: 'totp' | 'phone_code' };

export function CustomSignInForm() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const search = useSearchParams();
  const redirectUrl = search.get('redirect_url') ?? '/build';

  const [step, setStep] = useState<Step>({ kind: 'start' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoaded) {
    return <div className="text-sm text-muted-foreground">loading…</div>;
  }

  async function onSubmitEmail() {
    setError(null);
    setSubmitting(true);
    try {
      // First create a sign-in attempt with just the email to see what strategies are available
      const attempt = await signIn.create({ identifier: email });
      // Decide: if password is supported, ask for it; else email_code
      const supportsPassword = attempt.supportedFirstFactors?.some((f) => f.strategy === 'password');
      if (supportsPassword) {
        setStep({ kind: 'password', email });
      } else {
        const emailFactor = attempt.supportedFirstFactors?.find((f) => f.strategy === 'email_code');
        if (!emailFactor) {
          setError('No supported sign-in method for this email');
          return;
        }
        await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: emailFactor.emailAddressId });
        setStep({ kind: 'email_code_sent', email });
      }
    } catch (e) {
      setError(parseClerkError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitPassword() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({ strategy: 'password', password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push(redirectUrl);
      } else if (result.status === 'needs_second_factor') {
        const firstFactor = result.supportedSecondFactors?.[0]?.strategy === 'phone_code' ? 'phone_code' : 'totp';
        setStep({ kind: 'needs_2fa', firstFactor });
      }
    } catch (e) {
      setError(parseClerkError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitEmailCode() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push(redirectUrl);
      }
    } catch (e) {
      setError(parseClerkError(e));
    } finally {
      setSubmitting(false);
    }
  }

  // Render based on step:
  // - start: email input + Continue + "or" + OAuth buttons
  // - password: password input + Sign in + "send me a code instead" link
  // - email_code_sent: 6-digit code input + Verify + "didn't get it? resend"
  // - needs_2fa: 6-digit TOTP/SMS input + Verify
}

function parseClerkError(e: unknown): string {
  // Clerk errors come back as { errors: [{ code, message, longMessage }] }
  // Map known codes to friendly messages; fall through to longMessage; final fallback "Something went wrong"
}
```

Worker fleshes out the JSX for each step using `<Label>`, `<Input>`, `<Button>` from shadcn. Form inputs have proper `autoComplete` (`email`, `current-password`, `one-time-code`). Submit on Enter. Disabled state during `submitting`. Errors render below the form in red.

### `atelier/app/sign-up/[[...rest]]/page.tsx` (REPLACE)

Same shape as sign-in. Renders `<CustomSignUpForm />` inside `<AuthCard>`.

### `atelier/components/auth/custom-sign-up-form.tsx` (new — `'use client'`)

Uses `useSignUp()`. Step machine:

- `start`: email + (optional) first/last name + password fields → calls `signUp.create({ emailAddress, password, firstName, lastName })`
- `verify_email`: 6-digit code input → calls `signUp.attemptEmailAddressVerification({ code })` → on `status: 'complete'` → `setActive({ session: createdSessionId })` → redirect to `/build`
- Also `<OAuthButton provider="google" />` at top with the standard `signUp.authenticateWithRedirect(...)` pattern

Error handling same as sign-in. Reuse `parseClerkError`.

### `atelier/app/forgot-password/page.tsx` (new)

Two-step password reset:
1. Email input → `signIn.create({ identifier: email })` then `signIn.prepareFirstFactor({ strategy: 'reset_password_email_code', emailAddressId })`
2. Code + new password inputs → `signIn.attemptFirstFactor({ strategy: 'reset_password_email_code', code, password })` → on complete, `setActive({ session: createdSessionId })` → redirect to `/build`

Linked from the sign-in form via "Forgot password?" text-link.

### `atelier/proxy.ts` (modify)

Add `/sso-callback(.*)` and `/forgot-password(.*)` to public routes. The OAuth callback needs to be reachable unauthenticated; same for the password-reset start.

### Delete

`atelier/app/sign-in/[[...rest]]/page.tsx` and `atelier/app/sign-up/[[...rest]]/page.tsx` previously held one-liner `<SignIn />` / `<SignUp />`. Their replacements above use our forms; nothing else references the prebuilt components, so deletion is clean.

## Constraints

- **Zero Clerk branding visible anywhere.** No Clerk logos, no `<SignIn />`, no `<SignUp />`, no `<UserProfile />`. The only Clerk component allowed is `<AuthenticateWithRedirectCallback />` (it's invisible — just processes OAuth and redirects).
- TS strict. No `any`. Map Clerk's error shape via a typed parser.
- All form components are `'use client'`.
- Inputs have correct `autoComplete` so password managers work. Inputs on mobile have correct `inputMode`.
- Forms submit on Enter; disable buttons during `submitting`.
- Forms work without JavaScript-disabled progressive enhancement — no, skip that, we're full-React-client.
- Error messages are short, human, and never leak Clerk's internal codes. Build a small map: `'form_password_incorrect'` → "Wrong password.", `'form_identifier_not_found'` → "We don't recognize that email.", `'verification_failed'` → "That code didn't work. Try again or resend." Etc.
- Mobile-first layout. Inputs are 44px tall (thumb-friendly). Buttons fill width.
- Don't modify `package.json`, `app/layout.tsx`, `components/providers.tsx`, or anything outside the target paths.
- No narrative comments. Log any necessary ones in `_packets/COMMENTS.md`.

## Reply format

Branch `claude/packet-28-custom-auth-ui`, commit `packet 28: custom auth UI`, push. NOTES.md if you deviate (especially around Clerk's hook surface — they sometimes shift between minor versions).

Worker briefing (always apply): workspace check (`pwd` in `.claude/worktrees/agent-*/`), code only, ambiguities in NOTES.md, minimal reply.
