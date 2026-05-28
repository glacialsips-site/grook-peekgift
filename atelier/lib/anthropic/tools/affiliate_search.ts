import { z } from 'zod';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { registerTool } from './index';

const log = logger.child({ component: 'tool/affiliate_search' });

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

type Output =
  | { ok: false; error: 'not_implemented_yet'; user_message: string }
  | { ok: false; error: 'invalid_input'; detail: string };

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
      let parsed: Input;
      try {
        parsed = InputSchema.parse(input);
      } catch (err) {
        return {
          ok: false,
          error: 'invalid_input',
          detail: err instanceof Error ? err.message : String(err),
        };
      }
      log.info('affiliate_search_called_pre_vendor_integration', {
        query: parsed.query,
      });
      return {
        ok: false,
        error: 'not_implemented_yet',
        user_message:
          'Affiliate catalog search lands in packet 42. For now, ask the curator for a specific product (name + URL) and use scrape_url to wrap it.',
      };
    },
  });
}
