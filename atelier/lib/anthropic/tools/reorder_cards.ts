import { and, eq, inArray, sql } from 'drizzle-orm';
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
    "Reorder the cards on the page — pass card_ids in the desired sequence (first id = position 0). Use when the curator wants the page sorted differently; include every card you want positioned to avoid stragglers. Always succeeds for ids that belong to this peek.",
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
  deferLoading: true,
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);
    const cardIds = parsed.card_ids.filter((id): id is string => Boolean(id));
    if (cardIds.length === 0) {
      return { ok: true, updated: 0 };
    }

    const updated = await db.transaction(async (tx) => {
      await tx
        .update(cards)
        .set({ position: sql`-(${cards.position} + 1)` })
        .where(
          and(eq(cards.peekId, ctx.peekId), inArray(cards.id, cardIds)),
        );

      let count = 0;
      for (let i = 0; i < cardIds.length; i++) {
        const cardId = cardIds[i]!;
        const result = await tx
          .update(cards)
          .set({ position: i })
          .where(and(eq(cards.id, cardId), eq(cards.peekId, ctx.peekId)))
          .returning({ id: cards.id });
        if (result.length > 0) count++;
      }

      await tx
        .update(peeks)
        .set({ updatedAt: new Date() })
        .where(eq(peeks.id, ctx.peekId));

      return count;
    });

    return { ok: true, updated };
  },
});
