import type Anthropic from '@anthropic-ai/sdk';

/**
 * Context handed to every tool handler. Tools that mutate the in-flight Peek
 * must derive ownership / authorization from these IDs — never trust inputs.
 */
export interface ToolContext {
  /** The Peek being edited in this conversation. */
  peekId: string;
  /** Authenticated curator (null for anonymous pre-claim sessions). */
  userId: string | null;
  /** Chat session id — used for idempotency and observability. */
  sessionId: string;
}

/**
 * A registered tool. `Input` is the validated input shape; `Output` is what
 * the handler returns. The model only ever sees `name` / `description` /
 * `input_schema`; `handler` runs server-side.
 */
export interface ToolDefinition<Input = unknown, Output = unknown> {
  name: string;
  description: string;
  input_schema: Anthropic.Tool.InputSchema;
  handler: (input: Input, ctx: ToolContext) => Promise<Output>;
}

/**
 * Process-global tool registry. Tool modules call {@link registerTool} at
 * import time; the bootstrap module side-effect-imports each tool file once.
 */
export const TOOL_REGISTRY: Map<string, ToolDefinition> = new Map();

export function registerTool<Input, Output>(
  tool: ToolDefinition<Input, Output>,
): void {
  if (TOOL_REGISTRY.has(tool.name)) {
    throw new Error(`Tool ${tool.name} is already registered`);
  }
  // Cast through unknown to widen Input/Output to the registry's default
  // `unknown` while preserving the public typed entrypoint.
  TOOL_REGISTRY.set(tool.name, tool as unknown as ToolDefinition);
}

/**
 * Tool schemas in the shape Anthropic's Messages API expects. Pass this as
 * the `tools` field on `messages.create()` / `messages.stream()`.
 */
export function getToolSchemas(): Anthropic.Tool[] {
  return Array.from(TOOL_REGISTRY.values()).map(
    ({ name, description, input_schema }) => ({
      name,
      description,
      input_schema,
    }),
  );
}

export function getTool(name: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.get(name);
}

/**
 * Invoke a registered tool. Throws on unknown name; handler errors propagate
 * so callers can convert them to tool_result blocks with `is_error: true`.
 */
export async function runTool(
  name: string,
  input: unknown,
  ctx: ToolContext,
): Promise<unknown> {
  const tool = TOOL_REGISTRY.get(name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return tool.handler(input, ctx);
}
