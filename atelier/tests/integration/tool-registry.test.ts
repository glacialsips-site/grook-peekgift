import { beforeAll, describe, expect, it, vi } from 'vitest';

const dbStub = {
  update: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/db/client', () => ({
  db: new Proxy(dbStub, {
    get(target, prop) {
      if (prop in target) {
        return (target as unknown as Record<string | symbol, unknown>)[prop];
      }
      return () => new Proxy({}, { get: () => () => Promise.resolve([]) });
    },
  }),
}));

vi.mock('@/lib/anthropic/client', () => ({
  anthropic: { messages: { create: vi.fn() } },
  assertAnthropicConfigured: vi.fn(),
  DEFAULT_MODEL: 'claude-opus-4-7',
  FAST_MODEL: 'claude-haiku-4-5',
}));

vi.mock('@/lib/supabase/service', () => ({
  getSupabaseService: () => ({
    from() {
      return {
        insert: () => Promise.resolve({ data: null, error: null }),
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://test/' } }),
      }),
    },
  }),
}));

vi.mock('@/lib/affiliate/wrap', () => ({
  wrapAffiliateLink: (url: string) => ({
    wrappedUrl: url,
    network: 'direct',
    commissionPctEstimate: null,
  }),
  buildClickCustomId: (peekId: string, cardId?: string) =>
    cardId ? `${peekId}:${cardId}` : peekId,
}));

vi.mock('@/lib/analytics/facade', () => ({
  track: vi.fn().mockResolvedValue(undefined),
  trackFireAndForget: vi.fn(),
  getPostHogServer: () => null,
  shutdownAnalytics: vi.fn(),
}));

vi.mock('@/lib/vibe/evolve', () => ({
  evolveVibe: vi.fn().mockResolvedValue(undefined),
  scheduleEvolveVibe: vi.fn(),
}));

beforeAll(async () => {
  await import('@/lib/anthropic/tools/bootstrap');
});

describe('tool registry', () => {
  it('registers all known tools after bootstrap', async () => {
    const { TOOL_REGISTRY } = await import('@/lib/anthropic/tools/index');
    const expected = [
      'ping',
      'set_recipient',
      'set_recipient_profile',
      'set_vibe',
      'update_vibe',
      'set_hero_image',
      'generate_hero_image',
      'set_note',
      'add_variant_group',
      'add_card',
      'update_card',
      'remove_card',
      'reorder_cards',
      'scrape_url',
      'mark_ready_for_publish',
    ];
    for (const name of expected) {
      expect(TOOL_REGISTRY.has(name), `tool ${name} not registered`).toBe(true);
    }
  });

  it('getToolSchemas returns name/description/input_schema for each tool', async () => {
    const { getToolSchemas } = await import('@/lib/anthropic/tools/index');
    const schemas = getToolSchemas();
    expect(schemas.length).toBeGreaterThan(0);
    for (const s of schemas) {
      expect(s.name).toBeTypeOf('string');
      expect(s.description).toBeTypeOf('string');
      expect(s.input_schema).toBeDefined();
      expect(s.input_schema.type).toBe('object');
    }
  });

  it('getTool returns a tool by name', async () => {
    const { getTool } = await import('@/lib/anthropic/tools/index');
    const ping = getTool('ping');
    expect(ping).toBeDefined();
    expect(ping?.name).toBe('ping');
  });

  it('getTool returns undefined for an unknown tool', async () => {
    const { getTool } = await import('@/lib/anthropic/tools/index');
    expect(getTool('does_not_exist')).toBeUndefined();
  });

  it('runTool dispatches ping and returns the pong shape', async () => {
    const { runTool } = await import('@/lib/anthropic/tools/index');
    const out = (await runTool(
      'ping',
      {},
      { peekId: 'p1', userId: null, sessionId: 's1' },
    )) as { pong: boolean; at: string };
    expect(out.pong).toBe(true);
    expect(typeof out.at).toBe('string');
    expect(() => new Date(out.at).toISOString()).not.toThrow();
  });

  it('runTool throws on unknown tool name', async () => {
    const { runTool } = await import('@/lib/anthropic/tools/index');
    await expect(
      runTool(
        'no_such_tool',
        {},
        { peekId: 'p1', userId: null, sessionId: 's1' },
      ),
    ).rejects.toThrowError(/Unknown tool: no_such_tool/);
  });

  it('registerTool throws when name is already taken', async () => {
    const { registerTool } = await import('@/lib/anthropic/tools/index');
    expect(() =>
      registerTool({
        name: 'ping',
        description: 'dup',
        input_schema: { type: 'object', properties: {}, required: [] },
        handler: async () => ({}),
      }),
    ).toThrowError(/already registered/);
  });
});
