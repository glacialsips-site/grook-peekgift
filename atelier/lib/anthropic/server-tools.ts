import type Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

export function getServerToolDescriptors(): Array<
  | Anthropic.CodeExecutionTool20260120
  | Anthropic.WebSearchTool20260209
  | Anthropic.WebFetchTool20260209
  | Anthropic.ToolSearchToolBm25_20251119
  | Anthropic.MemoryTool20250818
> {
  return [
    {
      type: 'code_execution_20260120',
      name: 'code_execution',
    },
    {
      type: 'web_search_20260209',
      name: 'web_search',
      max_uses: env.WEB_SEARCH_MAX_USES ?? 5,
    },
    {
      type: 'web_fetch_20260209',
      name: 'web_fetch',
      max_uses: env.WEB_FETCH_MAX_USES ?? 3,
      max_content_tokens: 50_000,
    },
    {
      type: 'tool_search_tool_bm25_20251119',
      name: 'tool_search_tool_bm25',
    },
    {
      type: 'memory_20250818',
      name: 'memory',
    },
  ];
}
