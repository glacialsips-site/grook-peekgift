import { beforeEach, describe, expect, it, vi } from 'vitest';

type PeekRow = {
  id: string;
  slug: string;
  curator_id: string | null;
  recipient_name: string | null;
  hero_image_url: string | null;
  note_md: string | null;
  vibe: Record<string, unknown> | null;
  status:
    | 'draft'
    | 'ready_for_publish'
    | 'published'
    | 'claimed'
    | 'archived';
  metadata: Record<string, unknown>;
  share_url: string | null;
  published_at: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  updated_at: string;
};

type CardRow = {
  id: string;
  peek_id: string;
  is_taunt: boolean;
};

interface World {
  peek: PeekRow;
  cards: CardRow[];
  trackedEvents: Array<{ name: string; peekId: string; payload?: unknown }>;
}

const world: World = {
  peek: makeReadyDraft('peek-123'),
  cards: [{ id: 'card-1', peek_id: 'peek-123', is_taunt: false }],
  trackedEvents: [],
};

function makeReadyDraft(id: string): PeekRow {
  return {
    id,
    slug: 'slug-abc',
    curator_id: 'user_1',
    recipient_name: 'Dorothy',
    hero_image_url: 'https://example.test/hero.jpg',
    note_md: 'Happy birthday!',
    vibe: { preset: 'playful' },
    status: 'draft',
    metadata: {},
    share_url: null,
    published_at: null,
    stripe_payment_intent_id: null,
    stripe_checkout_session_id: null,
    updated_at: new Date(0).toISOString(),
  };
}

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function mapDrizzleUpdateValuesToWire(
  set: Record<string, unknown>,
): Partial<PeekRow> {
  const out: Partial<PeekRow> = {};
  for (const [key, val] of Object.entries(set)) {
    const wireKey = camelToSnake(key);
    if (wireKey === 'updated_at' && val instanceof Date) {
      out.updated_at = val.toISOString();
    } else {
      (out as Record<string, unknown>)[wireKey] = val;
    }
  }
  return out;
}

let lastUpdate: { set: Record<string, unknown>; matched: boolean } | null = null;

vi.mock('@/db/client', () => {
  const select = () => {
    return {
      from: (table: unknown) => {
        const tableName = String(
          (table as { _?: { name?: string }; name?: string })?._?.name ??
            (table as { name?: string })?.name ??
            '',
        );
        return {
          where: () => {
            const limitOrEmpty = (_lim?: number) => {
              if (tableName === 'cards') {
                const realCount = world.cards.filter(
                  (c) => c.peek_id === world.peek.id && !c.is_taunt,
                ).length;
                return Promise.resolve([{ n: realCount }]);
              }
              return Promise.resolve([
                {
                  id: world.peek.id,
                  status: world.peek.status,
                  recipientName: world.peek.recipient_name,
                  heroImageUrl: world.peek.hero_image_url,
                  noteMd: world.peek.note_md,
                  vibe: world.peek.vibe,
                  shareUrl: world.peek.share_url,
                  metadata: world.peek.metadata,
                },
              ]);
            };
            return Object.assign(limitOrEmpty(), { limit: limitOrEmpty });
          },
        };
      },
    };
  };
  const update = (_table: unknown) => ({
    set: (setClause: Record<string, unknown>) => ({
      where: (_predicate: unknown) => {
        const matched = world.peek.status === 'draft';
        lastUpdate = { set: setClause, matched };
        if (matched) {
          const patch = mapDrizzleUpdateValuesToWire(setClause);
          if (
            patch.metadata &&
            typeof patch.metadata === 'object' &&
            patch.metadata !== null &&
            'queryChunks' in (patch.metadata as object)
          ) {
            world.peek.metadata = {
              ...world.peek.metadata,
              markedReadyAt: new Date().toISOString(),
            };
            delete (patch as { metadata?: unknown }).metadata;
          } else if (patch.metadata !== undefined) {
            world.peek.metadata = patch.metadata as Record<string, unknown>;
          }
          Object.assign(world.peek, patch);
        }
        return {
          returning: () =>
            Promise.resolve(matched ? [{ id: world.peek.id }] : []),
        };
      },
    }),
  });
  return {
    db: { select, update },
  };
});

vi.mock('@/lib/anthropic/client', () => ({
  anthropic: { messages: { create: vi.fn() } },
  assertAnthropicConfigured: vi.fn(),
  DEFAULT_MODEL: 'claude-opus-4-7',
  FAST_MODEL: 'claude-haiku-4-5',
}));

