import { NextRequest } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { anthropic, PEEK_MODEL, PEEK_SYSTEM_PROMPT } from '@/lib/anthropic';
import { PEEK_TOOLS, runTool } from '@/lib/peek-tools';
import { q, q1 } from '@/lib/db';
import { track } from '@/lib/posthog';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

  // Ensure curator row exists w/ email + name for emails later
  const user = await currentUser();
  await q(
    `INSERT INTO curators (clerk_user_id, email, display_name)
     VALUES ($1,$2,$3)
     ON CONFLICT (clerk_user_id) DO UPDATE
       SET email = EXCLUDED.email, display_name = EXCLUDED.display_name`,
    [
      userId,
      user?.emailAddresses?.[0]?.emailAddress || null,
      user?.firstName || user?.username || null
    ]
  );

  // Ensure peek + session exist
  let peekId = body.peek_id;
  if (!peekId) {
    const newPeek = await q1<{ id: string }>(
      `INSERT INTO peeks (curator_id) VALUES ($1) RETURNING id`,
      [userId]
    );
    peekId = newPeek.id;
    track('peek_created', userId, { peek_id: peekId });
  }

  let sessionId = body.session_id;
  if (!sessionId) {
    const newSess = await q1<{ id: string }>(
      `INSERT INTO chat_sessions (clerk_user_id, peek_id) VALUES ($1,$2) RETURNING id`,
      [userId, peekId]
    );
    sessionId = newSess.id;
  }

  // Load history
  const histRows = await q<{ role: string; content: any }>(
    `SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
    [sessionId]
  );
  const history = histRows.map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content as any }));

  // Append new user message
  const userBlocks: any[] = [];
  if (body.user_message?.image_url) {
    userBlocks.push({ type: 'image', source: { type: 'url', url: body.user_message.image_url } });
  }
  if (body.user_message?.text) {
    userBlocks.push({ type: 'text', text: body.user_message.text });
  }
  if (userBlocks.length) {
    history.push({ role: 'user', content: userBlocks });
    await q(`INSERT INTO chat_messages (session_id, role, content) VALUES ($1,'user',$2::jsonb)`, [
      sessionId,
      JSON.stringify(userBlocks)
    ]);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => controller.enqueue(encoder.encode(sse(event, data)));
      emit('hello', { session_id: sessionId, peek_id: peekId });

      const client = anthropic();
      const messages = [...history];
      try {
        for (let hop = 0; hop < 8; hop++) {
          const response = await client.messages.create({
            model: PEEK_MODEL,
            max_tokens: 2048,
            system: PEEK_SYSTEM_PROMPT,
            tools: PEEK_TOOLS as any,
            messages
          });

          const toolUses: Array<{ id: string; name: string; input: any }> = [];
          for (const block of response.content) {
            if (block.type === 'text') {
              emit('text', { text: block.text });
            } else if (block.type === 'tool_use') {
              toolUses.push({ id: block.id, name: block.name, input: block.input });
              emit('tool_start', { id: block.id, name: block.name, input: block.input });
            }
          }

          await q(`INSERT INTO chat_messages (session_id, role, content) VALUES ($1,'assistant',$2::jsonb)`, [
            sessionId,
            JSON.stringify(response.content)
          ]);
          messages.push({ role: 'assistant', content: response.content as any });

          if (toolUses.length === 0) {
            emit('done', { stop_reason: response.stop_reason });
            break;
          }

          const toolResults: any[] = [];
          for (const t of toolUses) {
            try {
              const result = await runTool(t.name, t.input, { peek_id: peekId!, clerk_user_id: userId });
              emit('tool_end', { id: t.id, name: t.name, result });
              toolResults.push({ type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(result) });
            } catch (e: any) {
              const errPayload = { error: e?.message || String(e) };
              emit('tool_end', { id: t.id, name: t.name, result: errPayload, error: true });
              toolResults.push({
                type: 'tool_result',
                tool_use_id: t.id,
                content: JSON.stringify(errPayload),
                is_error: true
              });
            }
          }
          messages.push({ role: 'user' as const, content: toolResults });
          await q(`INSERT INTO chat_messages (session_id, role, content) VALUES ($1,'user',$2::jsonb)`, [
            sessionId,
            JSON.stringify(toolResults)
          ]);
          emit('preview_dirty', { peek_id: peekId });
        }
      } catch (e: any) {
        emit('error', { message: e?.message || 'chat_failed' });
      } finally {
        controller.close();
      }
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
