// Edge-safe raw-fetch wrapper around the Anthropic Messages API.
//
// No SDK, no node imports — only Web APIs (fetch, AbortSignal). Safe to run on
// a Netlify Edge Function (Deno) runtime.

import type {
  AnthropicMessage,
  AnthropicToolDef,
} from '@/lib/anthropic-edge/types';

export type CallAnthropicParams = {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  system?: string;
  tools?: AnthropicToolDef[];
  stream?: boolean; // default true
  apiKey?: string; // default process.env['ANTHROPIC_API_KEY']
  baseUrl?: string; // default 'https://api.anthropic.com/v1/messages'
  anthropicVersion?: string; // default '2023-06-01'
  signal?: AbortSignal;
};

export type CallAnthropic = (params: CallAnthropicParams) => Promise<Response>;

const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_ANTHROPIC_VERSION = '2023-06-01';

export const callAnthropic: CallAnthropic = async (params) => {
  const stream = params.stream ?? true;
  const apiKey = params.apiKey ?? process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  const baseUrl = params.baseUrl ?? DEFAULT_BASE_URL;
  const anthropicVersion =
    params.anthropicVersion ?? DEFAULT_ANTHROPIC_VERSION;

  // Build the body explicitly so optional fields are omitted when unset
  // (rather than serialized as `undefined`/null, which the API rejects).
  const body: Record<string, unknown> = {
    model: params.model,
    max_tokens: params.max_tokens,
    messages: params.messages,
    stream,
  };
  if (params.system !== undefined) body['system'] = params.system;
  if (params.tools !== undefined) body['tools'] = params.tools;

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': anthropicVersion,
    },
    body: JSON.stringify(body),
    signal: params.signal,
  });

  // NO SILENT FAILURES: surface non-2xx with a trimmed body for diagnosis.
  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      detail = '';
    }
    throw new Error(`anthropic_${res.status}: ${detail.slice(0, 200)}`);
  }

  // When streaming, the caller depends on a live body stream; a 2xx with no
  // body is a protocol violation we must not swallow.
  if (stream && !res.body) {
    throw new Error('anthropic_no_body: streaming response had no body');
  }

  return res;
};
