'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs/legacy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from './form-error';
import { parseClerkError } from './clerk-error';

type Step =
  | { kind: 'request'; email: string }
  | { kind: 'reset'; email: string };

export function ForgotPasswordForm() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>({ kind: 'request', email: '' });
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoaded || !signIn) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        loading…
      </div>
    );
  }

  async function onSubmitRequest(ev: FormEvent) {
    ev.preventDefault();
    if (!signIn) return;
    if (step.kind !== 'request') return;
    setError(null);
    setSubmitting(true);
    try {
      const attempt = await signIn.create({ identifier: step.email });
      const factors = attempt.supportedFirstFactors ?? [];
      const resetFactor = factors.find(
        (f): f is Extract<typeof f, { strategy: 'reset_password_email_code' }> =>
          f.strategy === 'reset_password_email_code',
      );
      if (!resetFactor) {
        setError("We can't reset that account's password by email.");
        return;
      }
      await signIn.prepareFirstFactor({
        strategy: 'reset_password_email_code',
        emailAddressId: resetFactor.emailAddressId,
      });
      setStep({ kind: 'reset', email: step.email });
    } catch (e) {
      setError(parseClerkError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitReset(ev: FormEvent) {
    ev.preventDefault();
    if (!signIn) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/build');
        return;
      }
      if (result.status === 'needs_new_password') {
        setError('Set a new password to continue.');
        return;
      }
      setError("That didn't work. Try again.");
    } catch (e) {
      setError(parseClerkError(e));
    } finally {
      setSubmitting(false);
    }
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
          disabled={submitting || !step.email}
        >
          Send reset code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmitReset} className="space-y-4">
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
        disabled={submitting || code.length < 6 || !password}
      >
        Reset password
      </Button>
    </form>
  );
}
