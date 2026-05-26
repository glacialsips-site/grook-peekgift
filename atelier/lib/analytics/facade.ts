import 'server-only';
import { PostHog } from 'posthog-node';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'analytics' });

let _client: PostHog | null = null;

export function getPostHogServer(): PostHog | null {
  if (_client) return _client;
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  _client = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  });
  return _client;
}

export type ShareChannel =
  | 'copy'
  | 'sms'
  | 'email'
  | 'native'
  | 'twitter'
  | 'facebook'
  | 'whatsapp';

export type AnalyticsEvent =
  | {
      name: 'peek_created';
      peekId: string;
      userId: string | null;
      sessionId?: string;
      payload?: Record<string, unknown>;
    }
  | {
      name: 'chat_turn';
      peekId: string;
      userId: string | null;
      sessionId: string;
      payload: {
        tokens_in: number;
        tokens_out: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
        tool_calls: number;
        latency_ms: number;
        iterations: number;
        model: string;
      };
    }
  | {
      name: 'card_added';
      peekId: string;
      userId: string | null;
      sessionId?: string;
      payload: {
        card_id: string;
        card_type: string;
        is_variant: boolean;
      };
    }
  | {
      name: 'vibe_evolved';
      peekId: string;
      userId: string | null;
      sessionId?: string;
      payload: {
        source: 'set_vibe' | 'update_vibe';
        patch: Record<string, unknown>;
      };
    }
  | {
      name: 'peek_marked_ready';
      peekId: string;
      userId: string | null;
      sessionId?: string;
      payload?: Record<string, unknown>;
    }
  | {
      name: 'pick';
      peekId: string;
      userId: null;
      sessionId?: string;
      payload: {
        card_id: string;
        action: 'insert' | 'update' | 'delete';
        pick_id?: string;
        recipient_signature?: string;
      };
    }
  | {
      name: 'publish';
      peekId: string;
      userId: string | null;
      sessionId?: string;
      payload: {
        mock: boolean;
        amount_total?: number | null;
        currency?: string | null;
        stripe_checkout_session_id?: string;
        stripe_payment_intent_id?: string | null;
      };
    }
  | {
      name: 'share_initiated';
      peekId: string;
      userId: string;
      sessionId?: string;
      payload: { channel: ShareChannel };
    }
  | {
      name: 'share_send';
      peekId: string;
      userId: string;
      sessionId?: string;
      payload: {
        channel: 'sms' | 'email';
        destination: string;
        outcome: 'sent' | 'failed' | 'not_configured';
        error?: string | null;
      };
    }
  | {
      name: 'upload';
      peekId: string;
      userId: string | null;
      sessionId?: string;
      payload: {
        content_type: string;
        size_bytes: number;
      };
    }
  | {
      name: 'scrape_url_requested';
      peekId: string;
      userId: string | null;
      sessionId: string;
      payload: {
        url: string;
        note?: string;
      };
    }
  | {
      name: 'scrape_complete';
      peekId: string;
      userId: string | null;
      sessionId?: string;
      payload: {
        url?: string;
        ok: boolean;
        provider?: string;
        product?: Record<string, unknown>;
        affiliate_url?: string;
        affiliate_network?: string;
        latency_ms?: number;
        error?: string;
      };
    }
  | {
      name: 'affiliate_revenue';
      peekId: string;
      userId: null;
      sessionId?: string;
      payload: {
        commission_cents: number;
        network: string;
      };
    }
  | {
      name: 'llm_call';
      peekId: string;
      userId: string | null;
      sessionId: string;
      payload: {
        provider: 'anthropic';
        model: string;
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
        latency_ms: number;
        tool_calls: number;
        streaming: boolean;
        stop_reason?: string | null;
      };
    };

function getSessionId(evt: AnalyticsEvent): string | null {
  if ('sessionId' in evt && typeof evt.sessionId === 'string') {
    return evt.sessionId;
  }
  return null;
}

function getPayload(evt: AnalyticsEvent): Record<string, unknown> {
  if ('payload' in evt && evt.payload !== undefined) {
    return evt.payload as Record<string, unknown>;
  }
  return {};
}

function distinctIdFor(evt: AnalyticsEvent): string {
  if (evt.userId) return evt.userId;
  const sessionId = getSessionId(evt);
  return sessionId ? `anon-${sessionId}` : `anon-${evt.peekId}`;
}

export async function track(evt: AnalyticsEvent): Promise<void> {
  const ph = getPostHogServer();
  if (ph) {
    try {
      const properties: Record<string, unknown> = {
        peek_id: evt.peekId,
        ...getPayload(evt),
      };
      ph.capture({
        distinctId: distinctIdFor(evt),
        event: evt.name,
        properties,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('posthog capture failed', { event: evt.name, message });
    }
  }

  try {
    const sb = getSupabaseService();
    const { error } = await sb.from('events').insert({
      user_id: evt.userId,
      session_id: getSessionId(evt),
      peek_id: evt.peekId,
      kind: evt.name,
      payload: getPayload(evt),
    });
    if (error) {
      log.error('events insert failed', {
        event: evt.name,
        message: error.message,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('events insert threw', { event: evt.name, message });
  }
}

export function trackFireAndForget(evt: AnalyticsEvent): void {
  void track(evt).catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    log.error('track fire-and-forget rejected', {
      event: evt.name,
      message,
    });
  });
}

export async function shutdownAnalytics(): Promise<void> {
  if (!_client) return;
  try {
    await _client.shutdown();
  } catch (err) {
    log.warn('posthog shutdown failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