vi.mock('@/lib/analytics/facade', () => ({
  track: vi.fn(async (evt: { name: string; peekId: string; payload?: unknown }) => {
    world.trackedEvents.push(evt);
  }),
  trackFireAndForget: vi.fn(),
  getPostHogServer: () => null,
  shutdownAnalytics: vi.fn(),
}));

vi.mock('@/lib/supabase/service', () => {
  return {
    getSupabaseService: () => ({
      from(table: string) {
        if (table === 'events') {
          return {
            insert: async (row: Record<string, unknown>) => {
              world.trackedEvents.push({
                name: String(row['kind']),
                peekId: String(row['peek_id']),
                payload: row['payload'],
              });
              return { data: null, error: null };
            },
          };
        }
        if (table !== 'peeks') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
            insert: async () => ({ data: null, error: null }),
            update: () => ({ eq: async () => ({ data: null, error: null }) }),
          };
        }
        return {
          select: (_cols?: string) => ({
            eq: (_col: string, _val: unknown) => ({
              maybeSingle: async () => ({
                data: { ...world.peek },
                error: null,
              }),
            }),
          }),
          update: (patch: Partial<PeekRow>) => ({
            eq: async (_col: string, val: string) => {
              if (val !== world.peek.id) {
                return { data: null, error: null };
              }
              Object.assign(world.peek, patch);
              return { data: null, error: null };
            },
          }),
          insert: async () => ({ data: null, error: null }),
        };
      },
    }),
  };
});

vi.mock('@/lib/inngest/client', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

const constructEventMock = vi.fn();
const stripeStub = {
  webhooks: { constructEvent: constructEventMock },
};

vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => stripeStub,
  PAY_MODE: 'live' as const,
}));

