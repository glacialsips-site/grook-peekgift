// Edge-safe Anthropic Messages API types.
//
// This file is pure type declarations (erased at build), so it is safe to
// import from any runtime, including Netlify Edge Functions (Deno). It does
// NOT import the @anthropic-ai/sdk (which drags in node-only deps); these are
// hand-rolled to match the Anthropic streaming wire protocol.

export type AnthropicTextBlock = { type: 'text'; text: string };

export type AnthropicToolUseBlock = {
  type: 'tool_use';
  id: string;
  name: string;
  input: unknown;
};

export type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock;

export type AnthropicToolResultBlock = {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
};

export type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[] | AnthropicToolResultBlock[];
};

export type AnthropicToolDef = {
  name: string;
  description?: string;
  input_schema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
};

// `(string & {})` keeps the known literals as autocomplete hints while still
// accepting any future stop reason the API may add without a type error.
export type StopReason =
  | 'end_turn'
  | 'max_tokens'
  | 'stop_sequence'
  | 'tool_use'
  | 'pause_turn'
  | 'refusal'
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {})
  | null;

// Typed events the SSE parser yields — a normalized 1:1 mapping of the
// Anthropic streaming wire. `content_block_start` carries a freshly-seeded
// block (text → {type:'text',text:''}; tool_use → {type:'tool_use',id,name,input:{}}).
export type AnthropicStreamEvent =
  | { type: 'message_start'; messageId: string; model: string }
  | { type: 'content_block_start'; index: number; block: AnthropicContentBlock }
  | { type: 'text_delta'; index: number; text: string }
  | { type: 'input_json_delta'; index: number; partialJson: string }
  | { type: 'content_block_stop'; index: number }
  | { type: 'message_delta'; stopReason: StopReason }
  | { type: 'message_stop' };
