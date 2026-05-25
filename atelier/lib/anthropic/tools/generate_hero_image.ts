import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { events, peeks } from '@/db/schema';
import { env } from '@/lib/env';
import { uploadAsset } from '@/lib/supabase/storage';
import { registerTool } from './index';

const AspectSchema = z.enum(['16:9', '4:3', '1:1', '9:16']);

const InputSchema = z.object({
  prompt: z.string().min(3).max(2000),
  aspect: AspectSchema.optional(),
});
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: true; image_url: string }
  | { ok: false; error: string };

const ASPECT_TO_FAL_SIZE: Record<z.infer<typeof AspectSchema>, string> = {
  '16:9': 'landscape_16_9',
  '4:3': 'landscape_4_3',
  '1:1': 'square_hd',
  '9:16': 'portrait_16_9',
};

interface FalImage {
  url: string;
  content_type?: string;
}

interface FalResponse {
  images?: FalImage[];
}

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
    if (!env.FAL_KEY) {
      return { ok: false, error: 'image_gen_not_configured' };
    }

    const aspect = parsed.aspect ?? '16:9';
    const falResponse = await fetch(
      'https://fal.run/fal-ai/flux/schnell',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${env.FAL_KEY}`,
        },
        body: JSON.stringify({
          prompt: parsed.prompt,
          image_size: ASPECT_TO_FAL_SIZE[aspect],
          num_images: 1,
          enable_safety_checker: true,
        }),
      },
    );

    if (!falResponse.ok) {
      const detail = await falResponse.text().catch(() => '');
      return {
        ok: false,
        error: `fal_request_failed: ${falResponse.status} ${detail.slice(0, 200)}`,
      };
    }

    const body = (await falResponse.json()) as FalResponse;
    const first = body.images?.[0];
    if (!first?.url) {
      return { ok: false, error: 'fal_no_image_returned' };
    }

    const assetResponse = await fetch(first.url);
    if (!assetResponse.ok) {
      return {
        ok: false,
        error: `fal_asset_fetch_failed: ${assetResponse.status}`,
      };
    }
    const buffer = Buffer.from(await assetResponse.arrayBuffer());
    const contentType = first.content_type ?? 'image/jpeg';
    const uploaded = await uploadAsset({
      data: buffer,
      contentType,
    });

    const [row] = await db
      .update(peeks)
      .set({
        heroImageUrl: uploaded.publicUrl,
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
        storage_path: uploaded.path,
        fal_source_url: first.url,
      },
    });

    return { ok: true, image_url: uploaded.publicUrl };
  },
});
