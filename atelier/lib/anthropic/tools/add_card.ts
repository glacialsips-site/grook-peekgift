import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { cards, peeks, type UnlockRule } from '@/db/schema';
import { registerTool } from './index';

const CardTypeSchema = z.enum([
  'product',
  'activity',
  'aspirational',
  'digital',
]);

const UnlockRuleSchema = z.object({
  kind: z.enum(['beg', 'date_after', 'event']),
  beg_prompt: z.string().min(1).max(280).optional(),
  unlock_after: z.string().min(1).max(64).optional(),
});

const InputSchema = z.object({
  type: CardTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  image_url: z.string().url().optional(),
  source_url: z.string().url().optional(),
  source_retailer: z.string().max(120).optional(),
  value_cents: z.number().int().nonnegative().optional(),
  reveal_value: z.boolean().optional(),
  variant_group_id: z.string().uuid().optional(),
  proposed_date: z.string().datetime().optional(),
  location_hint: z.string().max(280).optional(),
  is_taunt: z.boolean().optional(),
  taunt_text: z.string().max(280).optional(),
  is_locked: z.boolean().optional(),
  unlock_rule: UnlockRuleSchema.optional(),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  ok: true;
  card_id: string;
  position: number;
}

registerTool<Input, Output>({
  name: 'add_card',
  description:
    "Add a card to the Peek. Required: type ('product'|'activity'|'aspirational'|'digital') and title. Everything else is optional but the richer the better — image_url, description, value_cents (for big-reveals), source_url (we'll affiliate-wrap it later), variant_group_id to bundle into a group, is_taunt+taunt_text for the rude joke cards, is_locked+unlock_rule for cards the recipient has to beg for. Auto-positions to the end of the Peek.",
  input_schema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['product', 'activity', 'aspirational', 'digital'],
      },
      title: { type: 'string' },
      description: { type: 'string' },
      image_url: { type: 'string' },
      source_url: {
        type: 'string',
        description: 'Original retailer URL. Hidden from recipient.',
      },
      source_retailer: { type: 'string' },
      value_cents: {
        type: 'integer',
        description: 'Price in cents, integer.',
      },
      reveal_value: {
        type: 'boolean',
        description: 'Whether the recipient sees the price.',
      },
      variant_group_id: {
        type: 'string',
        description: 'Attach to an existing variant group.',
      },
      proposed_date: {
        type: 'string',
        description: 'ISO timestamp for activity cards.',
      },
      location_hint: { type: 'string' },
      is_taunt: { type: 'boolean' },
      taunt_text: { type: 'string' },
      is_locked: { type: 'boolean' },
      unlock_rule: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['beg', 'date_after', 'event'] },
          beg_prompt: { type: 'string' },
          unlock_after: { type: 'string' },
        },
        required: ['kind'],
      },
    },
    required: ['type', 'title'],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);

    const [lastCard] = await db
      .select({ position: cards.position })
      .from(cards)
      .where(eq(cards.peekId, ctx.peekId))
      .orderBy(desc(cards.position))
      .limit(1);
    const nextPosition = (lastCard?.position ?? -1) + 1;

    const unlockRule: UnlockRule | Record<string, never> = parsed.unlock_rule
      ? (parsed.unlock_rule as UnlockRule)
      : {};

    const [row] = await db
      .insert(cards)
      .values({
        peekId: ctx.peekId,
        variantGroupId: parsed.variant_group_id ?? null,
        position: nextPosition,
        type: parsed.type,
        title: parsed.title,
        description: parsed.description ?? null,
        imageUrl: parsed.image_url ?? null,
        sourceUrl: parsed.source_url ?? null,
        sourceRetailer: parsed.source_retailer ?? null,
        valueCents: parsed.value_cents ?? null,
        revealValue: parsed.reveal_value ?? false,
        isTaunt: parsed.is_taunt ?? false,
        tauntText: parsed.taunt_text ?? null,
        isLocked: parsed.is_locked ?? false,
        unlockRule,
        proposedDate: parsed.proposed_date ? new Date(parsed.proposed_date) : null,
        locationHint: parsed.location_hint ?? null,
        addedByUserId: ctx.userId,
      })
      .returning({ id: cards.id, position: cards.position });
    if (!row) throw new Error('failed to insert card');

    await db
      .update(peeks)
      .set({ updatedAt: new Date() })
      .where(eq(peeks.id, ctx.peekId));

    return { ok: true, card_id: row.id, position: row.position };
  },
});
