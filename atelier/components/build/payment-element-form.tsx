'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import type { Appearance, StripeElementsOptions } from '@stripe/stripe-js';
import { CheckCircle2, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStripeBrowser } from '@/lib/stripe/browser';
import { buildPeekAppearance } from '@/lib/stripe/appearance';
import { cn } from '@/lib/utils';
import { CouponInput, type AppliedCoupon } from '@/components/build/coupon-input';

type Mode = 'payment' | 'subscription';

type Props = {
  peekId: string;
  mode?: Mode;
  priceId?: string;
};

type CheckoutResponse =
  | {
      mode: Mode;
      client_secret: string;
      amount: number;
      currency: string;
      base_amount: number;
      savings: number;
      applied_coupon: AppliedCoupon | null;
      payment_intent_id?: string;
      subscription_id?: string;
    }
  | { mock: true; redirect_url: string }
  | { error: string; message?: string };

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

type CheckoutState = {
  clientSecret: string;
  amount: number;
  currency: string;
  baseAmount: number;
  savings: number;
  appliedCoupon: AppliedCoupon | null;
  mode: Mode;
};

export function PaymentElementForm({ peekId, mode = 'payment', priceId }: Props) {
  const router = useRouter();
  const stripePromise = useMemo(() => getStripeBrowser(), []);
  const [state, setState] = useState<CheckoutState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appearance, setAppearance] = useState<Appearance | null>(null);
  const [appliedDraft, setAppliedDraft] = useState<AppliedCoupon | null>(null);
  const [, startTransition] = useTransition();
  const inFlight = useRef(false);

  useEffect(() => {
    setAppearance(buildPeekAppearance());
  }, []);

  const fetchSecret = useCallback(
    async (coupon: string | null): Promise<CheckoutState | { mock: true; redirect_url: string }> => {
      const body: Record<string, unknown> = { peekId, mode };
      if (coupon) body['coupon'] = coupon;
      if (priceId) body['price_id'] = priceId;
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as CheckoutResponse;
      if (!res.ok || 'error' in data) {
        const message =
          'error' in data ? (data.message ?? data.error) : `request failed (${res.status})`;
        throw new Error(message);
      }
      if ('mock' in data && data.mock) {
        return { mock: true, redirect_url: data.redirect_url };
      }
      if ('client_secret' in data) {
        return {
          clientSecret: data.client_secret,
          amount: data.amount,
          currency: data.currency,
          baseAmount: data.base_amount,
          savings: data.savings,
          appliedCoupon: data.applied_coupon,
          mode: data.mode,
        };
      }
      throw new Error('unexpected_response');
    },
    [peekId, mode, priceId],
  );

  const load = useCallback(
    async (coupon: string | null) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      setError(null);
      try {
        const next = await fetchSecret(coupon);
        if ('mock' in next) {
          startTransition(() => router.push(next.redirect_url));
          return;
        }
        setState(next);
        if (next.appliedCoupon) setAppliedDraft(next.appliedCoupon);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start checkout');
      } finally {
        setLoading(false);
        inFlight.current = false;
      }
    },
    [fetchSecret, router],
  );

  useEffect(() => {
    void load(null);
  }, [load]);

  const handleCouponApplied = useCallback(
    (coupon: AppliedCoupon | null) => {
      setAppliedDraft(coupon);
      void load(coupon ? coupon.code : null);
    },
    [load],
  );

  if (loading && !state) {
    return (
      <div
        className="flex min-h-[420px] items-center justify-center rounded-[var(--peek-radius-lg)] border border-border bg-card p-10"
        aria-busy="true"
        aria-label="Loading checkout"
      >
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (error && !state) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-[var(--peek-radius-lg)] border border-destructive/40 bg-destructive/5 p-8 text-center"
      >
        <p className="text-sm text-destructive">We couldn’t open checkout: {error}</p>
        <Button type="button" variant="outline" onClick={() => void load(null)}>
          Try again
        </Button>
      </div>
    );
  }

  if (!state || !appearance) return null;

  const options: StripeElementsOptions = {
    clientSecret: state.clientSecret,
    appearance,
    loader: 'auto',
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutPanel
        peekId={peekId}
        state={state}
        appliedDraft={appliedDraft}
        onCouponApplied={handleCouponApplied}
        reloading={loading}
      />
    </Elements>
  );
}

type PanelProps = {
  peekId: string;
  state: CheckoutState;
  appliedDraft: AppliedCoupon | null;
  onCouponApplied: (coupon: AppliedCoupon | null) => void;
  reloading: boolean;
};

