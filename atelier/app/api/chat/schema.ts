import { z } from 'zod';

export const ChatRequestSchema = z.object({
  peekId: z.string().uuid(),
  sessionId: z.string().min(1),
  history: z.array(z.unknown()),
  userMessage: z.union([z.string(), z.array(z.unknown())]),
  model: z.string().optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface TurnUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export type SseEvent =
  | { kind: 'text'; delta: string }
  | { kind: 'tool_call'; id: string; name: string; input?: unknown }
  | { kind: 'tool_result'; id: string; output: unknown }
  | { kind: 'turn_end'; usage: TurnUsage }
  | { kind: 'error'; message: string };
