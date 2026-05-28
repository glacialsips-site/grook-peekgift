import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

// Sonnet 4.6 is the chat default; Opus is opt-in per-call (5× cost) for hard
// creative jobs only (note drafting, rules-tree design).
export const DEFAULT_MODEL = 'claude-sonnet-4-6';
export const FAST_MODEL = 'claude-haiku-4-5';

if (!env.ANTHROPIC_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[anthropic] ANTHROPIC_API_KEY is not set — the client will throw on first call.',
  );
}

export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY ?? '',
  maxRetries: 3,
  defaultHeaders: {
    // Files API + extended-cache-ttl. Without the latter, `ttl: "1h"` on
    // cache_control silently downgrades to the 5-minute default.
    'anthropic-beta':
      'files-api-2025-04-14,extended-cache-ttl-2025-04-11',
  },
});

export function assertAnthropicConfigured(): void {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured. Set it in the environment before calling the Anthropic client.',
    );
  }
}

export type AnthropicClient = Anthropic;
