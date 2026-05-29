import {
  runToolLoop,
  type AnthropicMessage,
  type AnthropicToolDef,
  type ToolLoopEvent,
} from '@/lib/anthropic-edge';
import {
  deleteCard,
  insertCard,
  loadSpineState,
  updatePeek,
} from '@/lib/db-edge';
import type { SpineSseEvent, SpineState } from '@/lib/spine/types';
import type { Vibe } from '@/db/schema/peeks';

export const runtime = 'edge';

const MODEL = 'claude-sonnet-4-6';
const MAX_ITERS = 8;
const MAX_TOKENS = 1024;
const MAX_MESSAGE_LEN = 4000;

const TOOLS: AnthropicToolDef[] = [
  {
    name: 'set_hero',
    description:
      'Set who the peek is for. Use as soon as you learn the recipient or occasion. Any field omitted is left unchanged.',
    input_schema: {
      type: 'object',
      properties: {
        recipientName: { type: 'string' },
        occasion: { type: 'string' },
        giverNames: { type: 'array', items: { type: 'string' } },
        heroImageUrl: { type: 'string' },
      },
    },
  },
  {
    name: 'set_note',
    description: 'Set the personal note (markdown) shown to the recipient.',
    input_schema: {
      type: 'object',
      properties: { noteMd: { type: 'string' } },
      required: ['noteMd'],
    },
  },
  {
    name: 'set_vibe',
    description:
      'Adjust the visual vibe. Only set dials you mean to change. palette colors are hex strings.',
    input_schema: {
      type: 'object',
      properties: {
        mood: { type: 'string', enum: ['minimal', 'rich', 'whimsical', 'editorial'] },
        density: { type: 'string', enum: ['compact', 'cozy', 'breathable'] },
        shape: { type: 'string', enum: ['sharp', 'soft', 'pillowy'] },
        motion: { type: 'string', enum: ['still', 'soft', 'lively'] },
        palette: {
          type: 'object',
          properties: {
            bg: { type: 'string' },
            surface: { type: 'string' },
            ink: { type: 'string' },
            accent: { type: 'string' },
            accent2: { type: 'string' },
          },
        },
      },
    },
  },
  {
    name: 'add_card',
    description:
      'Add one gift idea to the peek. priceCents reveals a price to the recipient when set.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        type: {
          type: 'string',
          enum: ['product', 'activity', 'aspirational', 'digital'],
        },
        priceCents: { type: 'integer' },
        imageUrl: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    name: 'remove_card',
    description: 'Remove a gift card by its id.',
    input_schema: {
      type: 'object',
      properties: { cardId: { type: 'string' } },
      required: ['cardId'],
    },
  },
];

function systemPrompt(state: SpineState): string {
  const cardList =
    state.cards.length === 0
      ? '(none yet)'
      : state.cards
          .map(
            (c) =>
              `- [${c.id}] ${c.title}${c.valueCents ? ` ($${(c.valueCents / 100).toFixed(0)})` : ''}`,
          )
          .join('\n');
  return [
    'You are Peek, a warm, fast gift-page copilot. The curator chats; you build a gift page by calling tools.',
    'Rules:',
    '- MUTATE FIRST, narrate second. Call the tools to change the page, then write one short friendly line.',
    '- Infer aggressively from little input. If they name a person or occasion, set the hero. If they mention things they like, add cards.',
    '- Keep replies to 1-2 sentences. No bullet lists in your replies.',
    '- Never invent a card id; only remove_card with an id from the current page.',
    '',
    'CURRENT PAGE STATE:',
    `recipient: ${state.peek.recipientName ?? '(unset)'}`,
    `occasion: ${state.peek.occasion ?? '(unset)'}`,
    `note: ${state.peek.noteMd ? 'set' : '(unset)'}`,
    `vibe mood: ${state.peek.vibe?.mood ?? 'rich'}`,
    'cards:',
    cardList,
  ].join('\n');
}

function hex(v: unknown): string | undefined {
  return typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : undefined;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'db error';
}

