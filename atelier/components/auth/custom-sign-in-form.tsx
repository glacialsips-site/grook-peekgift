'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs/legacy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OAuthButton } from './oauth-button';
import { FormError } from './form-error';
import { parseClerkError } from './clerk-error';

type Step =
  | { kind: 'start' }
  | { kind: 'password'; email: string }
  | { kind: 'email_code_sent'; email: string; emailAddressId: string }
  | { kind: 'needs_2fa'; strategy: 'totp' | 'phone_code' | 'email_code' };

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

  if (!isLoaded || !signIn) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        loading…
      </div>
    );
  }

  async function handleOAuth(strategy: 'oauth_google') {
    if (!signIn) return;
    setError(null);
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: redirectUrl,
      });
    } catch (e) {
      setError(parseClerkError(e));
    }
  }

  async function onSubmitEmail(ev: FormEvent) {
    ev.preventDefault();
    if (!signIn) return;
    setError(null);
    setSubmitting(true);
    try {
      const attempt = await signIn.create({ identifier: email });
      const factors = attempt.supportedFirstFactors ?? [];
      const hasPassword = factors.some((f) => f.strategy === 'password');
      if (hasPassword) {
        setStep({ kind: 'password', email });
      } else {
        const emailFactor = factors.find(
          (f): f is Extract<typeof f, { strategy: 'email_code' }> =>
            f.strategy === 'email_code',
        );
        if (!emailFactor) {
          setError("We can't sign you in with that email yet.");
          return;
        }
        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: emailFactor.emailAddressId,
        });
        setStep({
          kind: 'email_code_sent',
          email,
          emailAddressId: emailFactor.emailAddressId,
        });
      }
    } catch (e) {
      setError(parseClerkError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitPassword(ev: FormEvent) {
    ev.preventDefault();
    if (!signIn) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'password',
        password,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push(redirectUrl);
        return;
      }
      if (result.status === 'needs_second_factor') {
        const factor = result.supportedSecondFactors?.[0];
        const strategy: 'totp' | 'phone_code' | 'email_code' =
          factor?.strategy === 'phone_code'
            ? 'phone_code'
            : factor?.strategy === 'email_code'
              ? 'email_code'
              : 'totp';
        setStep({ kind: 'needs_2fa', strategy });
        return;
      }
      setError('Sign-in needs another step. Try again.');
    } catch (e) {
      setError(parseClerkError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSwitchToEmailCode() {
    if (!signIn) return;
    setError(null);
    setSubmitting(true);
    try {
      const factors = signIn.supportedFirstFactors ?? [];
      const emailFactor = factors.find(
        (f): f is Extract<typeof f, { strategy: 'email_code' }> =>
          f.strategy === 'email_code',
      );
      if (!emailFactor) {
        setError("We can't send a code to that email.");
        return;
      }
      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: emailFactor.emailAddressId,
      });
      setStep({
        kind: 'email_code_sent',
        email,
        emailAddressId: emailFactor.emailAddressId,
      });
      setCode('');
    } catch (e) {
      setError(parseClerkError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onResendEmailCode(emailAddressId: string) {
    if (!signIn) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId,
      });
    } catch (e) {
      setError(parseClerkError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitEmailCode(ev: FormEvent) {
    ev.preventDefault();
    if (!signIn) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push(redirectUrl);
        return;
      }
      if (result.status === 'needs_second_factor') {
        const factor = result.supportedSecondFactors?.[0];
        const strategy: 'totp' | 'phone_code' | 'email_code' =
          factor?.strategy === 'phone_code'
            ? 'phone_code'
            : factor?.strategy === 'email_code'
              ? 'email_code'
              : 'totp';
        setStep({ kind: 'needs_2fa', strategy });
        return;
      }
      setError('Sign-in needs another step. Try again.');
    } catch (e) {
      setError(parseClerkError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit2fa(ev: FormEvent) {
    ev.preventDefault();
    if (!signIn) return;
    if (step.kind !== 'needs_2fa') return;
    setError(null);
    setSubmitting(true);
    try {
      const result =
        step.strategy === 'totp'
          ? await signIn.attemptSecondFactor({ strategy: 'totp', code })
          : step.strategy === 'phone_code'
            ? await signIn.attemptSecondFactor({
                strategy: 'phone_code',
                code,
              })
            : await signIn.attemptSecondFactor({
                strategy: 'email_code',
                code,
              });
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

  if (step.kind === 'start') {
    return (
      <div className="space-y-4">
        <OAuthButton
          provider="google"
          onClick={() => handleOAuth('oauth_google')}
          disabled={submitting}
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
            disabled={submitting || !email}
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
          disabled={submitting || !password}
        >
          Sign in
        </Button>
        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToEmailCode}
            disabled={submitting}
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
          disabled={submitting || code.length < 6}
        >
          Verify
        </Button>
        <div className="text-center">
          <button
            type="button"
            onClick={() => onResendEmailCode(step.emailAddressId)}
            disabled={submitting}
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
        disabled={submitting || code.length < 6}
      >
        Verify
      </Button>
    </form>
  );
}
