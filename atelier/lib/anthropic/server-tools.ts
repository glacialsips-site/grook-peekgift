import type Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

// Tools Anthropic executes server-side, shipped alongside our client-tool
// registry in messages.create.tools. Memory is hybrid: Anthropic-routed but
// dispatched inline in chat.ts to our storage handlers.

export function getServerToolDescriptors(): Array<
  | Anthropic.CodeExecutionTool20260120
  | Anthropic.WebSearchTool20260209
  | Anthropic.WebFetchTool20260209
  | Anthropic.ToolSearchToolBm25_20251119
  | Anthropic.MemoryTool20250818
> {
  return [
    // code_execution — required by the new web_search / web_fetch dynamic
    // filtering paths. Free when combined with them. Cost-charged otherwise.
    {
      type: 'code_execution_20260120',
      name: 'code_execution',
    },
    // web_search — $10 / 1000 searches. Requires the Anthropic admin to
    // enable web search at console.anthropic.com → Settings → Privacy.
    // If unavailable, Anthropic returns a tool_result_error with
    // error_code='unavailable'; downstream callers (affiliate_search
    // fallback) must surface gracefully — see tools/affiliate_search.ts.
    {
      type: 'web_search_20260209',
      name: 'web_search',
      max_uses: env.WEB_SEARCH_MAX_USES ?? 5,
    },
    // web_fetch — free beyond token cost. URLs must already appear in
    // conversation context (security: prevents arbitrary fetch).
    {
      type: 'web_fetch_20260209',
      name: 'web_fetch',
      max_uses: env.WEB_FETCH_MAX_USES ?? 3,
      max_content_tokens: 50_000,
    },
    // tool_search — BM25 search across the registered tool catalog.
    // Pairs with `defer_loading: true` on most of the client tools so
    // only the always-loaded keepers sit in the system prompt prefix.
    {
      type: 'tool_search_tool_bm25_20251119',
      name: 'tool_search_tool_bm25',
    },
    // memory — Anthropic-routed but client-handled. The chat loop spots
    // tool_use blocks with name='memory' and dispatches via the typed
    // handlers in lib/anthropic/memory/store.ts. Never defer-load this
    // (R7: Memory must be eager-recallable on session resume).
    {
      type: 'memory_20250818',
      name: 'memory',
    },
  ];
}