// Execute one curator tool against the DB via the edge db slice, returning a
// compact {ok, summary} the model sees as the tool_result and the UI shows as
// a `tool` SSE event. db-edge accessors throw on DB error; we convert that to
// {ok:false} so a single failed tool never tears down the whole turn.
async function execTool(
  state: SpineState,
  name: string,
  input: Record<string, unknown>,
): Promise<{ ok: boolean; summary: string }> {
  const peekId = state.peek.id;
  switch (name) {
    case 'set_hero': {
      const patch: Record<string, unknown> = {};
      if (typeof input['recipientName'] === 'string')
        patch['recipient_name'] = input['recipientName'];
      if (typeof input['occasion'] === 'string') patch['occasion'] = input['occasion'];
      if (Array.isArray(input['giverNames']))
        patch['giver_names'] = (input['giverNames'] as unknown[]).filter(
          (g): g is string => typeof g === 'string',
        );
      if (typeof input['heroImageUrl'] === 'string') {
        patch['hero_image_url'] = input['heroImageUrl'];
        patch['hero_image_source'] = 'external';
      }
      if (Object.keys(patch).length === 0) return { ok: false, summary: 'nothing to set' };
      try {
        await updatePeek(peekId, patch);
        return { ok: true, summary: 'hero updated' };
      } catch (e) {
        return { ok: false, summary: errMsg(e) };
      }
    }
    case 'set_note': {
      const noteMd = input['noteMd'];
      if (typeof noteMd !== 'string') return { ok: false, summary: 'noteMd required' };
      try {
        await updatePeek(peekId, { note_md: noteMd });
        return { ok: true, summary: 'note set' };
      } catch (e) {
        return { ok: false, summary: errMsg(e) };
      }
    }
    case 'set_vibe': {
      const current: Vibe = state.peek.vibe ?? ({} as Vibe);
      const next: Vibe = { ...current };
      if (typeof input['mood'] === 'string') next.mood = input['mood'] as Vibe['mood'];
      if (typeof input['density'] === 'string')
        next.density = input['density'] as Vibe['density'];
      if (typeof input['shape'] === 'string') next.shape = input['shape'] as Vibe['shape'];
      if (typeof input['motion'] === 'string')
        next.motion = input['motion'] as Vibe['motion'];
      const p = input['palette'];
      if (p && typeof p === 'object') {
        const pal = p as Record<string, unknown>;
        const base = current.palette ?? {
          bg: '#FBF6E9',
          surface: '#F4ECDB',
          ink: '#1B1A3D',
          accent: '#E8A93C',
        };
        next.palette = {
          bg: hex(pal['bg']) ?? base.bg,
          surface: hex(pal['surface']) ?? base.surface,
          ink: hex(pal['ink']) ?? base.ink,
          accent: hex(pal['accent']) ?? base.accent,
          ...(hex(pal['accent2']) ? { accent2: hex(pal['accent2']) } : {}),
        };
      }
      try {
        await updatePeek(peekId, { vibe: next });
        return { ok: true, summary: 'vibe updated' };
      } catch (e) {
        return { ok: false, summary: errMsg(e) };
      }
    }
    case 'add_card': {
      const title = input['title'];
      if (typeof title !== 'string' || title.trim().length === 0)
        return { ok: false, summary: 'title required' };
      const nextPos = state.cards.reduce((m, c) => Math.max(m, c.position), -1) + 1;
      const priceCents =
        typeof input['priceCents'] === 'number' ? Math.round(input['priceCents']) : null;
      const row: Record<string, unknown> = {
        peek_id: peekId,
        position: nextPos,
        type: typeof input['type'] === 'string' ? input['type'] : 'product',
        title: title.trim(),
        description:
          typeof input['description'] === 'string' ? input['description'] : null,
        image_url: typeof input['imageUrl'] === 'string' ? input['imageUrl'] : null,
        value_cents: priceCents,
        reveal_value: priceCents != null,
      };
      try {
        await insertCard(row);
        return { ok: true, summary: `added "${title.trim()}"` };
      } catch (e) {
        return { ok: false, summary: errMsg(e) };
      }
    }
    case 'remove_card': {
      const cardId = input['cardId'];
      if (typeof cardId !== 'string') return { ok: false, summary: 'cardId required' };
      try {
        await deleteCard(cardId, peekId);
        return { ok: true, summary: 'card removed' };
      } catch (e) {
        return { ok: false, summary: errMsg(e) };
      }
    }
    default:
      return { ok: false, summary: `unknown tool ${name}` };
  }
}

export async function POST(req: Request): Promise<Response> {
  let peekId: string;
  let message: string;
  try {
    const body = (await req.json()) as { peekId?: unknown; message?: unknown };
    if (typeof body.peekId !== 'string' || typeof body.message !== 'string') {
      return new Response(JSON.stringify({ error: 'peekId and message required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    peekId = body.peekId;
    message = body.message.slice(0, MAX_MESSAGE_LEN);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const apiKey = process.env['ANTHROPIC_API_KEY'];
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: SpineSseEvent): void =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      // Flush a comment frame immediately so proxies open the stream before the
      // first (latency-heavy) model call — beats the edge header timeout.
      controller.enqueue(encoder.encode(': spine open\n\n'));
      try {
        if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
        const initial = await loadSpineState(peekId);
        if (!initial) throw new Error('peek not found');
        // Pin to SpineState after the guard: the closures below capture `state`,
        // which would otherwise widen back to `SpineState | null`.
        let state: SpineState = initial;

        // Mutate the page, then reload so subsequent tools (card positions,
        // vibe merge) and the next turn's system prompt see current state.
        const dispatch = async (
          name: string,
          input: unknown,
        ): Promise<{ ok: boolean; summary: string }> => {
          const out = await execTool(state, name, input as Record<string, unknown>);
          send({ type: 'tool', name, ok: out.ok, summary: out.summary });
          const refreshed = await loadSpineState(peekId);
          if (refreshed) state = refreshed;
          return out;
        };

        const onEvent = (ev: ToolLoopEvent): void => {
          if (ev.type === 'text') send({ type: 'text', text: ev.text });
          else if (ev.type === 'tool_batch_complete') send({ type: 'state', state });
        };

        const seed: AnthropicMessage[] = [{ role: 'user', content: message }];

        await runToolLoop({
          model: MODEL,
          // Thunk: re-fold the live page state into the prompt every turn.
          system: () => systemPrompt(state),
          messages: seed,
          tools: TOOLS,
          dispatch,
          onEvent,
          maxIters: MAX_ITERS,
          maxTokens: MAX_TOKENS,
        });

        send({ type: 'done' });
      } catch (err) {
        send({
          type: 'error',
          message: err instanceof Error ? err.message : 'unknown error',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
