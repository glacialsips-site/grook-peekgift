import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { peeks, type RecipientProfile } from '@/db/schema';
import { registerTool } from './index';

const InputSchema = z
  .object({
    favorite_things: z.array(z.string().min(1).max(200)).max(50).optional(),
    current_obsessions: z.array(z.string().min(1).max(200)).max(50).optional(),
    allergies_or_no_gos: z.array(z.string().min(1).max(200)).max(50).optional(),
    sizes: z.record(z.string().min(1).max(40), z.string().min(1).max(40)).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

interface Output {
  ok: true;
  recipient_profile: RecipientProfile;
}

registerTool<Input, Output>({
  name: 'set_recipient_profile',
  description:
    "Curator-only scratchpad about the recipient (favorite_things, current_obsessions, allergies_or_no_gos, sizes, notes) — hidden from the recipient. Use eagerly as facts surface in chat; steer card picks against it but never echo it back verbatim. Merge semantics: provided keys overwrite, absent keys are preserved.",
  input_schema: {
    type: 'object',
    properties: {
      favorite_things: {
        type: 'array',
        items: { type: 'string' },
        description: 'Durable likes — things the recipient consistently loves.',
      },
      current_obsessions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Right-now obsessions — shows, fads, hobbies of the moment.',
      },
      allergies_or_no_gos: {
        type: 'array',
        items: { type: 'string' },
        description:
          "Things to avoid — allergies, ex's name, kinds of gifts they reject.",
      },
      sizes: {
        type: 'object',
        description: "Sizing info as a free-form map, e.g. {shirt: 'M', ring: '7'}.",
        additionalProperties: { type: 'string' },
      },
      notes: {
        type: 'string',
        description: "Free-form details that don't fit elsewhere.",
      },
    },
    required: [],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);

    const [existing] = await db
      .select({ profile: peeks.recipientProfile })
      .from(peeks)
      .where(eq(peeks.id, ctx.peekId))
      .limit(1);
    if (!existing) throw new Error(`peek ${ctx.peekId} not found`);

    const current: RecipientProfile = existing.profile ?? {};

    const next: RecipientProfile = { ...current };
    if (parsed.favorite_things !== undefined) {
      next.favorite_things = parsed.favorite_things;
    }
    if (parsed.current_obsessions !== undefined) {
      next.current_obsessions = parsed.current_obsessions;
    }
    if (parsed.allergies_or_no_gos !== undefined) {
      next.allergies_or_no_gos = parsed.allergies_or_no_gos;
    }
    if (parsed.sizes !== undefined) {
      next.sizes = { ...(current.sizes ?? {}), ...parsed.sizes };
    }
    if (parsed.notes !== undefined) {
      next.notes = parsed.notes;
    }

    await db
      .update(peeks)
      .set({ recipientProfile: next, updatedAt: new Date() })
      .where(eq(peeks.id, ctx.peekId));

    return { ok: true, recipient_profile: next };
  },
});
