'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('global_error', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#0b0a14',
          color: '#fbf7ee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            padding: '32px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Something went sideways.
          </h1>
          <p style={{ fontSize: 14, opacity: 0.75, margin: 0, lineHeight: 1.5 }}>
            The page hit an error we didn&apos;t expect. We logged it.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              marginTop: 8,
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: 44,
                padding: '12px 20px',
                background: '#ff7a59',
                color: '#0b0a14',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 20px',
                background: 'transparent',
                color: '#fbf7ee',
                border: '1px solid rgba(251, 247, 238, 0.2)',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Back to home
            </a>
          </div>
          {error.digest ? (
            <p
              style={{
                fontSize: 11,
                opacity: 0.4,
                margin: 0,
                marginTop: 16,
                fontFamily: 'monospace',
              }}
            >
              ref: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
