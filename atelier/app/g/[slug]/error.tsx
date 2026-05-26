'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';

export default function RecipientError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('recipient_segment_error', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          We couldn&apos;t open this Peek.
        </h1>
        <p className="text-sm text-muted-foreground">
          The link works, but something hiccuped while loading it. Try again in
          a moment.
        </p>
        <div className="flex gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="outline" type="button">
            <a href="/">Go home</a>
          </Button>
        </div>
        {error.digest ? (
          <p className="font-mono text-[11px] text-muted-foreground/60">
            ref: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
