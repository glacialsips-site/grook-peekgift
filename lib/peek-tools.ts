// Tool definitions + implementations that Peek (Claude) uses to mutate the draft as the chat unfolds.
// Each tool has an Anthropic schema and a server-side implementation.

import { q, q1 } from './db';
import { VIBE_PRESETS } from './themes';
import { generateHero, generateOgImage } from './imagegen';
import type { CardType } from './types';

// --- Tool schemas (sent to Anthropic) ---

export const PEEK_TOOLS = [
  {
    name: 'set_recipient',
    description:
      'Save who the peek is for. Call as soon as you know the recipient name, your relationship to them, and the occasion. Idempotent — call again to refine.',
    input_schema: {
      type: 'object',
      properties: {
        recipient_name: { type: 'string', description: 'How the recipient should be addressed on the page.' },
        relationship: { type: 'string', description: 'Curator-to-recipient relation (e.g. "girlfriend", "best friend", "dad").' },
        occasion: { type: 'string', description: 'Why this gift exists (e.g. "30th birthday", "just because", "anniversary").' }
      },
      required: ['recipient_name']
    }
  },
  {
    name: 'set_vibe',
    description:
      'Set the mood/style of the page. Pick a preset OR provide custom palette + tone + mood. Call as soon as you have a sense of the relationship + occasion; you can refine later.',
    input_schema: {
      type: 'object',
      properties: {
        preset: { type: 'string', enum: ['playful', 'romantic', 'dry', 'unhinged', 'tender'] },
        tone: { type: 'string', description: 'Free-text tone descriptor.' },
        palette: {
          type: 'object',
          properties: {
            bg: { type: 'string' }, surface: { type: 'string' },
            ink: { type: 'string' }, accent: { type: 'string' }, accent2: { type: 'string' }
          }
        },
        mood_words: { type: 'array', items: { type: 'string' } }
      }
    }
  },
  {
    name: 'set_hero_image',
    description:
      'Attach the page header image. Pass image_url for a known URL the curator uploaded or pasted. Set source so the recipient view knows what kind of image it is.',
    input_schema: {
      type: 'object',
      properties: {
        image_url: { type: 'string' },
        source: { type: 'string', enum: ['user_upload', 'unsplash', 'ai_generated', 'external'] }
      },
      required: ['image_url']
    }
  },
  {
    name: 'generate_hero_image',
    description:
      'Generate a custom AI illustration for the peek hero from a text prompt. Use when curator wants a custom image but didn\'t supply one. Returns image_url that you then pass to set_hero_image.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Visual prompt — describe scene, palette, mood. Be specific. Avoid generic.' },
        aspect: { type: 'string', enum: ['16:9', '4:3', '1:1', '9:16'], description: 'Aspect ratio.' }
      },
      required: ['prompt']
    }
  },
  {
    name: 'set_note',
    description: 'Set the personal note the recipient sees alongside the cards. Markdown allowed. Keep curator voice — polish only, never rewrite from scratch.',
    input_schema: {
      type: 'object',
      properties: { note_md: { type: 'string' } },
      required: ['note_md']
    }
  },
  {
    name: 'add_card',
    description:
      'Add a single card to the page. For variant bundles call add_variant_group first and pass variant_group_id.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['product', 'activity', 'aspirational', 'digital'] },
        title: { type: 'string' },
        description: { type: 'string' },
        image_url: { type: 'string' },
        source_url: { type: 'string', description: 'Where the curator found this — hidden from recipient.' },
        source_retailer: { type: 'string', description: 'Retailer name — hidden from recipient.' },
        value_cents: { type: 'integer' },
        reveal_value: { type: 'boolean', description: 'If true the recipient sees the value.' },
        variant_group_id: { type: 'string' },
        proposed_date: { type: 'string', description: 'ISO datetime for activity cards.' },
        location_hint: { type: 'string', description: 'Free text location for activity cards.' },
        is_taunt: { type: 'boolean', description: 'Decorative "HA DENIED" card.' },
        taunt_text: { type: 'string' },
        is_locked: { type: 'boolean' },
        unlock_rule: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['beg', 'date_after', 'event'] },
            beg_prompt: { type: 'string' },
            unlock_after: { type: 'string' }
          }
        }
      },
      required: ['type', 'title']
    }
  },
  {
    name: 'add_variant_group',
    description:
      'Create a "pick N of these" bundle. Returns variant_group_id. Then call add_card N times with that id.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        selection: { type: 'string', enum: ['pick_one', 'pick_any', 'pick_all'] }
      },
      required: ['title', 'selection']
    }
  },
  {
    name: 'remove_card',
    description: 'Delete a card by id.',
    input_schema: {
      type: 'object',
      properties: { card_id: { type: 'string' } },
      required: ['card_id']
    }
  },
  {
    name: 'reorder_cards',
    description: 'Set the order of cards on the page. Pass card ids in display order.',
    input_schema: {
      type: 'object',
      properties: { card_ids: { type: 'array', items: { type: 'string' } } },
      required: ['card_ids']
    }
  },
  {
    name: 'scrape_url',
    description:
      'Given a product URL the curator pasted, fetch image / title / price. Returns scraped data — you still call add_card.',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url']
    }
  },
  {
    name: 'mark_ready_for_publish',
    description:
      'Call when the curator says "ready" / "done" / "publish it". Triggers the paywall step in the UI.',
    input_schema: { type: 'object', properties: {} }
  }
] as const;

