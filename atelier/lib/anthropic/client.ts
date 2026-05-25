import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

/**
 * Default model for the Peek chat experience. Opus drives the witty curator
 * conversation; tools that need a faster/cheaper turn can pass `FAST_MODEL`.
 */
export const DEFAULT_MODEL = 'claude-opus-4-7';
export const FAST_MODEL = 'claude-haiku-4-5';

/**
 * Prompt caching is GA in `@anthropic-ai/sdk` ^0.98 — no `anthropic-beta`
 * header required. Set `cache_control: { type: 'ephemeral' }` directly on the
 * static portions of `system` / `messages` / `tools` and the API handles it.
 */
if (!env.ANTHROPIC_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[anthropic] ANTHROPIC_API_KEY is not set — the client will throw on first call.',
  );
}

/**
 * Constructed with an empty key when the env var is absent so import-time
 * code paths (e.g. Next build phases without secrets) don't blow up. Calls
 * throw via {@link assertAnthropicConfigured} which callers should invoke
 * before they actually hit the API.
 */
export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY ?? '',
});

export function assertAnthropicConfigured(): void {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured. Set it in the environment before calling the Anthropic client.',
    );
  }
}

export type AnthropicClient = Anthropic;