vi.mock('@/lib/env', () => ({
  env: {
    APP_URL: 'https://peek-gift-vnext.netlify.app',
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-pub',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/security/idempotency', () => ({
  checkIdempotency: vi.fn().mockResolvedValue({ firstSeen: true }),
}));

beforeEach(() => {
  world.peek = makeReadyDraft('peek-123');
  world.cards = [{ id: 'card-1', peek_id: 'peek-123', is_taunt: false }];
  world.trackedEvents = [];
  lastUpdate = null;
  constructEventMock.mockReset();
});

describe('full state machine: draft -> ready_for_publish -> published', () => {
  it('mark_ready_for_publish flips status when preconditions are met', async () => {
    await import('@/lib/anthropic/tools/bootstrap');
    const { runTool } = await import('@/lib/anthropic/tools/index');

    expect(world.peek.status).toBe('draft');
    expect(world.peek.metadata['markedReadyAt']).toBeUndefined();

    const out = (await runTool(
      'mark_ready_for_publish',
      {},
      { peekId: world.peek.id, userId: 'user_1', sessionId: 'sess-1' },
    )) as { ok: true; next_step: 'paywall'; already_ready?: boolean };

    expect(out.ok).toBe(true);
    expect(out.next_step).toBe('paywall');
    expect(out.already_ready).toBeUndefined();

    expect(world.peek.status).toBe('ready_for_publish');
    expect(typeof world.peek.metadata['markedReadyAt']).toBe('string');
    expect(lastUpdate?.matched).toBe(true);
    expect(lastUpdate?.set['status']).toBe('ready_for_publish');

    expect(
      world.trackedEvents.some((e) => e.name === 'peek_marked_ready'),
    ).toBe(true);
  });

  it('refuses with preconditions_failed when required fields are missing', async () => {
    world.peek.hero_image_url = null;
    world.peek.recipient_name = '';

    await import('@/lib/anthropic/tools/bootstrap');
    const { runTool } = await import('@/lib/anthropic/tools/index');
    const out = (await runTool(
      'mark_ready_for_publish',
      {},
      { peekId: world.peek.id, userId: 'user_1', sessionId: 'sess-1' },
    )) as {
      ok: false;
      error: 'preconditions_failed';
      missing: string[];
    };
    expect(out.ok).toBe(false);
    expect(out.error).toBe('preconditions_failed');
    expect(out.missing).toContain('recipient_name');
    expect(out.missing).toContain('hero_image');

    expect(world.peek.status).toBe('draft');
    expect(
      world.trackedEvents.find((e) => e.name === 'peek_marked_ready'),
    ).toBeUndefined();
  });

  it('idempotent: second call on ready_for_publish does not re-emit event', async () => {
    world.peek.status = 'ready_for_publish';
    world.peek.metadata = { markedReadyAt: '2026-05-27T16:00:00.000Z' };

    await import('@/lib/anthropic/tools/bootstrap');
    const { runTool } = await import('@/lib/anthropic/tools/index');
    const out = (await runTool(
      'mark_ready_for_publish',
      {},
      { peekId: world.peek.id, userId: 'user_1', sessionId: 'sess-1' },
    )) as { ok: true; next_step: 'paywall'; already_ready: true };

    expect(out.ok).toBe(true);
    expect(out.already_ready).toBe(true);
    expect(
      world.trackedEvents.find((e) => e.name === 'peek_marked_ready'),
    ).toBeUndefined();
  });

  it('refuses when peek is already published', async () => {
    world.peek.status = 'published';
    world.peek.share_url = 'https://peek-gift-vnext.netlify.app/g/slug-abc';

    await import('@/lib/anthropic/tools/bootstrap');
    const { runTool } = await import('@/lib/anthropic/tools/index');
    const out = (await runTool(
      'mark_ready_for_publish',
      {},
      { peekId: world.peek.id, userId: 'user_1', sessionId: 'sess-1' },
    )) as {
      ok: false;
      error: 'already_published';
      share_url: string | null;
    };
    expect(out.ok).toBe(false);
    expect(out.error).toBe('already_published');
    expect(out.share_url).toBe(
      'https://peek-gift-vnext.netlify.app/g/slug-abc',
    );
  });

  it('stripe webhook publishes a ready_for_publish peek on checkout.session.completed', async () => {
    await import('@/lib/anthropic/tools/bootstrap');
    const { runTool } = await import('@/lib/anthropic/tools/index');
    await runTool(
      'mark_ready_for_publish',
      {},
      { peekId: world.peek.id, userId: 'user_1', sessionId: 'sess-1' },
    );
    expect(world.peek.status).toBe('ready_for_publish');

    const session = {
      id: 'cs_test_123',
      payment_intent: 'pi_test_456',
      amount_total: 1200,
      currency: 'usd',
      metadata: {
        peek_id: world.peek.id,
        curator_clerk_id: 'user_1',
      },
    };
    constructEventMock.mockReturnValueOnce({
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      livemode: true,
      created: Date.now(),
      data: { object: session },
    });

    const { POST } = await import('@/app/api/stripe/webhook/route');
    const req = new Request('https://example.test/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 't=1,v1=abc' },
      body: JSON.stringify({}),
    });
    const res = await POST(req as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(200);

    expect(world.peek.status).toBe('published');
    expect(world.peek.share_url).toBe(
      'https://peek-gift-vnext.netlify.app/g/slug-abc',
    );
    expect(world.peek.published_at).toBeTruthy();
    expect(world.peek.stripe_payment_intent_id).toBe('pi_test_456');
    expect(world.peek.stripe_checkout_session_id).toBe('cs_test_123');

    expect(world.trackedEvents.some((e) => e.name === 'publish')).toBe(true);
  });

  it('stripe webhook publishes via payment_intent.succeeded as well', async () => {
    world.peek.status = 'ready_for_publish';
    world.peek.metadata = { markedReadyAt: '2026-05-27T16:00:00.000Z' };

    constructEventMock.mockReturnValueOnce({
      id: 'evt_test_2',
      type: 'payment_intent.succeeded',
      livemode: true,
      created: Date.now(),
      data: {
        object: {
          id: 'pi_test_789',
          amount: 1200,
          amount_received: 1200,
          currency: 'usd',
          metadata: {
            peek_id: world.peek.id,
            curator_clerk_id: 'user_1',
          },
        },
      },
    });

    const { POST } = await import('@/app/api/stripe/webhook/route');
    const req = new Request('https://example.test/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 't=1,v1=abc' },
      body: JSON.stringify({}),
    });
    const res = await POST(req as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(200);

    expect(world.peek.status).toBe('published');
    expect(world.peek.stripe_payment_intent_id).toBe('pi_test_789');
  });

  it('stripe webhook reverts ready_for_publish back to draft on payment failure', async () => {
    world.peek.status = 'ready_for_publish';

    constructEventMock.mockReturnValueOnce({
      id: 'evt_test_3',
      type: 'checkout.session.async_payment_failed',
      livemode: true,
      created: Date.now(),
      data: {
        object: {
          id: 'cs_test_321',
          payment_intent: 'pi_test_654',
          payment_method_types: ['card'],
          metadata: {
            peek_id: world.peek.id,
            curator_clerk_id: 'user_1',
          },
        },
      },
    });

    const { POST } = await import('@/app/api/stripe/webhook/route');
    const req = new Request('https://example.test/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 't=1,v1=abc' },
      body: JSON.stringify({}),
    });
    const res = await POST(req as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(200);

    expect(world.peek.status).toBe('draft');
    expect(
      world.trackedEvents.some((e) => e.name === 'peek_payment_failed'),
    ).toBe(true);
  });
});
