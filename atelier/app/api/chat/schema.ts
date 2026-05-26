import { z } from 'zod';

const TextBlockSchema = z
  .object({ type: z.literal('text'), text: z.string() })
  .passthrough();

const ImageUrlSourceSchema = z
  .object({
    type: z.literal('url'),
    url: z.string().url(),
    media_type: z.string().optional(),
  })
  .passthrough();

const ImageBase64SourceSchema = z
  .object({
    type: z.literal('base64'),
    media_type: z.string(),
    data: z.string(),
  })
  .passthrough();

const ImageBlockSchema = z
  .object({
    type: z.literal('image'),
    source: z.union([ImageUrlSourceSchema, ImageBase64SourceSchema]),
  })
  .passthrough();

const ToolUseBlockSchema = z
  .object({
    type: z.literal('tool_use'),
    id: z.string(),
    name: z.string(),
    input: z.unknown(),
  })
  .passthrough();

const ToolResultBlockSchema = z
  .object({
    type: z.literal('tool_result'),
    tool_use_id: z.string(),
    content: z.unknown(),
    is_error: z.boolean().optional(),
  })
  .passthrough();

const ContentBlockSchema = z.union([
  TextBlockSchema,
  ImageBlockSchema,
  ToolUseBlockSchema,
  ToolResultBlockSchema,
  z.object({ type: z.string() }).passthrough(),
]);

const MessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.union([z.string(), z.array(ContentBlockSchema)]),
  })
  .passthrough();

export const ChatRequestSchema = z
  .object({
    peekId: z.string().uuid(),
    sessionId: z.string().min(1).max(200),
    history: z.array(MessageSchema),
    userMessage: z.union([z.string().min(1), z.array(ContentBlockSchema).min(1)]),
    model: z.string().min(1).optional(),
  })
  .strict();

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface TurnUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export { type SseEvent } from '@/lib/chat/sse-types';
