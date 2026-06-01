import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';

const POSTHOG_KEY = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
const SENTRY_DSN = process.env['NEXT_PUBLIC_SENTRY_DSN'];

if (typeof window !== 'undefined' && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: '/api/posthog',
    ui_host: process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://us.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    autocapture: true,
    disable_session_recording: false,
    loaded: (ph) => {
      if (process.env['NODE_ENV'] === 'development') {
        ph.debug(false);
      }
    },
  });
}

if (typeof window !== 'undefined' && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env['NODE_ENV'],
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    integrations: [
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

export { posthog };
