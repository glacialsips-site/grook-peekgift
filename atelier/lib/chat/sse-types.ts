export interface SseTurnUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export interface PeekUpdateSnapshot {
  peek: unknown;
  cards: unknown[];
  variantGroups: unknown[];
}

export type SseEvent =
  | { kind: 'text'; delta: string }
  | { kind: 'tool_call'; id: string; name: string; input?: unknown }
  | { kind: 'tool_result'; id: string; output: unknown }
  | { kind: 'peek_update'; snapshot: PeekUpdateSnapshot }
  | { kind: 'turn_end'; usage: SseTurnUsage }
  | { kind: 'error'; message: string };
