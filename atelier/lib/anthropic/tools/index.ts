import type Anthropic from '@anthropic-ai/sdk';

export interface ToolContext {
  peekId: string;
  userId: string | null;
  sessionId: string;
  turnId?: string;
}

export interface ToolDefinition<Input = unknown, Output = unknown> {
  name: string;
  description: string;
  input_schema: Anthropic.Tool.InputSchema;
  handler: (input: Input, ctx: ToolContext) => Promise<Output>;
  deferLoading?: boolean;
}

export const TOOL_REGISTRY: Map<string, ToolDefinition> = new Map();

export function registerTool<Input, Output>(
  tool: ToolDefinition<Input, Output>,
): void {
  if (TOOL_REGISTRY.has(tool.name)) {
    throw new Error(`Tool ${tool.name} is already registered`);
  }
  TOOL_REGISTRY.set(tool.name, tool as unknown as ToolDefinition);
}

export function getToolSchemas(): Anthropic.Tool[] {
  return Array.from(TOOL_REGISTRY.values()).map(
    ({ name, description, input_schema, deferLoading }) => {
      const t: Anthropic.Tool = { name, description, input_schema };
      if (deferLoading) t.defer_loading = true;
      return t;
    },
  );
}

export function getTool(name: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.get(name);
}

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
