'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSignUp } from '@clerk/nextjs/legacy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OAuthButton } from './oauth-button';
import { FormError } from './form-error';
import { parseClerkError } from './clerk-error';

type Step = { kind: 'start' } | { kind: 'verify_email'; email: string };

export function CustomSignUpForm() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const search = useSearchParams();
  const redirectUrl = search.get('redirect_url') ?? '/build';

  const [step, setStep] = useState<Step>({ kind: 'start' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoaded || !signUp) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        loading…
      </div>
    );
  }

  async function handleOAuth(strategy: 'oauth_google') {
    if (!signUp) return;
    setError(null);
    try {
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: redirectUrl,
      });
    } catch (e) {
      setError(parseClerkError(e));
    }
  }

  async function onSubmitStart(ev: FormEvent) {
    ev.preventDefault();
    if (!signUp) return;
    setError(null);
    setSubmitting(true);
    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep({ kind: 'verify_email', email });
    } catch (e) {
      setError(parseClerkError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    if (!signUp) return;
    setError(null);
    setSubmitting(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
    } catch (e) {
      setError(parseClerkError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitVerify(ev: FormEvent) {
    ev.preventDefault();
    if (!signUp) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push(redirectUrl);
        return;
      }
      setError('Sign-up needs another step. Try again.');
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
        <form onSubmit={onSubmitStart} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </div>
          <div id="clerk-captcha" />
          <FormError>{error}</FormError>
          <Button
            type="submit"
            className="h-11 w-full"
            disabled={submitting || !email || !password}
          >
            Create account
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmitVerify} className="space-y-4">
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
          onClick={onResend}
          disabled={submitting}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
        >
          Didn't get it? Resend.
        </button>
      </div>
    </form>
  );
}
