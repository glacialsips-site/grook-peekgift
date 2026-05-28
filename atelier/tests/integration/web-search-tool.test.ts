// Integration test: chat loop handles Anthropic's server-executed `web_search`
// (web_search_20260209). The model emits `server_tool_use` blocks and
// `web_search_tool_result` blocks inline within a single assistant message —
// Anthropic executes the search server-side, so our chat loop must NOT try to
// dispatch a handler for these blocks. The result tokens (search snippets,
// titles, URLs) and any `citations` on subsequent text blocks must land
// verbatim in the conversation history so the next iteration's context
// contains everything the model needs to keep building.
//
// Scope:
//   1. Happy-path: assistant streams a `web_search` server_tool_use + a
//      `web_search_tool_result` with two result snippets + a text block with
//      citations + stop_reason='end_turn'. The history must contain all
//      blocks intact; the loop must return without trying to dispatch
//      `web_search`.
//   2. Error-path: when Frank hasn't yet enabled web search in the Anthropic
//      console (Privacy → enable Web Search), the server tool returns
//      `web_search_tool_result_error` with `error_code: 'unavailable'`. The
//      assistant follows up with a text block apologizing and the chat
//      loop returns gracefully (no client-side throw, history preserved).
//   3. Configuration: the `web_search_20260209` descriptor returned by
//      `getServerToolDescriptors()` is shaped as Anthropic expects —
//      name='web_search', type='web_search_20260209', max_uses respected
//      from env or default.
//
// What this does NOT cover (intentional):
//   - Multi-turn chains where the model calls a client tool after seeing
//     web_search results. The state-machine + tool-registry tests own that.
//   - Citation rendering in the UI. The chat surface is responsible for
//     turning citations into footnotes; that's a UI-layer concern.
//
// Frank's open Anthropic-console task: until web search is enabled at
// platform.claude.com → Settings → Privacy, `web_search` calls return
// `error_code: 'unavailable'` — the error-path test below mirrors that
// production behavior exactly.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';

// Hoist the stream mock so vi.mock can reach it before module init.
const { messagesStream } = vi.hoisted(() => ({
  messagesStream: vi.fn(),
}));

