export {
  anthropic,
  assertAnthropicConfigured,
  DEFAULT_MODEL,
  FAST_MODEL,
  type AnthropicClient,
} from './client';

export {
  buildSystemBlocks,
  buildSystemPrompt,
  getSystemPrompt,
  STATIC_SYSTEM_PROMPT_TEXT,
  type OccasionType,
  type SystemPromptOptions,
  type ThreadPhase,
} from './system-prompt';

export { classifyOccasionToTemplate } from './classify-occasion';

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
