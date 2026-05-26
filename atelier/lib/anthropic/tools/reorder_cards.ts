import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { cards, peeks } from '@/db/schema';
import { registerTool } from './index';

const InputSchema = z
  .object({
    card_ids: z.array(z.string().uuid()).min(1).max(200),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

interface Output {
  ok: true;
  updated: number;
}

registerTool<Input, Output>({
  name: 'reorder_cards',
  description:
    "Set the display order of cards in the Peek. Pass card_ids in the desired sequence — the first id becomes position 0, the second position 1, etc. Cards not included in the array keep their existing position (but will likely end up out of order — pass every card you want sorted).",
  input_schema: {
    type: 'object',
    properties: {
      card_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Card UUIDs in the desired display order.',
      },
    },
    required: ['card_ids'],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);
    let updated = 0;
    for (let i = 0; i < parsed.card_ids.length; i++) {
      const cardId = parsed.card_ids[i];
      if (!cardId) continue;
      const result = await db
        .update(cards)
        .set({ position: i })
        .where(and(eq(cards.id, cardId), eq(cards.peekId, ctx.peekId)))
        .returning({ id: cards.id });
      if (result.length > 0) updated++;
    }
    await db
      .update(peeks)
      .set({ updatedAt: new Date() })
      .where(eq(peeks.id, ctx.peekId));
    return { ok: true, updated };
  },
});
