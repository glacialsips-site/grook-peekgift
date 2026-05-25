'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  peekId: string;
  disabled?: boolean;
  label?: string;
  className?: string;
};

type CheckoutResponse =
  | { url: string }
  | { mock: true; redirect_url: string }
  | { error: string; message?: string };

export function PublishCta({
  peekId,
  disabled = false,
  label = 'Publish — $12',
  className,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (disabled || loading) return;
    setError(null);
    setLoading(true);
    try {
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
        setError(message);
        setLoading(false);
        return;
      }

      if ('mock' in data && data.mock) {
        startTransition(() => {
          router.push(data.redirect_url);
        });
        return;
      }

      if ('url' in data && data.url) {
        window.location.href = data.url;
        return;
      }

      setError('unexpected response');
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'network error';
      setError(message);
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Button
        type="button"
        size="lg"
        onClick={handleClick}
        disabled={disabled || loading || isPending}
        className="w-full"
      >
        {loading || isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening checkout…
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            {label}
          </>
        )}
      </Button>
      {error ? (
        <p className="mt-2 text-center text-xs text-destructive">{error}</p>
      ) : null}
    </motion.div>
  );
}
