// Edge-safe Anthropic Messages API toolkit — public barrel.
//
// Everything re-exported here is safe to run on a Netlify Edge Function (Deno):
// no SDK, no node imports, only Web APIs. Types are re-exported with
// `export type` for isolatedModules compatibility.

export { callAnthropic } from '@/lib/anthropic-edge/client';
export type {
  CallAnthropic,
  CallAnthropicParams,
} from '@/lib/anthropic-edge/client';

export { parseAnthropicStream } from '@/lib/anthropic-edge/sse';

export { runToolLoop, capToolResult } from '@/lib/anthropic-edge/tool-loop';
export type {
  CapToolResult,
  RunToolLoopParams,
  ToolDispatch,
  ToolLoopEvent,
  ToolLoopResult,
} from '@/lib/anthropic-edge/tool-loop';

export type {
  AnthropicContentBlock,
  AnthropicMessage,
  AnthropicStreamEvent,
  AnthropicTextBlock,
  AnthropicToolDef,
  AnthropicToolResultBlock,
  AnthropicToolUseBlock,
  StopReason,
} from '@/lib/anthropic-edge/types';
