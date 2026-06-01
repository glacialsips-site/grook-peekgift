import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

// Default chat model: Sonnet 4.6. Opus 4.7 is opt-in per-call for hard
// creative jobs (note drafting, rules-tree design) — never the default
// (W04 from BUGS-WAVE2: 5× cost vs Sonnet for marginal curator-chat gain).
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
    // Multi-beta header. Files API + the 1h-TTL cache control beta
    // (W01 from BUGS-WAVE2: without extended-cache-ttl, ttl:"1h" silently
    // downgrades to the 5min default).
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
