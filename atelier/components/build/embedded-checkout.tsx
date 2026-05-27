'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import { getStripeBrowser } from '@/lib/stripe/browser';
import { Button } from '@/components/ui/button';

type Props = {
  peekId: string;
};

type CheckoutResponse =
  | { client_secret: string; session_id: string }
  | { mock: true; redirect_url: string }
  | { error: string; message?: string };

export function EmbeddedCheckoutPanel({ peekId }: Props) {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  const stripePromise = getStripeBrowser();

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ peekId }),
    });
    const data = (await res.json()) as CheckoutResponse;

    if (!res.ok || 'error' in data) {
      const message =
        'error' in data
          ? data.message ?? data.error
          : `request failed (${res.status})`;
      throw new Error(message);
    }

    if ('mock' in data && data.mock) {
      throw new Error('__mock__');
    }

    if ('client_secret' in data) {
      return data.client_secret;
    }

    throw new Error('unexpected response');
  }, [peekId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchClientSecret()
      .then((cs) => {
        if (cancelled) return;
        setClientSecret(cs);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        if (err.message === '__mock__') {
          startTransition(() => {
            router.push(`/build/${peekId}/publish?mock=1`);
          });
          return;
        }
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchClientSecret, peekId, router]);

  if (loading) {
    return (
      <div
        className="flex min-h-[420px] items-center justify-center rounded-2xl border border-border bg-card/40 p-10"
        aria-busy="true"
        aria-label="Loading checkout"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center"
      >
        <p className="text-sm text-destructive">
          We couldn&apos;t open checkout: {error}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchClientSecret()
              .then((cs) => {
                setClientSecret(cs);
                setLoading(false);
              })
              .catch((err: Error) => {
                setError(err.message);
                setLoading(false);
              });
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!clientSecret) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ clientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
