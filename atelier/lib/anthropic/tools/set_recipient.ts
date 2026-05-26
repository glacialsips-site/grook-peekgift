import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { peeks } from '@/db/schema';
import { registerTool } from './index';

const InputSchema = z
  .object({
    recipient_name: z.string().min(1).max(120),
    relationship: z.string().min(1).max(120).optional(),
    occasion: z.string().min(1).max(120).optional(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

interface Output {
  ok: true;
  recipient_name: string;
  relationship: string | null;
  occasion: string | null;
}

registerTool<Input, Output>({
  name: 'set_recipient',
  description:
    "Set who this Peek is for and the occasion. Idempotent — call again to overwrite. Pass recipient_name (e.g. 'Mom'), and optionally relationship (e.g. 'mother', 'best friend') and occasion (e.g. 'birthday', 'anniversary', 'just because').",
  input_schema: {
    type: 'object',
    properties: {
      recipient_name: {
        type: 'string',
        description: 'How the curator refers to the recipient.',
      },
      relationship: {
        type: 'string',
        description:
          "Curator's relationship to the recipient — mom, partner, friend, etc.",
      },
      occasion: {
        type: 'string',
        description: 'Birthday, anniversary, just because, etc.',
      },
    },
    required: ['recipient_name'],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);
    const [row] = await db
      .update(peeks)
      .set({
        recipientName: parsed.recipient_name,
        relationship: parsed.relationship ?? null,
        occasion: parsed.occasion ?? null,
        updatedAt: new Date(),
      })
      .where(eq(peeks.id, ctx.peekId))
      .returning({
        recipientName: peeks.recipientName,
        relationship: peeks.relationship,
        occasion: peeks.occasion,
      });
    if (!row) throw new Error(`peek ${ctx.peekId} not found`);
    return {
      ok: true,
      recipient_name: row.recipientName ?? parsed.recipient_name,
      relationship: row.relationship,
      occasion: row.occasion,
    };
  },
});
