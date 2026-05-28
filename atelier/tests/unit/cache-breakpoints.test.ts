import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';

const { messagesCreate, messagesStream } = vi.hoisted(() => ({
  messagesCreate: vi.fn(),
  messagesStream: vi.fn(),
}));

vi.mock('@/lib/anthropic/client', () => ({
  anthropic: {
    messages: {
      create: messagesCreate,
      stream: messagesStream,
    },
  },
  assertAnthropicConfigured: vi.fn(),
  DEFAULT_MODEL: 'claude-opus-4-7',
  FAST_MODEL: 'claude-haiku-4-5',
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@/db/client', () => ({
  db: new Proxy(
    {},
    {
      get: () => () => new Proxy({}, { get: () => () => Promise.resolve([]) }),
    },
  ),
}));

vi.mock('@/lib/supabase/service', () => ({
  getSupabaseService: () => ({
    from() {
      return {
        insert: () => Promise.resolve({ data: null, error: null }),
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
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

import { getSystemPrompt } from '@/lib/anthropic/system-prompt';
import { prewarmCache, resetPrewarmState } from '@/lib/anthropic/prewarm';
import { withToolsCacheControl } from '@/lib/anthropic/chat';

beforeEach(() => {
  resetPrewarmState();
  messagesCreate.mockReset();
  messagesStream.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

function getCacheMarkers(
  blocks: Anthropic.TextBlockParam[],
): Array<Anthropic.CacheControlEphemeral | undefined> {
  return blocks.map((b) => b.cache_control ?? undefined);
}

describe('system prompt cache_control placement', () => {
  it('marks the static system prompt block with ephemeral 1h ttl', () => {
    const blocks = getSystemPrompt();
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks[0]?.cache_control).toEqual({
      type: 'ephemeral',
      ttl: '1h',
    });
  });

  it('does NOT mark the dynamic per-curator block', () => {
    const blocks = getSystemPrompt({
      curatorName: 'Frank',
      peekStateJson: '{"recipient":"Maya"}',
    });
    const lastBlock = blocks[blocks.length - 1];
    expect(lastBlock?.cache_control).toBeUndefined();
  });

  it('appends a cached block when commonSkillsText is provided', () => {
    const longSkills = 'COMMON_SKILLS_TEXT '.repeat(200);
    const blocks = getSystemPrompt({ commonSkillsText: longSkills });
    const skillsBlock = blocks.find((b) =>
      b.text?.includes('COMMON_SKILLS_TEXT'),
    );
    expect(skillsBlock).toBeDefined();
    expect(skillsBlock?.cache_control).toEqual({
      type: 'ephemeral',
      ttl: '1h',
    });
  });

  it('appends a cached block when occasionSkillText is provided', () => {
    const longOccasion = 'OCCASION_SKILL_TEXT '.repeat(200);
    const blocks = getSystemPrompt({ occasionSkillText: longOccasion });
    const skillsBlock = blocks.find((b) =>
      b.text?.includes('OCCASION_SKILL_TEXT'),
    );
    expect(skillsBlock).toBeDefined();
    expect(skillsBlock?.cache_control).toEqual({
      type: 'ephemeral',
      ttl: '1h',
    });
  });

  it('keeps total system-side cache_control markers <= 3 (leaves slot 4 for tools)', () => {
    const blocks = getSystemPrompt({
      commonSkillsText: 'a'.repeat(5000),
      occasionSkillText: 'b'.repeat(5000),
      curatorName: 'Frank',
      peekStateJson: '{}',
    });
    const markers = getCacheMarkers(blocks).filter((m) => m !== undefined);
    expect(markers.length).toBe(3);
  });

  it('treats whitespace-only skill text as absent', () => {
    const blocks = getSystemPrompt({
      commonSkillsText: '   \n  ',
      occasionSkillText: '\t',
    });
    const markers = getCacheMarkers(blocks).filter((m) => m !== undefined);
    expect(markers.length).toBe(1);
  });
});

describe('withToolsCacheControl', () => {
  it('marks only the last tool with cache_control 1h ttl', async () => {
    const mod = await import('@/lib/anthropic/tools/index');
    await import('@/lib/anthropic/tools/bootstrap');
    const tools = mod.getToolSchemas();
    expect(tools.length).toBeGreaterThan(0);

    const withCache = withToolsCacheControl(tools);
    const markers = withCache.map(
      (t) =>
        (
          t as Anthropic.Tool & {
            cache_control?: Anthropic.CacheControlEphemeral | null;
          }
        ).cache_control,
    );
    const marked = markers.filter((m) => m !== undefined && m !== null);
    expect(marked.length).toBe(1);
    expect(marked[0]).toEqual({ type: 'ephemeral', ttl: '1h' });

    const last = withCache[withCache.length - 1] as Anthropic.Tool & {
      cache_control?: Anthropic.CacheControlEphemeral | null;
    };
    expect(last.cache_control).toEqual({ type: 'ephemeral', ttl: '1h' });
  });

  it('is a no-op on an empty tools array', () => {
    expect(withToolsCacheControl([])).toEqual([]);
  });
});

describe('prewarmCache', () => {
  it('calls messages.create with cache_control on tools[last] and system[0]', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'ok' }],
      usage: {
        input_tokens: 1,
        output_tokens: 1,
        cache_creation_input_tokens: 12345,
        cache_read_input_tokens: 0,
      },
      model: 'claude-opus-4-7',
      stop_reason: 'end_turn',
    });

    const res = await prewarmCache();
    expect(res.ok).toBe(true);
    expect(res.cached_tokens).toBe(12345);

    expect(messagesCreate).toHaveBeenCalledTimes(1);
    const firstCall = messagesCreate.mock.calls[0];
    if (!firstCall) throw new Error('expected one call to messages.create');
    const params = firstCall[0] as Anthropic.MessageCreateParamsNonStreaming;
    expect(params.max_tokens).toBe(1);
    expect((params as { stream?: boolean }).stream).toBeUndefined();

    const systemBlocks = params.system as Anthropic.TextBlockParam[];
    expect(systemBlocks[0]?.cache_control).toEqual({
      type: 'ephemeral',
      ttl: '1h',
    });

    const tools = params.tools as Anthropic.Tool[];
    expect(tools.length).toBeGreaterThan(0);
    const last = tools[tools.length - 1] as Anthropic.Tool & {
      cache_control?: Anthropic.CacheControlEphemeral | null;
    };
    expect(last.cache_control).toEqual({
      type: 'ephemeral',
      ttl: '1h',
    });
    for (const tool of tools.slice(0, -1)) {
      const t = tool as Anthropic.Tool & {
        cache_control?: Anthropic.CacheControlEphemeral | null;
      };
      expect(t.cache_control).toBeUndefined();
    }
  });

  it('is idempotent within a single process unless forced', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'ok' }],
      usage: {
        input_tokens: 1,
        output_tokens: 1,
        cache_creation_input_tokens: 100,
        cache_read_input_tokens: 0,
      },
      model: 'claude-opus-4-7',
      stop_reason: 'end_turn',
    });
    await prewarmCache();
    const second = await prewarmCache();
    expect(messagesCreate).toHaveBeenCalledTimes(1);
    expect(second.ok).toBe(true);
    expect(second.reason).toBe('already_prewarmed');
  });

  it('surfaces upstream errors without throwing', async () => {
    messagesCreate.mockRejectedValueOnce(new Error('429 rate_limited'));
    const res = await prewarmCache();
    expect(res.ok).toBe(false);
    expect(res.reason).toContain('rate_limited');
  });

  it('asserts total cache_control markers in a maximal payload do not exceed 4', () => {
    const system = getSystemPrompt({
      commonSkillsText: 'common-skills'.repeat(100),
      occasionSkillText: 'occasion-skill'.repeat(100),
      curatorName: 'Frank',
      peekStateJson: '{}',
    });
    const systemMarkers = getCacheMarkers(system).filter(
      (m) => m !== undefined,
    ).length;
    const toolsMarker = 1;
    expect(systemMarkers + toolsMarker).toBeLessThanOrEqual(4);
    expect(systemMarkers + toolsMarker).toBe(4);
  });
});
