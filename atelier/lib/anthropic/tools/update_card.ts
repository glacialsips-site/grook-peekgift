import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { cards, peeks, type UnlockRule } from '@/db/schema';
import { buildClickCustomId, wrapAffiliateLink } from '@/lib/affiliate/wrap';
import { normalizeImageUrl } from '@/lib/scrape/image';
import { registerTool } from './index';

const CardTypeSchema = z.enum([
  'product',
  'activity',
  'aspirational',
  'digital',
]);

const UnlockRuleSchema = z
  .object({
    kind: z.enum(['beg', 'date_after', 'event']),
    beg_prompt: z.string().min(1).max(280).optional(),
    unlock_after: z.string().min(1).max(64).optional(),
  })
  .strict();

const InputSchema = z
  .object({
    card_id: z.string().uuid(),
    type: CardTypeSchema.optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    image_url: z.string().url().nullable().optional(),
    source_url: z.string().url().nullable().optional(),
    source_retailer: z.string().max(120).nullable().optional(),
    value_cents: z.number().int().nonnegative().max(10_000_000).nullable().optional(),
    reveal_value: z.boolean().optional(),
    variant_group_id: z.string().uuid().nullable().optional(),
    proposed_date: z.string().datetime().nullable().optional(),
    location_hint: z.string().max(280).nullable().optional(),
    is_taunt: z.boolean().optional(),
    taunt_text: z.string().max(280).nullable().optional(),
    is_locked: z.boolean().optional(),
    unlock_rule: UnlockRuleSchema.nullable().optional(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

interface Output {
  ok: true;
  card_id: string;
}

registerTool<Input, Output>({
  name: 'update_card',
  description:
    "Patch fields on an existing card without losing card_id or variant_group attachment. Pass card_id + only the fields you want to change. Pass null to clear a nullable field (image_url, description, value_cents, variant_group_id, etc.). Use this instead of remove_card + add_card when refining: swapping the image, fixing the title, attaching to a different variant group, toggling reveal_value, adding a taunt overlay. Type, title, and similar can be reassigned. source_url re-wraps the affiliate link.",
  input_schema: {
    type: 'object',
    properties: {
      card_id: { type: 'string', description: 'UUID of the card to update.' },
      type: {
        type: 'string',
        enum: ['product', 'activity', 'aspirational', 'digital'],
      },
      title: { type: 'string' },
      description: { type: ['string', 'null'] },
      image_url: { type: ['string', 'null'] },
      source_url: { type: ['string', 'null'] },
      source_retailer: { type: ['string', 'null'] },
      value_cents: { type: ['integer', 'null'] },
      reveal_value: { type: 'boolean' },
      variant_group_id: { type: ['string', 'null'] },
      proposed_date: { type: ['string', 'null'] },
      location_hint: { type: ['string', 'null'] },
      is_taunt: { type: 'boolean' },
      taunt_text: { type: ['string', 'null'] },
      is_locked: { type: 'boolean' },
      unlock_rule: {
        type: ['object', 'null'],
        properties: {
          kind: { type: 'string', enum: ['beg', 'date_after', 'event'] },
          beg_prompt: { type: 'string' },
          unlock_after: { type: 'string' },
        },
        required: ['kind'],
      },
    },
    required: ['card_id'],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);

    const update: Record<string, unknown> = {};

    if (parsed.type !== undefined) update['type'] = parsed.type;
    if (parsed.title !== undefined) update['title'] = parsed.title;
    if (parsed.description !== undefined) update['description'] = parsed.description;
    if (parsed.source_retailer !== undefined) {
      update['sourceRetailer'] = parsed.source_retailer;
    }
    if (parsed.value_cents !== undefined) update['valueCents'] = parsed.value_cents;
    if (parsed.reveal_value !== undefined) update['revealValue'] = parsed.reveal_value;
    if (parsed.variant_group_id !== undefined) {
      update['variantGroupId'] = parsed.variant_group_id;
    }
    if (parsed.proposed_date !== undefined) {
      update['proposedDate'] = parsed.proposed_date
        ? new Date(parsed.proposed_date)
        : null;
    }
    if (parsed.location_hint !== undefined) {
      update['locationHint'] = parsed.location_hint;
    }
    if (parsed.is_taunt !== undefined) update['isTaunt'] = parsed.is_taunt;
    if (parsed.taunt_text !== undefined) update['tauntText'] = parsed.taunt_text;
    if (parsed.is_locked !== undefined) update['isLocked'] = parsed.is_locked;
    if (parsed.unlock_rule !== undefined) {
      const rule: UnlockRule | Record<string, never> = parsed.unlock_rule ?? {};
      update['unlockRule'] = rule;
    }

    if (parsed.image_url !== undefined) {
      update['imageUrl'] = parsed.image_url
        ? await normalizeImageUrl(parsed.image_url, ctx.peekId)
        : null;
    }

    if (parsed.source_url !== undefined) {
      update['sourceUrl'] = parsed.source_url;
      if (parsed.source_url) {
        const wrapped = wrapAffiliateLink(
          parsed.source_url,
          buildClickCustomId(ctx.peekId, parsed.card_id),
        );
        update['affiliateUrl'] = wrapped.wrappedUrl ?? null;
        update['affiliateNetwork'] = wrapped.network ?? null;
        update['commissionPct'] =
          wrapped.commissionPctEstimate != null
            ? wrapped.commissionPctEstimate.toString()
            : null;
      } else {
        update['affiliateUrl'] = null;
        update['affiliateNetwork'] = null;
        update['commissionPct'] = null;
      }
    }

    if (Object.keys(update).length === 0) {
      return { ok: true, card_id: parsed.card_id };
    }

    const [row] = await db
      .update(cards)
      .set(update)
      .where(and(eq(cards.id, parsed.card_id), eq(cards.peekId, ctx.peekId)))
      .returning({ id: cards.id });
    if (!row) throw new Error(`card ${parsed.card_id} not found in peek`);

    await db
      .update(peeks)
      .set({ updatedAt: new Date() })
      .where(eq(peeks.id, ctx.peekId));

    return { ok: true, card_id: row.id };
  },
});
