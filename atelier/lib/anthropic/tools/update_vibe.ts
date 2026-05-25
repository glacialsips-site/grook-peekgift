import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { peeks, type Vibe } from '@/db/schema';
import { registerTool } from './index';
import { VibeInputSchema, type StoredVibe } from './set_vibe';

type Input = import('zod').infer<typeof VibeInputSchema>;

interface Output {
  ok: true;
  vibe: StoredVibe;
}

registerTool<Input, Output>({
  name: 'update_vibe',
  description:
    'MERGE partial vibe updates into the existing vibe — provided fields overwrite, absent fields are preserved. Use this continuously as new signals arrive: hero image came back in cool blues -> update palette.accent; cards skewed playful -> bump motion to lively; recipient note was unexpectedly tender -> soften tone. Never re-sends fields you do not want to change.',
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
    },
    required: [],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = VibeInputSchema.parse(input);
    const [existing] = await db
      .select({ vibe: peeks.vibe })
      .from(peeks)
      .where(eq(peeks.id, ctx.peekId))
      .limit(1);
    if (!existing) throw new Error(`peek ${ctx.peekId} not found`);

    const current = (existing.vibe ?? {}) as unknown as StoredVibe;
    const next: StoredVibe = {
      ...current,
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
    };

    await db
      .update(peeks)
      .set({
        vibe: next,
        updatedAt: new Date(),
      })
      .where(eq(peeks.id, ctx.peekId));
    return { ok: true, vibe: next };
  },
});