function CheckoutPanel({
  peekId,
  state,
  appliedDraft,
  onCouponApplied,
  reloading,
}: PanelProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const amount = state.amount;
  const currency = state.currency;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements || submitting) return;

      setSubmitting(true);
      setSubmitError(null);

      const { error: validationError } = await elements.submit();
      if (validationError) {
        setSubmitError(validationError.message ?? 'Please complete the payment form');
        setSubmitting(false);
        return;
      }

      const returnUrl = `${window.location.origin}/build/${peekId}/publish?paid=1`;
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required',
      });

      if (confirmError) {
        setSubmitError(confirmError.message ?? 'Payment could not be completed');
        setSubmitting(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        setSuccess(true);
        setSubmitting(false);
        setTimeout(() => {
          router.push(`/build/${peekId}/publish?paid=1`);
        }, 600);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'processing') {
        setSuccess(true);
        setSubmitting(false);
        setTimeout(() => {
          router.push(`/build/${peekId}/publish?paid=1`);
        }, 800);
        return;
      }

      setSubmitting(false);
    },
    [stripe, elements, submitting, peekId, router],
  );

  if (success) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-[var(--peek-radius-lg)] border border-border bg-card p-10 text-center"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:hsl(var(--peek-accent))]/15 text-[color:hsl(var(--peek-accent))]">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="text-base font-semibold">Payment received — publishing your Peek…</p>
        <p className="text-sm text-muted-foreground">One sec, we’re lighting it up.</p>
      </div>
    );
  }

  const disabled = !stripe || !elements || !paymentReady || submitting || reloading;
  const isFree = amount === 0;
  const submitLabel = isFree
    ? 'Publish for free'
    : state.mode === 'subscription'
      ? `Subscribe — ${formatMoney(amount, currency)}`
      : `Pay ${formatMoney(amount, currency)}`;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-[var(--peek-space-6)] rounded-[var(--peek-radius-lg)] border border-border bg-card p-[var(--peek-space-6)] shadow-sm sm:p-[var(--peek-space-8)]"
      aria-label="Payment"
    >
      <PriceSummary state={state} />

      <CouponInput
        applied={appliedDraft}
        onApplied={onCouponApplied}
        currency={currency}
        disabled={submitting || reloading}
      />

      <div className={cn('relative', reloading && 'pointer-events-none opacity-60')}>
        <PaymentElement
          options={{
            layout: { type: 'tabs', defaultCollapsed: false },
            fields: { billingDetails: { address: { country: 'auto' } } },
          }}
          onReady={() => setPaymentReady(true)}
        />
        {reloading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>

      {submitError && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-[var(--peek-radius-sm)] border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {submitError}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={disabled}
        aria-busy={submitting}
        className="min-h-12 w-full bg-[color:hsl(var(--peek-accent))] text-[color:hsl(var(--peek-bg))] hover:bg-[color:hsl(var(--peek-accent))]/90"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Processing…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" aria-hidden="true" />
            {submitLabel}
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Secure checkout — your card details never touch our servers</span>
      </div>
    </form>
  );
}

function PriceSummary({ state }: { state: CheckoutState }) {
  const { amount, baseAmount, savings, currency, mode } = state;
  const showSavings = savings > 0 && baseAmount > 0;
  const cadence = mode === 'subscription' ? ' / month' : '';

  return (
    <div className="flex flex-col gap-2 rounded-[var(--peek-radius-sm)] bg-[color:hsl(var(--peek-surface))] p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Publish your Peek</span>
        <span
          className={cn(
            'tabular-nums',
            showSavings ? 'text-muted-foreground line-through' : 'font-medium text-foreground',
          )}
        >
          {formatMoney(baseAmount, currency)}
        </span>
      </div>
      {showSavings && (
        <div className="flex items-center justify-between text-sm text-[color:hsl(var(--peek-accent))]">
          <span>Discount</span>
          <span className="tabular-nums font-medium">−{formatMoney(savings, currency)}</span>
        </div>
      )}
      <div className="flex items-end justify-between border-t border-border/60 pt-2">
        <span className="text-sm font-medium text-foreground">Total today</span>
        <span className="font-[var(--peek-font-heading)] text-2xl font-semibold tabular-nums text-foreground">
          {formatMoney(amount, currency)}
          {cadence && <span className="ml-1 text-sm font-normal text-muted-foreground">{cadence}</span>}
        </span>
      </div>
    </div>
  );
}
