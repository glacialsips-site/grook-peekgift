'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';

export default function BuildError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('build_segment_error', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Build session hiccup.
        </h1>
        <p className="text-sm text-muted-foreground">
          The build surface tripped. Your draft is saved — retry in a beat.
        </p>
        <div className="flex gap-2">
          <Button type="button" size="lg" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="outline" size="lg" type="button">
            <a href="/">Home</a>
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
