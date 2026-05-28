import { z } from 'zod';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { registerTool } from './index';

const log = logger.child({ component: 'tool/affiliate_search' });

// Affiliate catalog search. Vendor: Skimlinks Merchant API (primary) +
// Sovrn Commerce API (fallback).
//
// Current state: neither SKIMLINKS_PUBLISHER_ID nor SOVRN_API_KEY are set
// in the vNext environment. When BOTH are unset, this module short-circuits
// and skips `registerTool` entirely — Peek's tool list won't include
// `affiliate_search` at all, so the model can't try to call it and get a
// confusing "service_not_configured" error. The previous fallback (returning
// a structured "use web_search instead" hint) was causing Peek to loop on
// the tool. Better to hide it until the keys land (packet 42).
//
// When SKIMLINKS / SOVRN keys arrive, this handler switches to live catalog
// calls. Leave the file in place so registration is a single env-var flip.

const CategoryEnum = z.enum([
  'apparel',
  'home',
  'kitchen',
  'beauty',
  'outdoor',
  'books',
  'tech',
  'kids',
  'jewelry',
  'fragrance',
  'pet',
  'sports',
  'food_and_drink',
  'art',
  'wellness',
]);

const InputSchema = z
  .object({
    query: z.string().min(2).max(200),
    category_hint: CategoryEnum.optional(),
    price_floor_cents: z.number().int().nonnegative().optional(),
    price_ceiling_cents: z.number().int().nonnegative().optional(),
    max_results: z.number().int().min(1).max(5).default(3),
    prefer_network: z.enum(['skimlinks', 'sovrn', 'any']).default('any'),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output = { ok: false; error: 'not_implemented_yet'; user_message: string };

// Gate: hide entirely when no vendor is configured. The model never sees
// the tool in its toolset, so it can't call it. When keys arrive, restart
// the server and the tool reappears in the schemas.
if (env.SKIMLINKS_PUBLISHER_ID || env.SOVRN_API_KEY) {
  registerTool<Input, Output>({
    name: 'affiliate_search',
    description:
      "Search affiliate-eligible product catalogs (Skimlinks + Sovrn) for product gift options matching a category. Use when curator names a product category they want as a card — 'coffee gift', 'skincare', 'outdoor gear'. Returns 1-5 suggestions; curator picks and you add_card. Never use for activities/restaurants/events — use place_search_v2 instead. NEVER use for specific named products with a known URL — use scrape_url.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        category_hint: {
          type: 'string',
          enum: [
            'apparel',
            'home',
            'kitchen',
            'beauty',
            'outdoor',
            'books',
            'tech',
            'kids',
            'jewelry',
            'fragrance',
            'pet',
            'sports',
            'food_and_drink',
            'art',
            'wellness',
          ],
        },
        price_floor_cents: { type: 'integer', minimum: 0 },
        price_ceiling_cents: { type: 'integer', minimum: 0 },
        max_results: { type: 'integer', minimum: 1, maximum: 5 },
        prefer_network: {
          type: 'string',
          enum: ['skimlinks', 'sovrn', 'any'],
        },
      },
      required: ['query'],
    },
    deferLoading: true,
    handler: async (input): Promise<Output> => {
      const parsed = InputSchema.parse(input);
      log.info('affiliate_search_called_pre_vendor_integration', {
        query: parsed.query,
      });
      // Keys are configured but the live integration ships in packet 42.
      return {
        ok: false,
        error: 'not_implemented_yet',
        user_message:
          'Affiliate catalog search lands in packet 42. For now, ask the curator for a specific product (name + URL) and use scrape_url to wrap it.',
      };
    },
  });
}
