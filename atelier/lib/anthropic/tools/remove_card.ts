import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { cards, peeks } from '@/db/schema';
import { registerTool } from './index';

const InputSchema = z
  .object({
    card_id: z.string().uuid(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

interface Output {
  ok: true;
}

registerTool<Input, Output>({
  name: 'remove_card',
  description:
    "Delete a card from the page by id. Use when the curator wants something off the page; idempotent — removing a missing card still returns ok: true. Prefer update_card when you're refining a card rather than dropping it.",
  input_schema: {
    type: 'object',
    properties: {
      card_id: { type: 'string', description: 'UUID of the card to remove.' },
    },
    required: ['card_id'],
  },
  deferLoading: true,
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);
    await db
      .delete(cards)
      .where(and(eq(cards.id, parsed.card_id), eq(cards.peekId, ctx.peekId)));

    await db
      .update(peeks)
      .set({ updatedAt: new Date() })
      .where(eq(peeks.id, ctx.peekId));

    return { ok: true };
  },
});
