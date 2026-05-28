import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import {
  peeks,
  type Vibe,
  type VibeCore,
  type VibeSignalSource,
  type VibeSignalSourceEntry,
} from '@/db/schema';
import { trackFireAndForget } from '@/lib/analytics/facade';
import { registerTool } from './index';
import { VibeInputSchema } from './set_vibe';

const SignalSourceSchema = z.enum([
  'curator',
  'hero_palette',
  'tone_classifier',
  'card_mix',
]);

export const UpdateVibeInputSchema = VibeInputSchema.extend({
  signal_source: SignalSourceSchema.optional(),
}).strict();

type Input = z.infer<typeof UpdateVibeInputSchema>;

interface Output {
  ok: true;
  vibe: Vibe;
}

const HISTORY_LIMIT = 10;

registerTool<Input, Output>({
  name: 'update_vibe',
  description:
    "MERGE partial vibe updates into the existing vibe — provided fields overwrite, absent fields are preserved. Use continuously as signals arrive (palette extraction, new card mix, tone shift, voice refinement). signal_source defaults to 'curator' — only override when relaying an upstream auto-classifier.",
  input_schema: {
    type: 'object',
    properties: {
      preset: {
        type: 'string',
        enum: ['playful', 'romantic', 'dry', 'unhinged', 'tender'],
      },
      tone: { type: 'string' },
      palette: {
        type: 'object',
        properties: {
          bg: { type: 'string' },
          surface: { type: 'string' },
          ink: { type: 'string' },
          accent: { type: 'string' },
          accent2: { type: 'string' },
        },
        required: ['bg', 'surface', 'ink', 'accent'],
      },
      mood_words: {
        type: 'array',
        items: { type: 'string' },
      },
      motion: {
        type: 'string',
        enum: ['still', 'soft', 'lively'],
      },
      font_pairing: {
        type: 'object',
        properties: {
          display: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['display', 'body'],
      },
      typography: {
        type: 'object',
        properties: {
          heading: {
            type: 'string',
            enum: ['serif', 'display', 'sans', 'mono', 'script'],
          },
          body: {
            type: 'string',
            enum: ['sans', 'serif', 'mono'],
          },
        },
        required: ['heading', 'body'],
      },
      density: {
        type: 'string',
        enum: ['compact', 'cozy', 'breathable'],
      },
      shape: {
        type: 'string',
        enum: ['sharp', 'soft', 'pillowy'],
      },
      mood: {
        type: 'string',
        enum: ['minimal', 'rich', 'whimsical', 'editorial'],
      },
      voice: {
        type: 'object',
        description:
          "How YOU (Peek) talk to the curator. Refine when new signals arrive — curator mirrors back in slangy register, occasion turns out to be a memorial not a birthday, recipient is a kid, etc. All sub-fields optional.",
        properties: {
          warmth: {
            type: 'string',
            enum: ['restrained', 'measured', 'warm', 'effusive'],
          },
          humor: {
            type: 'string',
            enum: ['none', 'gentle', 'dry', 'sharp'],
          },
          pace: {
            type: 'string',
            enum: ['considered', 'natural', 'quick'],
          },
          formality: {
            type: 'string',
            enum: ['casual', 'neutral', 'formal'],
          },
          emoji: {
            type: 'string',
            enum: ['none', 'rare', 'occasional', 'playful'],
          },
          vocabulary: {
            type: 'string',
            enum: ['slangy', 'neutral', 'elevated'],
          },
          length: {
            type: 'string',
            enum: ['punchy', 'natural', 'fuller'],
          },
        },
      },
      signal_source: {
        type: 'string',
        enum: ['curator', 'hero_palette', 'tone_classifier', 'card_mix'],
      },
    },
    required: [],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = UpdateVibeInputSchema.parse(input);
    const [existing] = await db
      .select({ vibe: peeks.vibe })
      .from(peeks)
      .where(eq(peeks.id, ctx.peekId))
      .limit(1);
    if (!existing) throw new Error(`peek ${ctx.peekId} not found`);

    const current: Vibe = existing.vibe ?? {};
    const patch: Partial<VibeCore> = {
      ...(parsed.preset !== undefined ? { preset: parsed.preset } : {}),
      ...(parsed.tone !== undefined ? { tone: parsed.tone } : {}),
      ...(parsed.palette !== undefined ? { palette: parsed.palette } : {}),
      ...(parsed.mood_words !== undefined
        ? { mood_words: parsed.mood_words }
        : {}),
      ...(parsed.motion !== undefined ? { motion: parsed.motion } : {}),
      ...(parsed.font_pairing !== undefined
        ? { font_pairing: parsed.font_pairing }
        : {}),
      ...(parsed.typography !== undefined
        ? { typography: parsed.typography }
        : {}),
      ...(parsed.density !== undefined ? { density: parsed.density } : {}),
      ...(parsed.shape !== undefined ? { shape: parsed.shape } : {}),
      ...(parsed.mood !== undefined ? { mood: parsed.mood } : {}),
      ...(parsed.voice !== undefined
        ? { voice: { ...(current.voice ?? {}), ...parsed.voice } }
        : {}),
    };

    const source: VibeSignalSource = parsed.signal_source ?? 'curator';
    const history = current.signal_source_history ?? [];
    const nextHistory: VibeSignalSourceEntry[] =
      Object.keys(patch).length > 0
        ? [
            ...history,
            { source, ts: new Date().toISOString(), patch },
          ].slice(-HISTORY_LIMIT)
        : history;

    const next: Vibe = {
      ...current,
      ...patch,
      signal_source_history: nextHistory,
    };

    await db
      .update(peeks)
      .set({
        vibe: next,
        updatedAt: new Date(),
      })
      .where(eq(peeks.id, ctx.peekId));

    trackFireAndForget({
      name: 'vibe_evolved',
      peekId: ctx.peekId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      payload: {
        source: 'update_vibe',
        patch: { ...parsed },
      },
    });

    return { ok: true, vibe: next };
  },
});
