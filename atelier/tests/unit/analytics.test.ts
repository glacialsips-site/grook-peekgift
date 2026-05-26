import { beforeEach, describe, expect, it, vi } from 'vitest';

interface InsertCall {
  table: string;
  row: Record<string, unknown>;
}

const inserts: InsertCall[] = [];

vi.mock('@/lib/supabase/service', () => ({
  getSupabaseService: () => ({
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          inserts.push({ table, row });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  }),
}));

const phCapture = vi.fn();

vi.mock('posthog-node', () => ({
  PostHog: class {
    constructor() {}
    capture(...args: unknown[]) {
      phCapture(...args);
    }
    async shutdown() {}
  },
}));

beforeEach(() => {
  inserts.length = 0;
  phCapture.mockReset();
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  vi.resetModules();
});

describe('track', () => {
  it('inserts a row into events with the event name as kind', async () => {
    const { track } = await import('@/lib/analytics/facade');
    await track({
      name: 'peek_created',
      peekId: 'peek-1',
      userId: 'user-1',
      sessionId: 'sess-1',
    });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.table).toBe('events');
    expect(inserts[0]?.row).toMatchObject({
      peek_id: 'peek-1',
      user_id: 'user-1',
      session_id: 'sess-1',
      kind: 'peek_created',
    });
  });

  it('uses anon distinct id when userId is null and PostHog is enabled', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_xxx';
    const { track } = await import('@/lib/analytics/facade');
    await track({
      name: 'chat_turn',
      peekId: 'peek-1',
      userId: null,
      sessionId: 'sess-1',
      payload: {
        tokens_in: 10,
        tokens_out: 20,
        tool_calls: 1,
        latency_ms: 500,
        iterations: 1,
        model: 'claude-opus-4-7',
      },
    });
    expect(phCapture).toHaveBeenCalledOnce();
    const args = phCapture.mock.calls[0]?.[0] as { distinctId: string };
    expect(args.distinctId).toBe('anon-sess-1');
  });

  it('uses userId as distinct id when present', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_xxx';
    const { track } = await import('@/lib/analytics/facade');
    await track({
      name: 'card_added',
      peekId: 'peek-1',
      userId: 'user-9',
      payload: {
        card_id: 'card-1',
        card_type: 'gift',
        is_variant: false,
      },
    });
    expect(phCapture).toHaveBeenCalledOnce();
    const args = phCapture.mock.calls[0]?.[0] as { distinctId: string };
    expect(args.distinctId).toBe('user-9');
  });

  it('passes payload fields as properties when PostHog is enabled', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_xxx';
    const { track } = await import('@/lib/analytics/facade');
    await track({
      name: 'pick',
      peekId: 'peek-1',
      userId: null,
      sessionId: 'sess-1',
      payload: {
        card_id: 'card-1',
        action: 'insert',
      },
    });
    expect(phCapture).toHaveBeenCalledOnce();
    const args = phCapture.mock.calls[0]?.[0] as {
      event: string;
      properties: Record<string, unknown>;
    };
    expect(args.event).toBe('pick');
    expect(args.properties).toMatchObject({
      peek_id: 'peek-1',
      card_id: 'card-1',
      action: 'insert',
    });
  });

  it('skips PostHog capture when key is unset', async () => {
    const { track } = await import('@/lib/analytics/facade');
    await track({
      name: 'peek_marked_ready',
      peekId: 'peek-1',
      userId: 'u1',
    });
    expect(phCapture).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(1);
  });

  it('trackFireAndForget resolves immediately', async () => {
    const { trackFireAndForget } = await import('@/lib/analytics/facade');
    const result = trackFireAndForget({
      name: 'upload',
      peekId: 'peek-1',
      userId: 'u1',
      payload: { content_type: 'image/png', size_bytes: 1000 },
    });
    expect(result).toBeUndefined();
  });
});
