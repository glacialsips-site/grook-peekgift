'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';

export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('segment_error', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  const showStack = process.env.NODE_ENV !== 'production';

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Something broke.
        </h1>
        <p className="text-sm text-muted-foreground">
          We hit a snag rendering this page. It&apos;s already on our radar.
        </p>
        <div className="flex gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="outline" type="button">
            <a href="/">Home</a>
          </Button>
        </div>
        {showStack && error.stack ? (
          <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-muted/40 p-3 text-left text-[11px] leading-relaxed text-muted-foreground">
            {error.stack}
          </pre>
        ) : null}
        {error.digest ? (
          <p className="font-mono text-[11px] text-muted-foreground/60">
            ref: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
