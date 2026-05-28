'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useSignIn } from '@clerk/nextjs';
import type { SetActiveNavigate } from '@clerk/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mutedTextStyle, vibeTokens } from '@/lib/vibe/component-styles';
import { FormError } from './form-error';
import { parseClerkError } from './clerk-error';

type Step =
  | { kind: 'request'; email: string }
  | { kind: 'reset'; email: string };

export function ForgotPasswordForm() {
  const { signIn, fetchStatus } = useSignIn();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      router.replace('/build');
    }
  }, [authLoaded, isSignedIn, router]);

  const [step, setStep] = useState<Step>({ kind: 'request', email: '' });
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = submitting || fetchStatus === 'fetching';

  const navigateAfterSession: SetActiveNavigate = async ({ session, decorateUrl }) => {
    if (session?.currentTask) return;
    const url = decorateUrl('/build');
    if (url.startsWith('http')) {
      window.location.href = url;
      return;
    }
    router.push(url);
  };

  async function onSubmitRequest(ev: FormEvent) {
    ev.preventDefault();
    if (step.kind !== 'request') return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: createError } = await signIn.create({ identifier: step.email });
      if (createError) {
        setError(parseClerkError(createError));
        return;
      }
      const supportsReset = signIn.supportedFirstFactors.some(
        (f) => f.strategy === 'reset_password_email_code',
      );
      if (!supportsReset) {
        setError("We can't reset that account's password by email.");
        return;
      }
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setError(parseClerkError(sendError));
        return;
      }
      setStep({ kind: 'reset', email: step.email });
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitReset(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!codeVerified) {
        const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({
          code,
        });
        if (verifyError) {
          setError(parseClerkError(verifyError));
          return;
        }
        setCodeVerified(true);
      }
      const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({
        password,
        signOutOfOtherSessions: true,
      });
      if (submitError) {
        setError(parseClerkError(submitError));
        return;
      }
      if (signIn.status !== 'complete') {
        setError("That didn't work. Try again.");
        return;
      }
      const { error: finalizeError } = await signIn.finalize({
        navigate: navigateAfterSession,
      });
      if (finalizeError) setError(parseClerkError(finalizeError));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoaded && isSignedIn) {
    return null;
  }

  if (step.kind === 'request') {
    return (
      <form onSubmit={onSubmitRequest} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            required
            value={step.email}
            onChange={(e) => setStep({ kind: 'request', email: e.target.value })}
            className="h-11"
          />
        </div>
        <FormError>{error}</FormError>
        <Button
          type="submit"
          className="h-11 w-full"
          disabled={busy || !step.email}
        >
          Send reset code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmitReset} className="space-y-4">
      <p className="text-sm" style={mutedTextStyle()}>
        We sent a 6-digit code to{' '}
        <span className="font-medium" style={{ color: vibeTokens.ink }}>
          {step.email}
        </span>
        .
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
      <div className="space-y-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
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
        disabled={busy || code.length < 6 || !password}
      >
        Reset password
      </Button>
    </form>
  );
}
