export interface SseTurnUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export type SseEvent =
  | { kind: 'text'; delta: string }
  | { kind: 'tool_call'; id: string; name: string; input?: unknown }
  | { kind: 'tool_result'; id: string; output: unknown }
  | { kind: 'turn_end'; usage: SseTurnUsage }
  | { kind: 'error'; message: string };
