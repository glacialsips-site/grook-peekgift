import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

export const DEFAULT_MODEL = 'claude-opus-4-7';
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
});

export function assertAnthropicConfigured(): void {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured. Set it in the environment before calling the Anthropic client.',
    );
  }
}

export type AnthropicClient = Anthropic;
