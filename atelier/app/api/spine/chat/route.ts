import { createClient } from '@supabase/supabase-js';
import {
  CARD_COLUMNS,
  PEEK_COLUMNS,
  rowsToState,
} from '@/lib/spine/wire';
import type { SpineSseEvent, SpineState } from '@/lib/spine/types';
import type { Vibe } from '@/db/schema/peeks';

export const runtime = 'edge';

const MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_ITERS = 8;
const MAX_TOKENS = 1024;
const MAX_MESSAGE_LEN = 4000;

type AnthropicBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown };

type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string | AnthropicBlock[] | ToolResultBlock[];
};

type ToolResultBlock = {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
};

const TOOLS = [
  {
    name: 'set_hero',
    description:
      'Set who the peek is for. Use as soon as you learn the recipient or occasion. Any field omitted is left unchanged.',
    input_schema: {
      type: 'object' as const,
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
      type: 'object' as const,
      properties: { noteMd: { type: 'string' } },
      required: ['noteMd'],
    },
  },
  {
    name: 'set_vibe',
    description:
      'Adjust the visual vibe. Only set dials you mean to change. palette colors are hex strings.',
    input_schema: {
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
      properties: { cardId: { type: 'string' } },
      required: ['cardId'],
    },
  },
];

function sb() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) throw new Error('supabase_env_missing');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'peek_v2' },
  });
}

type SB = ReturnType<typeof sb>;

async function loadState(
  client: SB,
  peekId: string,
): Promise<SpineState | null> {
  const [peekRes, cardsRes] = await Promise.all([
    client.from('peeks').select(PEEK_COLUMNS).eq('id', peekId).maybeSingle(),
    client.from('cards').select(CARD_COLUMNS).eq('peek_id', peekId),
  ]);
  if (peekRes.error || !peekRes.data) return null;
  return rowsToState(peekRes.data, cardsRes.data ?? []);
}

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

async function execTool(
  client: SB,
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
      const { error } = await client.from('peeks').update(patch).eq('id', peekId);
      return error
        ? { ok: false, summary: error.message }
        : { ok: true, summary: 'hero updated' };
    }
    case 'set_note': {
      const noteMd = input['noteMd'];
      if (typeof noteMd !== 'string') return { ok: false, summary: 'noteMd required' };
      const { error } = await client
        .from('peeks')
        .update({ note_md: noteMd })
        .eq('id', peekId);
      return error
        ? { ok: false, summary: error.message }
        : { ok: true, summary: 'note set' };
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
      const { error } = await client
        .from('peeks')
        .update({ vibe: next })
        .eq('id', peekId);
      return error
        ? { ok: false, summary: error.message }
        : { ok: true, summary: 'vibe updated' };
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
      const { error } = await client.from('cards').insert(row);
      return error
        ? { ok: false, summary: error.message }
        : { ok: true, summary: `added "${title.trim()}"` };
    }
    case 'remove_card': {
      const cardId = input['cardId'];
      if (typeof cardId !== 'string') return { ok: false, summary: 'cardId required' };
      const { error } = await client
        .from('cards')
        .delete()
        .eq('id', cardId)
        .eq('peek_id', peekId);
      return error
        ? { ok: false, summary: error.message }
        : { ok: true, summary: 'card removed' };
    }
    default:
      return { ok: false, summary: `unknown tool ${name}` };
  }
}

async function modelTurn(
  apiKey: string,
  messages: AnthropicMessage[],
  system: string,
  onText: (t: string) => void,
): Promise<{ blocks: AnthropicBlock[]; stopReason: string | null }> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages,
      tools: TOOLS,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(`anthropic_${res.status}: ${detail.slice(0, 200)}`);
  }

  const blocks: AnthropicBlock[] = [];
  const partials = new Map<number, string>();
  let stopReason: string | null = null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    for (const chunk of chunks) {
      const dataLine = chunk
        .split('\n')
        .find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      const json = dataLine.slice('data:'.length).trim();
      if (!json || json === '[DONE]') continue;
      let ev: Record<string, unknown>;
      try {
        ev = JSON.parse(json) as Record<string, unknown>;
      } catch {
        continue;
      }
      const t = ev['type'];
      if (t === 'content_block_start') {
        const idx = ev['index'] as number;
        const cb = ev['content_block'] as Record<string, unknown>;
        if (cb['type'] === 'text') {
          blocks[idx] = { type: 'text', text: '' };
        } else if (cb['type'] === 'tool_use') {
          blocks[idx] = {
            type: 'tool_use',
            id: cb['id'] as string,
            name: cb['name'] as string,
            input: {},
          };
          partials.set(idx, '');
        }
      } else if (t === 'content_block_delta') {
        const idx = ev['index'] as number;
        const delta = ev['delta'] as Record<string, unknown>;
        if (delta['type'] === 'text_delta') {
          const text = delta['text'] as string;
          const b = blocks[idx];
          if (b && b.type === 'text') b.text += text;
          onText(text);
        } else if (delta['type'] === 'input_json_delta') {
          partials.set(idx, (partials.get(idx) ?? '') + (delta['partial_json'] as string));
        }
      } else if (t === 'content_block_stop') {
        const idx = ev['index'] as number;
        const b = blocks[idx];
        if (b && b.type === 'tool_use') {
          const raw = partials.get(idx) ?? '';
          try {
            b.input = raw ? JSON.parse(raw) : {};
          } catch {
            b.input = {};
          }
        }
      } else if (t === 'message_delta') {
        const delta = ev['delta'] as Record<string, unknown>;
        if (typeof delta['stop_reason'] === 'string')
          stopReason = delta['stop_reason'];
      }
    }
  }

  return { blocks: blocks.filter(Boolean), stopReason };
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
      const send = (ev: SpineSseEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      controller.enqueue(encoder.encode(': spine open\n\n'));
      try {
        if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
        const client = sb();
        let state = await loadState(client, peekId);
        if (!state) throw new Error('peek not found');

        const messages: AnthropicMessage[] = [{ role: 'user', content: message }];

        for (let iter = 0; iter < MAX_ITERS; iter++) {
          const { blocks, stopReason } = await modelTurn(
            apiKey,
            messages,
            systemPrompt(state),
            (t) => send({ type: 'text', text: t }),
          );

          messages.push({ role: 'assistant', content: blocks });

          const toolUses = blocks.filter(
            (b): b is Extract<AnthropicBlock, { type: 'tool_use' }> =>
              b.type === 'tool_use',
          );
          if (stopReason !== 'tool_use' || toolUses.length === 0) break;

          const results: ToolResultBlock[] = [];
          for (const tu of toolUses) {
            const out = await execTool(
              client,
              state,
              tu.name,
              (tu.input ?? {}) as Record<string, unknown>,
            );
            send({ type: 'tool', name: tu.name, ok: out.ok, summary: out.summary });
            results.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              content: JSON.stringify(out),
            });
            const refreshed = await loadState(client, peekId);
            if (refreshed) state = refreshed;
          }

          send({ type: 'state', state });
          messages.push({ role: 'user', content: results });
        }

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
