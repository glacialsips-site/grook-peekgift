import { z } from 'zod';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { registerTool } from './index';

const log = logger.child({ component: 'tool/affiliate_search' });

// Affiliate catalog search. Vendor: Skimlinks Merchant API (primary) +
// Sovrn Commerce API (fallback).
//
// Current state: neither SKIMLINKS_PUBLISHER_ID nor SOVRN_API_KEY are set
// in the vNext environment. Until packet 42 wires the live vendor calls,
// this tool degrades GRACEFULLY: it returns a structured fallback that
// tells Peek to issue `web_search_tool_bm25` (the Anthropic server tool)
// with the same query. Web search returns plain product URLs — the model
// then scrape_urls them, which wraps each URL through wrapAffiliateLink at
// card-insert time. End result: the FUNCTION works (product discovery →
// affiliate-wrapped card) even without the dedicated Merchant API keys.
//
// When SKIMLINKS / SOVRN keys arrive (packet 42 or later), this handler
// switches to live catalog calls and stops emitting the fallback hint.

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
  | {
      ok: false;
      error: 'service_not_configured';
      service: 'skimlinks_and_sovrn';
      fallback: 'web_search';
      user_message: string;
    }
  | { ok: false; error: 'not_implemented_yet'; user_message: string };

registerTool<Input, Output>({
  name: 'affiliate_search',
  description:
    "Search affiliate-eligible product catalogs (Skimlinks + Sovrn) for product gift options matching a category. Use when curator names a product category they want as a card — 'coffee gift', 'skincare', 'outdoor gear'. Returns 1-5 suggestions; curator picks and you add_card. Never use for activities/restaurants/events — use place_search_v2 instead. NEVER use for specific named products with a known URL — use scrape_url. If this tool returns fallback='web_search', call web_search_tool_bm25 with the same query, then scrape_url the URLs that look promising.",
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

    const skim = env.SKIMLINKS_PUBLISHER_ID;
    const sovrn = env.SOVRN_API_KEY;

    if (!skim && !sovrn) {
      log.warn('affiliate_search_unconfigured_falling_back_to_web_search', {
        query: parsed.query,
      });
      return {
        ok: false,
        error: 'service_not_configured',
        service: 'skimlinks_and_sovrn',
        fallback: 'web_search',
        user_message:
          'Affiliate catalog search is not yet wired (packet 42). Use the web_search server tool with the same query, then scrape_url the most promising results.',
      };
    }

    // Keys are configured but the live integration ships in packet 42.
    return {
      ok: false,
      error: 'not_implemented_yet',
      user_message:
        'Affiliate catalog search lands in packet 42. For now, ask the curator for a specific product (name + URL) and use scrape_url to wrap it.',
    };
  },
});
