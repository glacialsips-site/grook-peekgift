import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { events, peeks } from '@/db/schema';
import { generateFalImage, type FalAspect } from '@/lib/image-gen/fal';
import { rehostImage } from '@/lib/image-gen/rehost';
import { scheduleEvolveVibe } from '@/lib/vibe/evolve';
import { checkAllowed } from '@/lib/usage/throttle';
import { recordUsageFireAndForget } from '@/lib/usage/record';
import { registerTool } from './index';

const AspectSchema = z.enum(['16:9', '4:3', '1:1', '9:16']);

const InputSchema = z
  .object({
    prompt: z.string().min(3).max(2000),
    aspect: AspectSchema.optional(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: true; image_url: string }
  | { ok: false; error: string; suggestion?: string };

registerTool<Input, Output>({
  name: 'generate_hero_image',
  description:
    "Generate an image via fal.ai Flux from an evocative prompt, auto-store it, and set it as the page's cover. Use freely — for the cover or for card art (it works for both, just call set_hero_image vs. update_card after). Returns { ok: false } if image gen is offline or rate-limited; in that case ask the curator for an upload or use set_hero_image with a fallback URL.",
  input_schema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'What the hero image should depict and feel like.',
      },
      aspect: {
        type: 'string',
        enum: ['16:9', '4:3', '1:1', '9:16'],
      },
    },
    required: ['prompt'],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);
    const aspect: FalAspect = parsed.aspect ?? '16:9';

    const verdict = await checkAllowed({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      vendor: 'fal',
      kind: 'flux/schnell',
    });
    if (!verdict.allow) {
      return {
        ok: false,
        error: 'tier_limit_reached',
        suggestion: verdict.reason ?? 'Daily compute limit reached. Try again tomorrow or publish a peek to unlock more.',
      };
    }

    const generation = await generateFalImage({
      prompt: parsed.prompt,
      aspect,
    });

    recordUsageFireAndForget({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      peekId: ctx.peekId,
      vendor: 'fal',
      kind: 'fal-ai/flux/schnell',
      payload: {
        aspect,
        ok: generation.ok,
        peek_id: ctx.peekId,
      },
    });
    if (!generation.ok || !generation.imageUrl) {
      return {
        ok: false,
        error: generation.error ?? 'image_gen_unavailable',
        suggestion:
          'Image gen is offline. Ask the user to describe the hero or pick a stock image instead.',
      };
    }

    let rehosted;
    try {
      rehosted = await rehostImage({
        sourceUrl: generation.imageUrl,
        pathPrefix: `hero/${ctx.peekId}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        error: `rehost_failed: ${message}`,
        suggestion:
          'Storage upload failed after image gen. Try again, or skip the hero image for now.',
      };
    }

    const [row] = await db
      .update(peeks)
      .set({
        heroImageUrl: rehosted.publicUrl,
        heroImageSource: 'ai_generated',
        heroPrompt: parsed.prompt,
        updatedAt: new Date(),
      })
      .where(eq(peeks.id, ctx.peekId))
      .returning({ id: peeks.id });
    if (!row) throw new Error(`peek ${ctx.peekId} not found`);

    await db.insert(events).values({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      peekId: ctx.peekId,
      kind: 'hero_image_generated',
      payload: {
        prompt: parsed.prompt,
        aspect,
        storage_path: rehosted.path,
        fal_source_url: generation.imageUrl,
        size_bytes: rehosted.sizeBytes,
        content_type: rehosted.contentType,
      },
    });

    scheduleEvolveVibe(ctx.peekId, { kind: 'hero_image', imageUrl: rehosted.publicUrl });

    return { ok: true, image_url: rehosted.publicUrl };
  },
});
