import { eq, sql } from 'drizzle-orm';
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
    "Create a group of cards the recipient chooses between. selection='pick_one' means exactly one card in the group can be picked (later picks within the group swap out the prior pick — picking a sibling automatically un-picks the others). selection='pick_any' lets the recipient pick zero or more independently. selection='pick_all' bundles the group — picking any card in the group auto-picks the others (and un-picking removes them all). Use whenever you want sibling alternatives (colors, sizes, dinner options) or a bundle that must move together. Pass the returned id to add_card as variant_group_id.",
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
        description:
          "pick_one = exactly one (swap on new pick); pick_any = independent; pick_all = bundle moves together.",
      },
    },
    required: ['title', 'selection'],
  },
  deferLoading: true,
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);

    const [row] = await db
      .insert(variantGroups)
      .values({
        peekId: ctx.peekId,
        title: parsed.title,
        selection: parsed.selection,
        position: sql`(SELECT COALESCE(MAX(${variantGroups.position}), -1) + 1 FROM ${variantGroups} WHERE ${variantGroups.peekId} = ${ctx.peekId})`,
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
