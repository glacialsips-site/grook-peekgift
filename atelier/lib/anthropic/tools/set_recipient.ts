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
    giver_names: z.array(z.string().min(1).max(120)).max(20).optional(),
    budget_cents: z.number().int().nonnegative().max(100_000_000).optional(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

interface Output {
  ok: true;
  recipient_name: string;
  relationship: string | null;
  occasion: string | null;
  giver_names: string[];
  budget_cents: number | null;
}

registerTool<Input, Output>({
  name: 'set_recipient',
  description:
    "Set who this Peek is for and the occasion. Idempotent — call again to overwrite. Pass recipient_name (e.g. 'Mom'), and optionally relationship (e.g. 'mother', 'best friend'), occasion (e.g. 'birthday', 'anniversary', 'just because'), giver_names (array — capture every named giver so the cover can say 'from Mom & Dad' or 'from the Henderson clan'), and budget_cents (integer dollars*100; capture as soon as the curator mentions a number, even loosely — 'around $200' -> 20000).",
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
      giver_names: {
        type: 'array',
        items: { type: 'string' },
        description:
          "Who the gift is FROM — array because group gifts are common (['Mom', 'Dad']) or named groups ('the Henderson clan'). Capture eagerly.",
      },
      budget_cents: {
        type: 'integer',
        description:
          'Total intended spend in cents (USD). Pass when the curator names any number, even soft — "$200ish" -> 20000.',
      },
    },
    required: ['recipient_name'],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);
    const update: Record<string, unknown> = {
      recipientName: parsed.recipient_name,
      relationship: parsed.relationship ?? null,
      occasion: parsed.occasion ?? null,
      updatedAt: new Date(),
    };
    if (parsed.giver_names !== undefined) {
      update['giverNames'] = parsed.giver_names;
    }
    if (parsed.budget_cents !== undefined) {
      update['budgetCents'] = parsed.budget_cents;
    }
    const [row] = await db
      .update(peeks)
      .set(update)
      .where(eq(peeks.id, ctx.peekId))
      .returning({
        recipientName: peeks.recipientName,
        relationship: peeks.relationship,
        occasion: peeks.occasion,
        giverNames: peeks.giverNames,
        budgetCents: peeks.budgetCents,
      });
    if (!row) throw new Error(`peek ${ctx.peekId} not found`);
    return {
      ok: true,
      recipient_name: row.recipientName ?? parsed.recipient_name,
      relationship: row.relationship,
      occasion: row.occasion,
      giver_names: row.giverNames ?? [],
      budget_cents: row.budgetCents,
    };
  },
});
