import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { events, peeks } from '@/db/schema';
import { registerTool } from './index';

const SourceSchema = z.enum([
  'user_upload',
  'unsplash',
  'ai_generated',
  'external',
]);

const InputSchema = z.object({
  image_url: z.string().url(),
  source: SourceSchema,
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  ok: true;
  image_url: string;
  source: z.infer<typeof SourceSchema>;
}

registerTool<Input, Output>({
  name: 'set_hero_image',
  description:
    "Pin a hero image for the Peek. Pass image_url (must be reachable) and source — 'user_upload' for curator-supplied, 'unsplash' for stock, 'ai_generated' if you went through generate_hero_image, 'external' for any other web URL. After setting, palette extraction runs in the background and will call update_vibe with the result.",
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
      kind: 'todo_palette_extract',
      payload: {
        image_url: parsed.image_url,
        source: parsed.source,
        note: 'palette extraction pending implementation in future packet',
      },
    });

    return { ok: true, image_url: parsed.image_url, source: parsed.source };
  },
});
