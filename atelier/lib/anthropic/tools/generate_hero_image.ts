import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { events, peeks } from '@/db/schema';
import { generateFalImage, type FalAspect } from '@/lib/image-gen/fal';
import { rehostImage } from '@/lib/image-gen/rehost';
import { registerTool } from './index';

type VibeSignal = { kind: 'hero_image'; imageUrl: string };
type EvolveVibeFn = (peekId: string, signal: VibeSignal) => Promise<unknown>;

async function tryEvolveVibe(peekId: string, imageUrl: string): Promise<void> {
  try {
    const modulePath = ['@', 'lib', 'vibe', 'evolve'].join('/');
    const mod = (await import(modulePath).catch(() => null)) as
      | { evolveVibe?: EvolveVibeFn }
      | null;
    if (mod?.evolveVibe) {
      await mod.evolveVibe(peekId, { kind: 'hero_image', imageUrl });
    }
  } catch {
    // intentionally swallowed: vibe evolution is best-effort
  }
}

const AspectSchema = z.enum(['16:9', '4:3', '1:1', '9:16']);

const InputSchema = z.object({
  prompt: z.string().min(3).max(2000),
  aspect: AspectSchema.optional(),
});
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: true; image_url: string }
  | { ok: false; error: string; suggestion?: string };

registerTool<Input, Output>({
  name: 'generate_hero_image',
  description:
    "Generate a hero image with fal.ai (Flux). Pass a short, evocative prompt — what the page should look like at a glance — and optionally an aspect ratio (default 16:9). The image is re-hosted to our storage and set as the hero. Returns { ok: true, image_url } on success or { ok: false, error } if image gen is not configured.",
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

    const generation = await generateFalImage({
      prompt: parsed.prompt,
      aspect,
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

    await tryEvolveVibe(ctx.peekId, rehosted.publicUrl);

    return { ok: true, image_url: rehosted.publicUrl };
  },
});
