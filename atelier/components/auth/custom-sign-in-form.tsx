'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useSignIn } from '@clerk/nextjs';
import type {
  OAuthStrategy,
  SignInFirstFactor,
  SignInSecondFactor,
  SetActiveNavigate,
} from '@clerk/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OAuthButton } from './oauth-button';
import { FormError } from './form-error';
import { parseClerkError } from './clerk-error';

type MfaStrategy = 'totp' | 'phone_code' | 'email_code';

type Step =
  | { kind: 'start' }
  | { kind: 'password'; email: string }
  | { kind: 'email_code_sent'; email: string }
  | { kind: 'needs_2fa'; strategy: MfaStrategy };

function pickMfaStrategy(factors: SignInSecondFactor[] | undefined): MfaStrategy {
  const first = factors?.[0];
  if (first?.strategy === 'phone_code') return 'phone_code';
  if (first?.strategy === 'email_code') return 'email_code';
  return 'totp';
}

function hasFirstFactor(
  factors: SignInFirstFactor[],
  strategy: SignInFirstFactor['strategy'],
): boolean {
  return factors.some((f) => f.strategy === strategy);
}

export function CustomSignInForm() {
  const { signIn, fetchStatus } = useSignIn();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const redirectUrl = search.get('returnTo') ?? '/build';

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      router.replace(redirectUrl);
    }
  }, [authLoaded, isSignedIn, router, redirectUrl]);

  const [step, setStep] = useState<Step>({ kind: 'start' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = submitting || fetchStatus === 'fetching';

  const navigateAfterSession: SetActiveNavigate = async ({ session, decorateUrl }) => {
    if (session?.currentTask) return;
    const url = decorateUrl(redirectUrl);
    if (url.startsWith('http')) {
      window.location.href = url;
      return;
    }
    router.push(url);
  };

  async function completeIfReady(): Promise<boolean> {
    if (signIn.status === 'complete') {
      const { error: finalizeError } = await signIn.finalize({
        navigate: navigateAfterSession,
      });
      if (finalizeError) {
        setError(parseClerkError(finalizeError));
        return false;
      }
      return true;
    }
    if (signIn.status === 'needs_second_factor') {
      setStep({
        kind: 'needs_2fa',
        strategy: pickMfaStrategy(signIn.supportedSecondFactors),
      });
      return false;
    }
    return false;
  }

  async function handleOAuth(strategy: OAuthStrategy) {
    setError(null);
    const { error: ssoError } = await signIn.sso({
      strategy,
      redirectUrl,
      redirectCallbackUrl: '/sso-callback',
    });
    if (ssoError) setError(parseClerkError(ssoError));
  }

  async function onSubmitEmail(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: createError } = await signIn.create({ identifier: email });
      if (createError) {
        setError(parseClerkError(createError));
        return;
      }
      const factors = signIn.supportedFirstFactors;
      if (hasFirstFactor(factors, 'password')) {
        setStep({ kind: 'password', email });
        return;
      }
      if (!hasFirstFactor(factors, 'email_code')) {
        setError("We can't sign you in with that email yet.");
        return;
      }
      const { error: sendError } = await signIn.emailCode.sendCode({
        emailAddress: email,
      });
      if (sendError) {
        setError(parseClerkError(sendError));
        return;
      }
      setStep({ kind: 'email_code_sent', email });
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitPassword(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: passwordError } = await signIn.password({
        password,
        identifier: step.kind === 'password' ? step.email : email,
      });
      if (passwordError) {
        setError(parseClerkError(passwordError));
        return;
      }
      await completeIfReady();
    } finally {
      setSubmitting(false);
    }
  }

  async function onSwitchToEmailCode() {
    setError(null);
    setSubmitting(true);
    try {
      const { error: sendError } = await signIn.emailCode.sendCode({
        emailAddress: step.kind === 'password' ? step.email : email,
      });
      if (sendError) {
        setError(parseClerkError(sendError));
        return;
      }
      setStep({
        kind: 'email_code_sent',
        email: step.kind === 'password' ? step.email : email,
      });
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  async function onResendEmailCode() {
    setError(null);
    setSubmitting(true);
    try {
      const { error: sendError } = await signIn.emailCode.sendCode({
        emailAddress: step.kind === 'email_code_sent' ? step.email : email,
      });
      if (sendError) setError(parseClerkError(sendError));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitEmailCode(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: verifyError } = await signIn.emailCode.verifyCode({ code });
      if (verifyError) {
        setError(parseClerkError(verifyError));
        return;
      }
      await completeIfReady();
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit2fa(ev: FormEvent) {
    ev.preventDefault();
    if (step.kind !== 'needs_2fa') return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: verifyError } =
        step.strategy === 'totp'
          ? await signIn.mfa.verifyTOTP({ code })
          : step.strategy === 'phone_code'
            ? await signIn.mfa.verifyPhoneCode({ code })
            : await signIn.mfa.verifyEmailCode({ code });
      if (verifyError) {
        setError(parseClerkError(verifyError));
        return;
      }
      await completeIfReady();
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoaded && isSignedIn) {
    return null;
  }

  if (step.kind === 'start') {
    return (
      <div className="space-y-4">
        <OAuthButton
          provider="google"
          onClick={() => handleOAuth('oauth_google')}
          disabled={busy}
        />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>or</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={onSubmitEmail} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </div>
          <FormError>{error}</FormError>
          <Button
            type="submit"
            className="h-11 w-full"
            disabled={busy || !email}
          >
            Continue
          </Button>
        </form>
      </div>
    );
  }

  if (step.kind === 'password') {
    return (
      <form onSubmit={onSubmitPassword} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email-readonly">Email</Label>
          <Input
            id="email-readonly"
            type="email"
            value={step.email}
            readOnly
            className="h-11 bg-muted"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11"
          />
        </div>
        <FormError>{error}</FormError>
        <Button
          type="submit"
          className="h-11 w-full"
          disabled={busy || !password}
        >
          Sign in
        </Button>
        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToEmailCode}
            disabled={busy}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
          >
            Send me a code instead
          </button>
        </div>
      </form>
    );
  }

  if (step.kind === 'email_code_sent') {
    return (
      <form onSubmit={onSubmitEmailCode} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium text-foreground">{step.email}</span>.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="h-11 tracking-[0.4em] text-center text-lg"
          />
        </div>
        <FormError>{error}</FormError>
        <Button
          type="submit"
          className="h-11 w-full"
          disabled={busy || code.length < 6}
        >
          Verify
        </Button>
        <div className="text-center">
          <button
            type="button"
            onClick={onResendEmailCode}
            disabled={busy}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
          >
            Didn't get it? Resend.
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit2fa} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {step.strategy === 'totp'
          ? 'Enter the 6-digit code from your authenticator app.'
          : step.strategy === 'phone_code'
            ? 'Enter the code we just texted you.'
            : 'Enter the code we just emailed you.'}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="code-2fa">Code</Label>
        <Input
          id="code-2fa"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          autoFocus
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="h-11 tracking-[0.4em] text-center text-lg"
        />
      </div>
      <FormError>{error}</FormError>
      <Button
        type="submit"
        className="h-11 w-full"
        disabled={busy || code.length < 6}
      >
        Verify
      </Button>
    </form>
  );
}
