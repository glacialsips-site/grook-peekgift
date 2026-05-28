import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { anthropic, DEFAULT_MODEL } from './client';
import { getSystemPrompt } from './system-prompt';
import { withToolsCacheControl } from './chat';
import { getToolSchemas } from './tools/index';
import './tools/bootstrap';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'anthropic/prewarm' });

let prewarmed = false;

export async function prewarmCache(
  opts: { model?: string; force?: boolean } = {},
): Promise<{ ok: boolean; cached_tokens?: number; reason?: string }> {
  if (prewarmed && !opts.force) {
    return { ok: true, reason: 'already_prewarmed' };
  }
  const model = opts.model ?? DEFAULT_MODEL;
  const system = getSystemPrompt();
  const rawTools = getToolSchemas();
  if (rawTools.length === 0) {
    return { ok: false, reason: 'no_tools_registered' };
  }
  const tools = withToolsCacheControl(rawTools);

  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model,
    max_tokens: 1,
    system,
    tools,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: 'cache-prewarm' }],
      },
    ],
  };

  try {
    const res = await anthropic.messages.create(params);
    prewarmed = true;
    const created = res.usage.cache_creation_input_tokens ?? 0;
    log.info('prewarmed', {
      model,
      cache_creation_input_tokens: created,
      cache_read_input_tokens: res.usage.cache_read_input_tokens ?? 0,
    });
    return { ok: true, cached_tokens: created };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn('prewarm_failed', { model, message });
    return { ok: false, reason: message };
  }
}

export function resetPrewarmState(): void {
  prewarmed = false;
}
