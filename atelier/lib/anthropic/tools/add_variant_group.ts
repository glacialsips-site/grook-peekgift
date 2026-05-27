import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { peeks, variantGroups } from '@/db/schema';
import { registerTool } from './index';

const SelectionSchema = z.enum(['pick_one', 'pick_any', 'pick_all']);

const InputSchema = z
  .object({
    title: z.string().min(1).max(120),
    selection: SelectionSchema,
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

interface Output {
  ok: true;
  variant_group_id: string;
}

registerTool<Input, Output>({
  name: 'add_variant_group',
  description:
    "Create a group of cards the recipient chooses between (pick_one, pick_any, or pick_all). Use whenever you want to offer alternatives — sibling colors of the same shoe, three candle scents, two dinner options. Then pass the returned id to add_card as variant_group_id.",
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: "Group label shown above the cards (e.g. 'Pick your sneaker').",
      },
      selection: {
        type: 'string',
        enum: ['pick_one', 'pick_any', 'pick_all'],
      },
    },
    required: ['title', 'selection'],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);

    const [lastGroup] = await db
      .select({ position: variantGroups.position })
      .from(variantGroups)
      .where(eq(variantGroups.peekId, ctx.peekId))
      .orderBy(desc(variantGroups.position))
      .limit(1);
    const nextPosition = (lastGroup?.position ?? -1) + 1;

    const [row] = await db
      .insert(variantGroups)
      .values({
        peekId: ctx.peekId,
        title: parsed.title,
        selection: parsed.selection,
        position: nextPosition,
      })
      .returning({ id: variantGroups.id });
    if (!row) throw new Error('failed to create variant group');

    await db
      .update(peeks)
      .set({ updatedAt: new Date() })
      .where(eq(peeks.id, ctx.peekId));

    return { ok: true, variant_group_id: row.id };
  },
});