// --- Implementations ---

export interface ToolContext {
  peek_id: string;
  clerk_user_id: string;
}

export async function runTool(name: string, input: any, ctx: ToolContext): Promise<any> {
  switch (name) {
    case 'set_recipient': {
      const updates: string[] = [];
      const params: any[] = [];
      let i = 1;
      if (input.recipient_name) { updates.push(`recipient_name = $${i++}`); params.push(input.recipient_name); }
      if (input.relationship) { updates.push(`relationship = $${i++}`); params.push(input.relationship); }
      if (input.occasion) { updates.push(`occasion = $${i++}`); params.push(input.occasion); }
      if (!updates.length) return { ok: true };
      params.push(ctx.peek_id);
      await q(`UPDATE peeks SET ${updates.join(', ')} WHERE id = $${i}`, params);
      return { ok: true, applied: input };
    }

    case 'set_vibe': {
      let vibe: any = {};
      if (input.preset && VIBE_PRESETS[input.preset]) vibe = { ...VIBE_PRESETS[input.preset] };
      if (input.tone) vibe.tone = input.tone;
      if (input.palette) vibe.palette = { ...(vibe.palette || {}), ...input.palette };
      if (input.mood_words) vibe.mood_words = input.mood_words;
      await q(`UPDATE peeks SET vibe = $1 WHERE id = $2`, [JSON.stringify(vibe), ctx.peek_id]);
      // Pre-generate OG image in the background for the share screen
      generateOgImage(ctx.peek_id).catch(() => {});
      return { ok: true, vibe };
    }

    case 'set_hero_image': {
      await q(
        `UPDATE peeks SET hero_image_url = $1, hero_image_source = $2 WHERE id = $3`,
        [input.image_url, input.source || 'external', ctx.peek_id]
      );
      generateOgImage(ctx.peek_id).catch(() => {});
      return { ok: true };
    }

    case 'generate_hero_image': {
      const result = await generateHero({
        prompt: input.prompt,
        aspect: input.aspect || '16:9',
        peek_id: ctx.peek_id
      });
      if (!result.ok) return { ok: false, error: result.error || 'gen_failed' };
      await q(
        `UPDATE peeks SET hero_image_url = $1, hero_image_source = 'ai_generated', hero_prompt = $2 WHERE id = $3`,
        [result.url, input.prompt, ctx.peek_id]
      );
      generateOgImage(ctx.peek_id).catch(() => {});
      return { ok: true, image_url: result.url, provider: result.provider };
    }

    case 'set_note': {
      await q(`UPDATE peeks SET note_md = $1 WHERE id = $2`, [input.note_md, ctx.peek_id]);
      return { ok: true };
    }

    case 'add_variant_group': {
      const row = await q1<{ id: string }>(
        `INSERT INTO variant_groups (peek_id, title, selection) VALUES ($1,$2,$3) RETURNING id`,
        [ctx.peek_id, input.title, input.selection]
      );
      return { ok: true, variant_group_id: row.id };
    }

    case 'add_card': {
      const countRow = await q1<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM cards WHERE peek_id = $1`,
        [ctx.peek_id]
      );
      const position = countRow.n;
      const row = await q1<{ id: string }>(
        `INSERT INTO cards
         (peek_id, position, type, title, description, image_url, source_url, source_retailer,
          value_cents, reveal_value, variant_group_id, proposed_date, location_hint,
          is_taunt, taunt_text, is_locked, unlock_rule)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)
         RETURNING id`,
        [
          ctx.peek_id, position, input.type, input.title, input.description ?? null,
          input.image_url ?? null, input.source_url ?? null, input.source_retailer ?? null,
          input.value_cents ?? null, !!input.reveal_value, input.variant_group_id ?? null,
          input.proposed_date ?? null, input.location_hint ?? null,
          !!input.is_taunt, input.taunt_text ?? null, !!input.is_locked,
          JSON.stringify(input.unlock_rule || {})
        ]
      );
      return { ok: true, card_id: row.id };
    }

    case 'remove_card': {
      await q(`DELETE FROM cards WHERE id = $1 AND peek_id = $2`, [input.card_id, ctx.peek_id]);
      return { ok: true };
    }

    case 'reorder_cards': {
      const ids: string[] = input.card_ids || [];
      for (let i = 0; i < ids.length; i++) {
        await q(`UPDATE cards SET position = $1 WHERE id = $2 AND peek_id = $3`, [i, ids[i], ctx.peek_id]);
      }
      return { ok: true };
    }

    case 'scrape_url': {
      const base = process.env.APP_URL || 'http://localhost:3000';
      const res = await fetch(`${base}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input.url })
      });
      if (!res.ok) return { ok: false, error: `scrape failed ${res.status}` };
      return await res.json();
    }

    case 'mark_ready_for_publish': {
      await q(`INSERT INTO events (peek_id, kind, payload) VALUES ($1, 'mark_ready', '{}'::jsonb)`, [ctx.peek_id]);
      return { ok: true, next_step: 'paywall' };
    }

    default:
      return { ok: false, error: `unknown tool: ${name}` };
  }
}
