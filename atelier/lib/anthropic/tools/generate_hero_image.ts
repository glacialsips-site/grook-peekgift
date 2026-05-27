import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { events, peeks } from '@/db/schema';
import { generateFalImage, type FalAspect } from '@/lib/image-gen/fal';
import { buildHeroPrompt } from '@/lib/image-gen/prompt';
import { rehostImage } from '@/lib/image-gen/rehost';
import { scheduleEvolveVibe } from '@/lib/vibe/evolve';
import { checkAllowed } from '@/lib/usage/throttle';
import { recordUsageFireAndForget } from '@/lib/usage/record';
import { logger } from '@/lib/logger';
import { registerTool } from './index';

const log = logger.child({ component: 'tool/generate_hero_image' });

const AspectSchema = z.enum(['16:9', '4:3', '1:1', '9:16']);

const InputSchema = z
  .object({
    prompt: z.string().min(3).max(2000),
    aspect: AspectSchema.optional(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | {
      ok: true;
      image_url: string | null;
      fallback_suggestion?: string;
    }
  | { ok: false; error: string; suggestion?: string };

registerTool<Input, Output>({
  name: 'generate_hero_image',
  description:
    "Generate an image via fal.ai Flux from an evocative prompt and set it as the page's cover. The server enriches your prompt with the peek's vibe palette, mood, recipient context, and occasion — keep your prompt focused on subject and feel, not styling boilerplate. If fal is offline we return { ok: true, image_url: null } with a fallback_suggestion — when that happens, ask the curator to upload a hero (set_hero_image with source='user_upload') or use update_card to lean on card art instead of a hero. The image URL is set immediately from the fal CDN, then re-hosted to durable Supabase Storage in the background — callers don't need to wait. Never leaves the page with no path forward.",
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
        ok: true,
        image_url: null,
        fallback_suggestion:
          verdict.reason ??
          "Daily image-gen limit reached. Ask the curator to upload a hero (set_hero_image, source='user_upload') or skip the hero and lean on card art via update_card.",
      };
    }

    const [peekRow] = await db
      .select({
        recipientName: peeks.recipientName,
        relationship: peeks.relationship,
        occasion: peeks.occasion,
        vibe: peeks.vibe,
        recipientProfile: peeks.recipientProfile,
        metadata: peeks.metadata,
      })
      .from(peeks)
      .where(eq(peeks.id, ctx.peekId))
      .limit(1);
    if (!peekRow) throw new Error(`peek ${ctx.peekId} not found`);

    const built = buildHeroPrompt(parsed.prompt, {
      recipientName: peekRow.recipientName,
      relationship: peekRow.relationship,
      occasion: peekRow.occasion,
      vibe: peekRow.vibe,
      recipientProfile: peekRow.recipientProfile,
    });

    const generation = await generateFalImage({
      prompt: built.prompt,
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

    const nextMetadata: Record<string, unknown> = {
      ...(peekRow.metadata ?? {}),
      last_hero_prompt: {
        base: built.parts.base,
        composed: built.prompt,
        palette: built.parts.palette,
        mood: built.parts.mood ?? null,
        occasion: built.parts.occasion ?? null,
        recipient_descriptor: built.parts.recipientDescriptor,
        aspect,
        ok: generation.ok,
        ts: new Date().toISOString(),
      },
    };

    if (!generation.ok || !generation.imageUrl) {
      await db
        .update(peeks)
        .set({ metadata: nextMetadata, updatedAt: new Date() })
        .where(eq(peeks.id, ctx.peekId));
      return {
        ok: true,
        image_url: null,
        fallback_suggestion:
          "Image gen is offline right now. Ask the curator to upload a hero (set_hero_image with source='user_upload') or skip the hero entirely and let the card art carry the page via update_card.",
      };
    }

    const falUrl = generation.imageUrl;

    const [row] = await db
      .update(peeks)
      .set({
        heroImageUrl: falUrl,
        heroImageSource: 'ai_generated',
        heroPrompt: built.prompt,
        metadata: nextMetadata,
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
        prompt: built.prompt,
        base_prompt: built.parts.base,
        palette: built.parts.palette,
        mood: built.parts.mood ?? null,
        occasion: built.parts.occasion ?? null,
        aspect,
        fal_source_url: falUrl,
      },
    });

    scheduleEvolveVibe(ctx.peekId, { kind: 'hero_image', imageUrl: falUrl });

    scheduleRehost({
      peekId: ctx.peekId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      falUrl,
    });

    return { ok: true, image_url: falUrl };
  },
});

interface RehostJob {
  peekId: string;
  userId: string | null;
  sessionId: string;
  falUrl: string;
}

function scheduleRehost(job: RehostJob): void {
  void runRehost(job).catch((err) => {
    log.warn('rehost_unhandled', {
      peekId: job.peekId,
      err: err instanceof Error ? err.message : String(err),
    });
  });
}

async function runRehost(job: RehostJob): Promise<void> {
  let rehosted;
  try {
    rehosted = await rehostImage({
      sourceUrl: job.falUrl,
      pathPrefix: `hero/${job.peekId}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn('rehost_failed_keeping_fal_url', {
      peekId: job.peekId,
      err: message,
    });
    await db
      .insert(events)
      .values({
        userId: job.userId,
        sessionId: job.sessionId,
        peekId: job.peekId,
        kind: 'hero_image_rehost_failed',
        payload: { fal_source_url: job.falUrl, error: message },
      })
      .catch(() => undefined);
    return;
  }

  const [current] = await db
    .select({ heroImageUrl: peeks.heroImageUrl })
    .from(peeks)
    .where(eq(peeks.id, job.peekId))
    .limit(1);
  if (!current) return;
  if (current.heroImageUrl !== job.falUrl) {
    return;
  }

  await db
    .update(peeks)
    .set({ heroImageUrl: rehosted.publicUrl, updatedAt: new Date() })
    .where(eq(peeks.id, job.peekId));

  await db
    .insert(events)
    .values({
      userId: job.userId,
      sessionId: job.sessionId,
      peekId: job.peekId,
      kind: 'hero_image_rehosted',
      payload: {
        fal_source_url: job.falUrl,
        storage_path: rehosted.path,
        public_url: rehosted.publicUrl,
        size_bytes: rehosted.sizeBytes,
        content_type: rehosted.contentType,
      },
    })
    .catch(() => undefined);
}
