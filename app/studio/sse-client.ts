// ============================================================================
// app/studio/sse-client.ts — typed reader for the chat SSE stream (INTERFACES §2)
// ----------------------------------------------------------------------------
// POST /api/peek-studio returns text/event-stream. Each `data: <json>\n\n` line is
// one ChatEvent of the union below. We parse the byte stream into typed events and
// hand each to a callback in arrival order. Newline-delimited JSON is also accepted
// per the spec, so we tolerate frames with or without the `data:` prefix and split
// on blank lines OR bare newlines containing a JSON object.
// ============================================================================

import type { PeekIR } from '@/lib/ir/contract';

/** The frozen SSE event union — mirrors lib/peek-chat/engine.ts ChatEvent exactly. */
export type StudioEvent =
  | { type: 'text'; delta: string }
  | { type: 'page'; ir: PeekIR; rev: number }
  | {
      type: 'tool';
      phase: 'start' | 'result' | 'error';
      id: string;
      name: string;
      input?: unknown;
      result?: unknown;
      error?: string;
    }
  | { type: 'notice'; level: 'info' | 'warn'; text: string }
  | { type: 'done'; rev: number }
  | { type: 'error'; error: string; retryable?: boolean };

export interface StudioMessage {
  role: 'user' | 'assistant';
  content: unknown;
}

export interface StudioTurnRequest {
  messages: StudioMessage[];
  ir?: PeekIR | null;
  peekId?: string;
  curatorId?: string;
}

export interface StreamHandlers {
  onEvent: (e: StudioEvent) => void;
  /** transport / parse failure (distinct from an in-band {error} event) */
  onError?: (err: Error) => void;
}

/** Pull one JSON payload out of a single SSE record (its set of lines). */
function payloadFromRecord(record: string): string | null {
  // Canonical SSE: one or more `data:` lines per record (joined by \n).
  const dataLines: string[] = [];
  let sawData = false;
  for (const raw of record.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (line.startsWith(':')) continue; // comment / heartbeat
    if (line.startsWith('data:')) {
      sawData = true;
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }
  if (sawData) return dataLines.join('\n');
  // Fallback: newline-delimited JSON — the whole record is the payload.
  const trimmed = record.trim();
  return trimmed.length ? trimmed : null;
}

function dispatch(payload: string, onEvent: (e: StudioEvent) => void) {
  const trimmed = payload.trim();
  if (!trimmed || trimmed === '[DONE]') return;
  let evt: StudioEvent;
  try {
    evt = JSON.parse(trimmed) as StudioEvent;
  } catch {
    return; // skip an unparseable frame rather than tear down the stream
  }
  if (evt && typeof (evt as { type?: unknown }).type === 'string') onEvent(evt);
}

/**
 * POST a turn and stream the typed events. Resolves when the stream ends
 * (server closes after `done`/`error`). Pass an AbortSignal to cancel.
 */
export async function streamStudioTurn(
  body: StudioTurnRequest,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/api/peek-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return;
    handlers.onError?.(err as Error);
    return;
  }

  // A 4xx (e.g. invalid IR) comes back as JSON, not a stream.
  if (!res.ok || !res.body) {
    let msg = `studio request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j && typeof j.error === 'string') msg = j.error;
    } catch {
      /* keep default */
    }
    handlers.onEvent({ type: 'error', error: msg });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // Records are separated by a blank line (\n\n). Hold the trailing partial.
      let sep: number;
      // normalize CRLF blank-line separators too
      while ((sep = indexOfRecordBreak(buf)) !== -1) {
        const record = buf.slice(0, sep);
        buf = buf.slice(sep).replace(/^(\r?\n){1,2}/, '');
        const payload = payloadFromRecord(record);
        if (payload != null) dispatch(payload, handlers.onEvent);
      }
    }
    // flush any tail
    buf += decoder.decode();
    if (buf.trim()) {
      const payload = payloadFromRecord(buf);
      if (payload != null) dispatch(payload, handlers.onEvent);
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return;
    handlers.onError?.(err as Error);
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* noop */
    }
  }
}

/** Index of the next record break (blank line), or -1. Handles \n\n and \r\n\r\n. */
function indexOfRecordBreak(s: string): number {
  const a = s.indexOf('\n\n');
  const b = s.indexOf('\r\n\r\n');
  if (a === -1) return b;
  if (b === -1) return a;
  return Math.min(a, b);
}
