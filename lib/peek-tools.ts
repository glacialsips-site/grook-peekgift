// Tool definitions + implementations that Peek (Claude) uses to mutate the draft as the chat unfolds.
// Each tool has an Anthropic schema and a server-side implementation.

import { supabaseAdmin } from './supabase';
import { VIBE_PRESETS } from './themes';
import type { CardType } from './types';

// --- Tool schemas (sent to Anthropic) ---

export const PEEK_TOOLS = [
  {
    name: 'set_recipient',
    description:
      'Save who the peek is for. Call as soon as you know the recipient name, your relationship to them, and the occasion. You can call this again later to refine.',
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
      'Set the overall mood/style of the page. Either pick a preset OR provide custom palette + tone. Call this once you have a sense of the relationship + occasion, and recall it if the vibe shifts.',
    input_schema: {
      type: 'object',
      properties: {
        preset: {
          type: 'string',
          enum: ['playful', 'romantic', 'dry', 'unhinged', 'tender'],
          description: 'Pick one of the built-in vibe presets.'
        },
        tone: { type: 'string', description: 'Free-text tone descriptor if not using a preset.' },
        palette: {
          type: 'object',
          properties: {
            bg: { type: 'string' },
            surface: { type: 'string' },
            ink: { type: 'string' },
            accent: { type: 'string' },
            accent2: { type: 'string' }
          },
          required: ['bg', 'surface', 'ink', 'accent']
        },
        mood_words: { type: 'array', items: { type: 'string' } }
      }
    }
  },
  {
    name: 'set_hero_image',
    description:
      'Attach the page header image. Accepts a Supabase Storage URL the user already uploaded, or any public image URL.',
    input_schema: {
      type: 'object',
      properties: {
        image_url: { type: 'string', description: 'Public URL of the hero image.' },
        source: { type: 'string', enum: ['user_upload', 'unsplash', 'ai_generated', 'external'] }
      },
      required: ['image_url']
    }
  },
  {
    name: 'set_note',
    description: 'Set the personal note the recipient sees alongside the cards. Markdown allowed. Keep curator voice — only polish, never rewrite from scratch.',
    input_schema: {
      type: 'object',
      properties: { note_md: { type: 'string' } },
      required: ['note_md']
    }
  },
  {
    name: 'add_card',
    description:
      'Add a single card to the page. For variant bundles (e.g. 4 shirt colors), call add_variant_group first and pass variant_group_id.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['product', 'activity', 'aspirational', 'digital'] },
        title: { type: 'string' },
        description: { type: 'string' },
        image_url: { type: 'string', description: 'Optional. URL to card image.' },
        source_url: { type: 'string', description: 'Optional. Where the curator found this — hidden from recipient.' },
        source_retailer: { type: 'string', description: 'Optional. Retailer name — hidden from recipient.' },
        value_cents: { type: 'integer', description: 'Optional. Approximate value in cents.' },
        reveal_value: { type: 'boolean', description: 'If true the recipient sees the value.' },
        variant_group_id: { type: 'string', description: 'UUID of the variant group this card belongs to (optional).' },
        proposed_date: { type: 'string', description: 'ISO datetime for activity cards.' },
        location_hint: { type: 'string', description: 'Free text location for activity cards.' },
        is_taunt: { type: 'boolean', description: 'Decorative-only "HA, denied" style card.' },
        taunt_text: { type: 'string', description: 'What the card says when recipient tries to pick it.' },
        is_locked: { type: 'boolean', description: 'Recipient must satisfy unlock_rule to pick this.' },
        unlock_rule: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['beg', 'date_after', 'event'] },
            beg_prompt: { type: 'string' },
            unlock_after: { type: 'string', description: 'ISO datetime for date_after.' }
          }
        }
      },
      required: ['type', 'title']
    }
  },
  {
    name: 'add_variant_group',
    description:
      'Create a "pick exactly N of these" bundle. Returns variant_group_id. Then call add_card N times with that id.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'What the bundle is (e.g. "the shirt — which color").' },
        selection: { type: 'string', enum: ['pick_one', 'pick_any', 'pick_all'], description: 'How many they pick.' }
      },
      required: ['title', 'selection']
    }
  },
  {
    name: 'remove_card',
    description: 'Delete a card by id. Use when the curator changes their mind.',
    input_schema: {
      type: 'object',
      properties: { card_id: { type: 'string' } },
      required: ['card_id']
    }
  },
  {
    name: 'scrape_url',
    description:
      'Given a product URL the curator pasted, fetch image / title / approximate price so you can fill in a card. Returns scraped data — you still call add_card to actually add it.',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url']
    }
  },
  {
    name: 'mark_ready_for_publish',
    description:
      'Call when the curator says "ready", "done", "publish it" or similar. Triggers the $12 paywall step in the UI.',
    input_schema: { type: 'object', properties: {} }
  }
] as const;

