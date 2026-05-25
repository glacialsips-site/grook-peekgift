/**
 * Public surface of the Anthropic integration. Most callers should import
 * from `@/lib/anthropic` rather than reaching into sub-modules.
 */
export {
  anthropic,
  assertAnthropicConfigured,
  DEFAULT_MODEL,
  FAST_MODEL,
  type AnthropicClient,
} from './client';

export {
  getSystemPrompt,
  STATIC_SYSTEM_PROMPT_TEXT,
  type SystemPromptOptions,
} from './system-prompt';

export {
  TOOL_REGISTRY,
  getTool,
  getToolSchemas,
  registerTool,
  runTool,
  type ToolContext,
  type ToolDefinition,
} from './tools/index';

export { streamMessage, type StreamEvent } from './streaming';

export {
  chatTurn,
  type ChatTurnInput,
  type ChatTurnResult,
  type IterationUsage,
} from './chat';
