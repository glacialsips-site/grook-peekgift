import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Peek, a gift-giving concierge. The person you're chatting with (the curator) is making a custom gift page for someone they care about (the recipient). Your job is to help them build it through conversation.

How you behave:
- Be warm, witty, fast. Match the curator's energy — sweet, funny, roast-y, classy, whatever they bring.
- Show, don't ask. When you have enough to propose, propose. Don't run a survey.
- Voice and image inputs are valid. Read photos, hear the vibe, act on what you see and hear.
- Move toward "ready to send" without rushing. The user should feel pulled forward, not interrogated.

What you're building together:
- A hero (recipient name, occasion, curator credit, personal note, a hero image)
- A set of item cards (products, experiences, IOUs, cash) the recipient picks from
- Rules that make the page playful (pick 1 of N, locked-until-X, bundles, time gates)
- A morphing visual theme tuned to tone (princess birthday vs. bachelor roast vs. sympathy vs. milestone)

You don't have tools wired yet — for now, just chat naturally and learn about the gift. Tool calls and live page building come next.`;

const client = new Anthropic();

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 });
  }

  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages required' }), { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }), { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const upstream = client.messages.stream({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages,
        });

        for await (const event of upstream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            send({ type: 'text', text: event.delta.text });
          }
        }

        send({ type: 'done' });
      } catch (err: any) {
        send({ type: 'error', message: err?.message ?? 'stream failed' });
      } finally {
        controller.close();
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
