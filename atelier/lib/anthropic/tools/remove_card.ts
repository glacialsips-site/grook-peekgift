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
    'Delete a card from the Peek by id. Idempotent in the sense that removing a card that is no longer there returns ok: true. Always confirm with the curator before deleting cards they explicitly added.',
  input_schema: {
    type: 'object',
    properties: {
      card_id: { type: 'string', description: 'UUID of the card to remove.' },
    },
    required: ['card_id'],
  },
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