vi.mock('@/lib/anthropic/client', () => ({
  anthropic: {
    messages: { stream: messagesStream, create: vi.fn() },
  },
  assertAnthropicConfigured: vi.fn(),
  DEFAULT_MODEL: 'claude-sonnet-4-6',
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

vi.mock('@/lib/usage/record', () => ({
  recordUsageFireAndForget: vi.fn(),
}));

vi.mock('@/lib/anthropic/progress-block', () => ({
  loadPeekStateJson: vi.fn().mockResolvedValue(null),
  renderPeekStateJson: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Fake Anthropic SDK message stream. The SDK exposes an EventEmitter-ish
// surface: `.on(event, cb)` for `streamEvent`, `text`, `thinking`,
// `inputJson`, `finalMessage`, `error`, `abort`, `end`. Our streamMessage()
// helper subscribes to all of them. To exercise the chat loop we only need
// to fire enough events for it to advance: zero or more `streamEvent`s
// (content_block_start/stop, which we skip — they're a NOP for non-tool_use
// blocks per streaming.ts:67-100), then `finalMessage`, then `end`.
// ---------------------------------------------------------------------------

type Listener = (...args: unknown[]) => void;
interface FakeStream {
  on(event: string, listener: Listener): void;
  abort(): void;
  __fire(event: string, ...args: unknown[]): void;
}

function makeStream(): FakeStream {
  const listeners = new Map<string, Listener[]>();
  return {
    on(event, listener) {
      const arr = listeners.get(event) ?? [];
      arr.push(listener);
      listeners.set(event, arr);
    },
    abort() {
      /* no-op for tests */
    },
    __fire(event, ...args) {
      const arr = listeners.get(event) ?? [];
      for (const l of arr) l(...args);
    },
  };
}

function dispatchFinalMessage(
  stream: FakeStream,
  message: Anthropic.Message,
): void {
  // Mimic the SDK ordering streamMessage.ts subscribes to: per-block lifecycle
  // events on `streamEvent` are optional (our helper ignores everything except
  // tool_use content_block_start/stop). Fire `finalMessage` → `end`.
  stream.__fire('finalMessage', message);
  stream.__fire('end');
}

// ---------------------------------------------------------------------------
// Helpers to assemble Anthropic message content blocks the way the platform
// returns them when web_search runs server-side.
// ---------------------------------------------------------------------------

function serverToolUseBlock(opts: {
  id: string;
  input: { query: string };
}): Anthropic.ServerToolUseBlock {
  // The full union for `caller` includes server-callers; cast through unknown
  // because the test-side fixture doesn't model the discriminated DirectCaller
  // / ServerToolCaller variant in full.
  return {
    id: opts.id,
    name: 'web_search',
    type: 'server_tool_use',
    input: opts.input,
    caller: { type: 'direct' } as unknown as Anthropic.ServerToolUseBlock['caller'],
  };
}

function webSearchResultBlock(opts: {
  toolUseId: string;
  results: Array<{ title: string; url: string; encrypted_content: string }>;
}): Anthropic.WebSearchToolResultBlock {
  return {
    type: 'web_search_tool_result',
    tool_use_id: opts.toolUseId,
    content: opts.results.map((r) => ({
      type: 'web_search_result' as const,
      title: r.title,
      url: r.url,
      encrypted_content: r.encrypted_content,
      page_age: null,
    })),
    caller: { type: 'direct' } as unknown as Anthropic.WebSearchToolResultBlock['caller'],
  };
}

function webSearchUnavailableBlock(opts: {
  toolUseId: string;
}): Anthropic.WebSearchToolResultBlock {
  // Mirrors the Anthropic error shape when web search is disabled in the
  // workspace settings (Frank's open task at console.anthropic.com → Privacy).
  // Returns `WebSearchToolResultError` with error_code='unavailable'.
  return {
    type: 'web_search_tool_result',
    tool_use_id: opts.toolUseId,
    content: {
      type: 'web_search_tool_result_error',
      error_code: 'unavailable',
    },
    caller: { type: 'direct' } as unknown as Anthropic.WebSearchToolResultBlock['caller'],
  };
}

function textBlockWithCitations(opts: {
  text: string;
  citations: Array<{ url: string; title: string; cited_text: string }>;
}): Anthropic.TextBlock {
  return {
    type: 'text',
    text: opts.text,
    citations: opts.citations.map((c) => ({
      type: 'web_search_result_location' as const,
      url: c.url,
      title: c.title,
      cited_text: c.cited_text,
      encrypted_index: 'ix_test',
    })),
  };
}

function makeFinalMessage(
  content: Anthropic.ContentBlock[],
  opts?: { stopReason?: Anthropic.StopReason },
): Anthropic.Message {
  return {
    id: 'msg_test_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-4-6',
    content,
    stop_reason: opts?.stopReason ?? 'end_turn',
    stop_sequence: null,
    container: null,
    stop_details: null,
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: { web_search_requests: 1 },
    } as Anthropic.Usage,
  };
}

beforeEach(() => {
  messagesStream.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('web_search_20260209 server tool wiring', () => {
  it('registers web_search with the expected shape (name, type, max_uses)', async () => {
    const { getServerToolDescriptors } = await import(
      '@/lib/anthropic/server-tools'
    );
    const tools = getServerToolDescriptors();
    const ws = tools.find((t) => t.name === 'web_search');
    expect(ws).toBeDefined();
    expect(ws?.type).toBe('web_search_20260209');
    // Cast: the descriptor union narrows by `type` literal; the WebSearch
    // variant has `max_uses?: number`.
    const wsTyped = ws as Anthropic.WebSearchTool20260209;
    // Default in server-tools.ts is 5 when WEB_SEARCH_MAX_USES is unset.
    expect(typeof wsTyped.max_uses === 'number' && wsTyped.max_uses > 0).toBe(
      true,
    );
  });
});

describe('chat loop handles server_tool_use / web_search_tool_result blocks', () => {
  it('preserves web_search_tool_result content in assistant history without dispatching a client handler', async () => {
    await import('@/lib/anthropic/tools/bootstrap');
    const { chatTurn } = await import('@/lib/anthropic/chat');

    // The platform packs the server-executed search into ONE assistant message:
    // [text intro] → [server_tool_use("Stanley Quencher")] → [web_search_tool_result(2 results)] → [text with citations]
    const finalContent: Anthropic.ContentBlock[] = [
      { type: 'text', text: 'Looking that up.', citations: null },
      serverToolUseBlock({
        id: 'srvtool_01',
        input: { query: 'Stanley Quencher H2.0 official' },
      }),
      webSearchResultBlock({
        toolUseId: 'srvtool_01',
        results: [
          {
            title: 'Stanley Quencher H2.0 — Stanley1913.com',
            url: 'https://www.stanley1913.com/products/quencher-h2-0',
            encrypted_content: 'enc_a',
          },
          {
            title: 'Stanley Quencher H2.0 FlowState Tumbler',
            url: 'https://www.amazon.com/dp/B0BG3KW9Y8',
            encrypted_content: 'enc_b',
          },
        ],
      }),
      textBlockWithCitations({
        text: 'Found it on Stanley1913.com — adding the canonical link.',
        citations: [
          {
            url: 'https://www.stanley1913.com/products/quencher-h2-0',
            title: 'Stanley Quencher H2.0 — Stanley1913.com',
            cited_text: 'Stanley Quencher H2.0 FlowState™ Tumbler',
          },
        ],
      }),
    ];

    const fake = makeStream();
    messagesStream.mockImplementationOnce(() => {
      // streamMessage subscribes synchronously after this call returns — fire
      // events after the consumer has had a tick to attach handlers.
      queueMicrotask(() => {
        dispatchFinalMessage(fake, makeFinalMessage(finalContent));
      });
      return fake;
    });

    const generator = chatTurn({
      ctx: { peekId: 'peek-x', userId: 'user_1', sessionId: 'sess-1' },
      history: [],
      userMessage: 'find me a Stanley Quencher',
    });

    // Drain the generator to its return value.
    let final: { history: Anthropic.MessageParam[] } | undefined;
    while (true) {
      const step = await generator.next();
      if (step.done) {
        final = step.value;
        break;
      }
    }
    expect(final).toBeDefined();

    // History: [user_message, assistant_message_with_search]. No follow-up
    // tool_result user message because there's no client tool to dispatch.
    expect(final?.history.length).toBe(2);
    expect(final?.history[0]?.role).toBe('user');
    const assistant = final?.history[1];
    expect(assistant?.role).toBe('assistant');

    const assistantContent = assistant?.content as Anthropic.ContentBlock[];

    // The four blocks the model emitted survive verbatim.
    const types = assistantContent.map((b) => b.type);
    expect(types).toEqual([
      'text',
      'server_tool_use',
      'web_search_tool_result',
      'text',
    ]);

    // server_tool_use block keeps the query input so the next turn can refer
    // back to what was searched.
    const stu = assistantContent[1] as Anthropic.ServerToolUseBlock;
    expect(stu.name).toBe('web_search');
    expect((stu.input as { query: string }).query).toContain('Stanley');

    // web_search_tool_result block: result content is an array of
    // WebSearchResultBlock — the tokens the next iteration's context will see.
    const result = assistantContent[2] as Anthropic.WebSearchToolResultBlock;
    expect(result.tool_use_id).toBe('srvtool_01');
    const resultsArr = result.content as Anthropic.WebSearchResultBlock[];
    expect(Array.isArray(resultsArr)).toBe(true);
    expect(resultsArr).toHaveLength(2);
    expect(resultsArr[0]?.url).toBe(
      'https://www.stanley1913.com/products/quencher-h2-0',
    );

    // Citations on the trailing text block survive (UI footnote-rendering
    // relies on these making it through unmangled).
    const trailing = assistantContent[3] as Anthropic.TextBlock;
    expect(trailing.citations).toBeTruthy();
    expect(trailing.citations?.[0]?.type).toBe('web_search_result_location');
  });

  it('handles web_search unavailable error_code without crashing the chat loop', async () => {
    // FRANK-ACTION: until web search is enabled at platform.claude.com →
    // Settings → Privacy, Anthropic returns this error shape verbatim. The
    // chat loop must NOT throw — the model should be free to text-reply
    // ("I can't pull product info right now — got a link?") and the turn
    // ends cleanly.
    await import('@/lib/anthropic/tools/bootstrap');
    const { chatTurn } = await import('@/lib/anthropic/chat');

    const finalContent: Anthropic.ContentBlock[] = [
      serverToolUseBlock({
        id: 'srvtool_02',
        input: { query: 'AirPods Pro 2' },
      }),
      webSearchUnavailableBlock({ toolUseId: 'srvtool_02' }),
      {
        type: 'text',
        text:
          "I can't pull product info right now — got a link you want me to scrape?",
        citations: null,
      },
    ];

    const fake = makeStream();
    messagesStream.mockImplementationOnce(() => {
      queueMicrotask(() => {
        dispatchFinalMessage(fake, makeFinalMessage(finalContent));
      });
      return fake;
    });

    const generator = chatTurn({
      ctx: { peekId: 'peek-y', userId: 'user_1', sessionId: 'sess-2' },
      history: [],
      userMessage: 'get her AirPods',
    });

    let final: { history: Anthropic.MessageParam[] } | undefined;
    await expect(
      (async () => {
        while (true) {
          const step = await generator.next();
          if (step.done) {
            final = step.value;
            return;
          }
        }
      })(),
    ).resolves.not.toThrow();

    expect(final).toBeDefined();
    const assistant = final?.history[final.history.length - 1];
    const content = assistant?.content as Anthropic.ContentBlock[];
    const errBlock = content.find(
      (b) => b.type === 'web_search_tool_result',
    ) as Anthropic.WebSearchToolResultBlock | undefined;
    expect(errBlock).toBeDefined();
    const err = errBlock?.content as Anthropic.WebSearchToolResultError;
    expect(err.type).toBe('web_search_tool_result_error');
    expect(err.error_code).toBe('unavailable');

    // Trailing graceful text from the model is preserved so the curator sees
    // a clean fallback message in the chat surface.
    const trailingText = content.find((b) => b.type === 'text') as
      | Anthropic.TextBlock
      | undefined;
    expect(trailingText?.text).toContain("can't pull product info");
  });
});
