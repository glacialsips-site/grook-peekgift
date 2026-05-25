import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { anthropic, PEEK_MODEL, PEEK_SYSTEM_PROMPT } from '@/lib/anthropic';
import { PEEK_TOOLS, runTool } from '@/lib/peek-tools';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

// SSE helper
function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('unauthorized', { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    session_id?: string;
    peek_id?: string;
    user_message?: { text?: string; image_url?: string | null };
  };

  const db = supabaseAdmin();

  // Ensure curator row exists
  await db.from('curators').upsert({ clerk_user_id: userId }).select();

  // Ensure peek + session exist
  let peekId = body.peek_id;
  if (!peekId) {
    const { data: newPeek, error: pErr } = await db
      .from('peeks')
      .insert({ curator_id: userId })
      .select('id')
      .single();
    if (pErr) return new Response('peek_create_failed: ' + pErr.message, { status: 500 });
    peekId = newPeek.id;
  }

  let sessionId = body.session_id;
  if (!sessionId) {
    const { data: newSess, error: sErr } = await db
      .from('chat_sessions')
      .insert({ clerk_user_id: userId, peek_id: peekId })
      .select('id')
      .single();
    if (sErr) return new Response('session_create_failed: ' + sErr.message, { status: 500 });
    sessionId = newSess.id;
  }

  // Load history
  const { data: histRows } = await db
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  const history = (histRows || []).map((r: any) => ({ role: r.role as 'user' | 'assistant', content: r.content as any }));

  // Append the new user message
  const userBlocks: any[] = [];
  if (body.user_message?.image_url) {
    userBlocks.push({
      type: 'image',
      source: { type: 'url', url: body.user_message.image_url }
    });
  }
  if (body.user_message?.text) {
    userBlocks.push({ type: 'text', text: body.user_message.text });
  }
  if (userBlocks.length) {
    const userMsg = { role: 'user' as const, content: userBlocks };
    history.push(userMsg);
    await db.from('chat_messages').insert({ session_id: sessionId, role: 'user', content: userBlocks });
  }

  // Stream tokens + tool events back to client via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sse(event, data)));

      emit('hello', { session_id: sessionId, peek_id: peekId });

      const client = anthropic();
      const messages = [...history];
      // Hard cap so we don't tool-loop forever
      for (let hop = 0; hop < 6; hop++) {
        let pendingText = '';
        const toolUses: Array<{ id: string; name: string; input: any }> = [];

        const response = await client.messages.create({
          model: PEEK_MODEL,
          max_tokens: 2048,
          system: PEEK_SYSTEM_PROMPT,
          tools: PEEK_TOOLS as any,
          messages
        });

        for (const block of response.content) {
          if (block.type === 'text') {
            pendingText += block.text;
            emit('text', { text: block.text });
          } else if (block.type === 'tool_use') {
            toolUses.push({ id: block.id, name: block.name, input: block.input });
            emit('tool_start', { id: block.id, name: block.name, input: block.input });
          }
        }

        // Persist the assistant turn (full blocks)
        await db.from('chat_messages').insert({ session_id: sessionId, role: 'assistant', content: response.content });
        messages.push({ role: 'assistant', content: response.content as any });

        if (toolUses.length === 0) {
          emit('done', { stop_reason: response.stop_reason });
          break;
        }

        // Run tools and feed results back
        const toolResults: any[] = [];
        for (const t of toolUses) {
          try {
            const result = await runTool(t.name, t.input, { peek_id: peekId!, clerk_user_id: userId });
            emit('tool_end', { id: t.id, name: t.name, result });
            toolResults.push({ type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(result) });
          } catch (e: any) {
            const errPayload = { error: e?.message || String(e) };
            emit('tool_end', { id: t.id, name: t.name, result: errPayload, error: true });
            toolResults.push({ type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(errPayload), is_error: true });
          }
        }
        const toolMsg = { role: 'user' as const, content: toolResults };
        messages.push(toolMsg);
        await db.from('chat_messages').insert({ session_id: sessionId, role: 'user', content: toolResults });

        emit('preview_dirty', { peek_id: peekId });
        // loop
      }

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no'
    }
  });
}
