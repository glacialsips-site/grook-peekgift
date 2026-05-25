// Minimal server-side PostHog tracker. Free-tier safe and async — never blocks request.
import { PostHog } from 'posthog-node';

let _client: PostHog | null = null;

function client(): PostHog | null {
  if (_client) return _client;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.POSTHOG_KEY;
  if (!key) return null;
  _client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0
  });
  return _client;
}

export function track(event: string, distinctId: string, properties: Record<string, any> = {}): void {
  const c = client();
  if (!c) return;
  try {
    c.capture({ distinctId, event, properties });
  } catch (e) {
    console.error('posthog capture failed', e);
  }
}
