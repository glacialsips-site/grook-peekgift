import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { cards, peeks, type UnlockRule } from '@/db/schema';
import { buildClickCustomId, wrapAffiliateLink } from '@/lib/affiliate/wrap';
import { scheduleEvolveVibe } from '@/lib/vibe/evolve';
import { trackFireAndForget } from '@/lib/analytics/facade';
import { logger } from '@/lib/logger';
import { scrapePipeline } from '@/lib/scrape/pipeline';
import { normalizeImageUrl } from '@/lib/scrape/image';
import { registerTool } from './index';

const log = logger.child({ component: 'tool/add_card' });

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
    type: CardTypeSchema,
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    image_url: z.string().url().optional(),
    source_url: z.string().url().optional(),
    source_retailer: z.string().max(120).optional(),
    value_cents: z.number().int().nonnegative().max(10_000_000).optional(),
    reveal_value: z.boolean().optional(),
    variant_group_id: z.string().uuid().optional(),
    proposed_date: z.string().datetime().optional(),
    location_hint: z.string().max(280).optional(),
    is_taunt: z.boolean().optional(),
    taunt_text: z.string().max(280).optional(),
    is_locked: z.boolean().optional(),
    unlock_rule: UnlockRuleSchema.optional(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

interface Output {
  ok: true;
  card_id: string;
  position: number;
}

registerTool<Input, Output>({
  name: 'add_card',
  description:
    "Add a gift card to the page — product, activity, aspirational, or digital. Use whenever you have a concrete option to put on the page; pass source_url to auto-scrape image/description/price and affiliate-wrap the link. Failures on the inline scrape are non-fatal — the card still inserts with whatever you provided.",
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

    const unlockRule: UnlockRule | Record<string, never> =
      parsed.unlock_rule ?? {};

    const wrapped = parsed.source_url
      ? wrapAffiliateLink(parsed.source_url, buildClickCustomId(ctx.peekId))
      : null;

    let finalImageUrl: string | null = parsed.image_url ?? null;
    let finalDescription: string | null = parsed.description ?? null;
    let finalValueCents: number | null = parsed.value_cents ?? null;
    let finalSourceRetailer: string | null = parsed.source_retailer ?? null;
    let scrapeProvider: string | null = null;
    let scrapeDegraded: boolean | null = null;

    if (parsed.source_url && !parsed.image_url) {
      try {
        const outcome = await scrapePipeline(parsed.source_url, {
          peekId: ctx.peekId,
          userId: ctx.userId,
          sessionId: ctx.sessionId,
        });
        if (outcome.ok) {
          scrapeProvider = outcome.provider;
          scrapeDegraded = outcome.degraded;
          if (outcome.product.imageUrl) finalImageUrl = outcome.product.imageUrl;
          if (!finalDescription && outcome.product.description) {
            finalDescription = outcome.product.description;
          }
          if (finalValueCents == null && outcome.product.valueCents != null) {
            finalValueCents = outcome.product.valueCents;
          }
          if (!finalSourceRetailer && outcome.product.sourceRetailer) {
            finalSourceRetailer = outcome.product.sourceRetailer;
          }
        }
      } catch (err) {
        log.warn('inline_scrape_threw', {
          url: parsed.source_url,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    } else if (parsed.image_url) {
      finalImageUrl = await normalizeImageUrl(parsed.image_url, ctx.peekId);
    }

    const metadata: Record<string, unknown> = {};
    if (scrapeProvider) metadata['scrape_provider'] = scrapeProvider;
    if (scrapeDegraded !== null) metadata['scrape_degraded'] = scrapeDegraded;

    const [row] = await db
      .insert(cards)
      .values({
        peekId: ctx.peekId,
        variantGroupId: parsed.variant_group_id ?? null,
        position: nextPosition,
        type: parsed.type,
        title: parsed.title,
        description: finalDescription,
        imageUrl: finalImageUrl,
        sourceUrl: parsed.source_url ?? null,
        sourceRetailer: finalSourceRetailer,
        affiliateUrl: wrapped?.wrappedUrl ?? null,
        affiliateNetwork: wrapped?.network ?? null,
        commissionPct:
          wrapped?.commissionPctEstimate != null
            ? wrapped.commissionPctEstimate.toString()
            : null,
        valueCents: finalValueCents,
        revealValue: parsed.reveal_value ?? false,
        isTaunt: parsed.is_taunt ?? false,
        tauntText: parsed.taunt_text ?? null,
        isLocked: parsed.is_locked ?? false,
        unlockRule,
        proposedDate: parsed.proposed_date ? new Date(parsed.proposed_date) : null,
        locationHint: parsed.location_hint ?? null,
        addedByUserId: ctx.userId,
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      })
      .returning({ id: cards.id, position: cards.position });
    if (!row) throw new Error('failed to insert card');

    if (wrapped && parsed.source_url && row.id) {
      const refinedCustomId = buildClickCustomId(ctx.peekId, row.id);
      const refined = wrapAffiliateLink(parsed.source_url, refinedCustomId);
      if (refined.wrappedUrl !== wrapped.wrappedUrl) {
        await db
          .update(cards)
          .set({ affiliateUrl: refined.wrappedUrl })
          .where(eq(cards.id, row.id));
      }
    }

    await db
      .update(peeks)
      .set({ updatedAt: new Date() })
      .where(eq(peeks.id, ctx.peekId));

    const recent = await db
      .select({ type: cards.type, isTaunt: cards.isTaunt })
      .from(cards)
      .where(eq(cards.peekId, ctx.peekId))
      .orderBy(desc(cards.position))
      .limit(20);
    scheduleEvolveVibe(ctx.peekId, {
      kind: 'cards',
      cards: recent.map((c) => ({ type: c.type, is_taunt: c.isTaunt })),
    });

    trackFireAndForget({
      name: 'card_added',
      peekId: ctx.peekId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      payload: {
        card_id: row.id,
        card_type: parsed.type,
        is_variant: parsed.variant_group_id !== undefined,
      },
    });

    return { ok: true, card_id: row.id, position: row.position };
  },
});
