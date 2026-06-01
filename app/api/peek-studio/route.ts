// ============================================================================
// peek.gift — POST /api/peek-studio  (the chat SSE endpoint, ir/INTERFACES.md §2)
// ----------------------------------------------------------------------------
// POST { messages, ir? }  →  text/event-stream of the ChatEvent union:
//   {text} | {page,ir,rev} | {tool} | {notice} | {done} | {error}
//
//   • runLive when ANTHROPIC_API_KEY is set (real Opus 4.8 brain via ports.llm).
//   • else a DETERMINISTIC stub that authors a real demo IR via the SAME reduceTool,
//     so the preview builds with ZERO keys.
//
// Every tool payload is zod-validated and the IR re-validated inside reduceTool;
// custom-section html is sanitized on apply. The route just transports + persists.
//
// SSE framing: each event is one `data: <json>\n\n` line (the ChatEvent object).
// The client applies them in order (append text, replace preview on `page`, stop on
// done/error). newline-delimited JSON is also acceptable per the spec; we use the
// canonical SSE `data:` framing.
// ============================================================================

import { NextRequest } from 'next/server';

import { validatePeekIR } from '@/lib/ir/schema';
import type { PeekIR } from '@/lib/ir/contract';
import { ports } from '@/lib/ir/ports';
import {
  createSeedIR,
  runStudioTurn,
  type ChatEvent,
  type StudioMessage,
} from '@/lib/peek-chat/engine';
import type { ToolContext } from '@/lib/peek-chat/tools';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface StudioRequestBody {
  messages?: StudioMessage[];
  ir?: unknown;
  peekId?: string;
  curatorId?: string;
}

// One SSE frame per ChatEvent.
function frame(e: ChatEvent): string {
  return `data: ${JSON.stringify(e)}\n\n`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as StudioRequestBody;

  const messages: StudioMessage[] = Array.isArray(body.messages) ? body.messages : [];
  const peekId = typeof body.peekId === 'string' && body.peekId ? body.peekId : `peek_${Date.now().toString(36)}`;
  const curatorId = typeof body.curatorId === 'string' && body.curatorId ? body.curatorId : 'anon-curator';
  const ctx: ToolContext = { peekId, curatorId };

  // Resolve the starting IR: validate a provided one, else seed a minimal valid IR.
  let startIR: PeekIR;
  if (body.ir !== undefined && body.ir !== null) {
    const v = validatePeekIR(body.ir);
    if (!v.ok) {
      return new Response(JSON.stringify({ type: 'error', error: `invalid ir: ${v.error}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    startIR = v.value;
  } else {
    startIR = createSeedIR({ peekId, curatorId });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (e: ChatEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(frame(e)));
        } catch {
          closed = true;
        }
      };

      // Persist each validated snapshot (best-effort; stub persistence is a no-op
      // save, real persistence appends a version). Never let a persistence hiccup
      // kill the stream.
      const onSnapshot = async (ir: PeekIR) => {
        try {
          await ports.persistence.appendVersion(peekId, ir);
        } catch {
          /* non-fatal */
        }
      };

      try {
        // The engine emits its own stub-mode/live notices first (notice→text→page→done);
        // the route stays a pure transport.
        await runStudioTurn(startIR, messages, ctx, emit, { onSnapshot });
      } catch (e) {
        emit({ type: 'error', error: (e as Error).message || 'studio turn failed' });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
