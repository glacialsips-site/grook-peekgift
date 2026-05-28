import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { events, peeks } from '@/db/schema';
import { scheduleEvolveVibe } from '@/lib/vibe/evolve';
import { registerTool } from './index';

const SourceSchema = z.enum([
  'user_upload',
  'unsplash',
  'ai_generated',
  'external',
]);

const InputSchema = z
  .object({
    image_url: z.string().url(),
    source: SourceSchema,
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

interface Output {
  ok: true;
  image_url: string;
  source: z.infer<typeof SourceSchema>;
}

registerTool<Input, Output>({
  name: 'set_hero_image',
  description:
    "Set the page's cover image from a reachable URL with a source label (user_upload | unsplash | ai_generated | external). Use for uploads or any URL you already have; pair with generate_hero_image when you want one made from scratch. Palette extraction runs in the background and feeds update_vibe automatically.",
  input_schema: {
    type: 'object',
    properties: {
      image_url: {
        type: 'string',
        description: 'Absolute https URL of the hero image.',
      },
      source: {
        type: 'string',
        enum: ['user_upload', 'unsplash', 'ai_generated', 'external'],
      },
    },
    required: ['image_url', 'source'],
  },
  deferLoading: true,
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);
    const [row] = await db
      .update(peeks)
      .set({
        heroImageUrl: parsed.image_url,
        heroImageSource: parsed.source,
        updatedAt: new Date(),
      })
      .where(eq(peeks.id, ctx.peekId))
      .returning({ id: peeks.id });
    if (!row) throw new Error(`peek ${ctx.peekId} not found`);

    await db.insert(events).values({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      peekId: ctx.peekId,
      kind: 'palette_extract_scheduled',
      payload: {
        image_url: parsed.image_url,
        source: parsed.source,
      },
    });

    scheduleEvolveVibe(ctx.peekId, {
      kind: 'hero_image',
      imageUrl: parsed.image_url,
    });

    return { ok: true, image_url: parsed.image_url, source: parsed.source };
  },
});
