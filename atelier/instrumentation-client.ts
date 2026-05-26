import posthog from 'posthog-js';

const POSTHOG_KEY = process.env['NEXT_PUBLIC_POSTHOG_KEY'];

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
      if (process.env.NODE_ENV === 'development') {
        ph.debug(false);
      }
    },
  });
}

export { posthog };