// --- Implementations ---

interface ToolContext {
  peek_id: string;
  clerk_user_id: string | null;
}

export async function runTool(name: string, input: any, ctx: ToolContext): Promise<any> {
  const db = supabaseAdmin();

  switch (name) {
    case 'set_recipient': {
      const patch: Record<string, any> = {};
      if (input.recipient_name) patch.recipient_name = input.recipient_name;
      if (input.relationship) patch.relationship = input.relationship;
      if (input.occasion) patch.occasion = input.occasion;
      const { error } = await db.from('peeks').update(patch).eq('id', ctx.peek_id);
      if (error) throw error;
      return { ok: true, applied: patch };
    }

    case 'set_vibe': {
      let vibe: any = {};
      if (input.preset && VIBE_PRESETS[input.preset]) vibe = { ...VIBE_PRESETS[input.preset] };
      if (input.tone) vibe.tone = input.tone;
      if (input.palette) vibe.palette = input.palette;
      if (input.mood_words) vibe.mood_words = input.mood_words;
      const { error } = await db.from('peeks').update({ vibe }).eq('id', ctx.peek_id);
      if (error) throw error;
      return { ok: true, vibe };
    }

    case 'set_hero_image': {
      const { error } = await db
        .from('peeks')
        .update({ hero_image_url: input.image_url, hero_image_source: input.source || 'external' })
        .eq('id', ctx.peek_id);
      if (error) throw error;
      return { ok: true };
    }

    case 'set_note': {
      const { error } = await db.from('peeks').update({ note_md: input.note_md }).eq('id', ctx.peek_id);
      if (error) throw error;
      return { ok: true };
    }

    case 'add_variant_group': {
      const { data, error } = await db
        .from('variant_groups')
        .insert({ peek_id: ctx.peek_id, title: input.title, selection: input.selection })
        .select('id, title, selection')
        .single();
      if (error) throw error;
      return { ok: true, variant_group_id: data.id, group: data };
    }

    case 'add_card': {
      // Compute next position
      const { count } = await db.from('cards').select('id', { count: 'exact', head: true }).eq('peek_id', ctx.peek_id);
      const position = count ?? 0;

      const row: Record<string, any> = {
        peek_id: ctx.peek_id,
        position,
        type: input.type as CardType,
        title: input.title,
        description: input.description ?? null,
        image_url: input.image_url ?? null,
        source_url: input.source_url ?? null,
        source_retailer: input.source_retailer ?? null,
        value_cents: input.value_cents ?? null,
        reveal_value: !!input.reveal_value,
        variant_group_id: input.variant_group_id ?? null,
        proposed_date: input.proposed_date ?? null,
        location_hint: input.location_hint ?? null,
        is_taunt: !!input.is_taunt,
        taunt_text: input.taunt_text ?? null,
        is_locked: !!input.is_locked,
        unlock_rule: input.unlock_rule ?? {}
      };
      const { data, error } = await db.from('cards').insert(row).select('id').single();
      if (error) throw error;
      return { ok: true, card_id: data.id };
    }

    case 'remove_card': {
      const { error } = await db.from('cards').delete().eq('id', input.card_id).eq('peek_id', ctx.peek_id);
      if (error) throw error;
      return { ok: true };
    }

    case 'scrape_url': {
      // Delegate to /api/scrape so the same logic is reachable from the client too
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
      await db.from('events').insert({ peek_id: ctx.peek_id, kind: 'mark_ready', payload: {} });
      return { ok: true, next_step: 'paywall' };
    }

    default:
      return { ok: false, error: `unknown tool: ${name}` };
  }
}
