import { z } from 'zod';
import { registerTool } from './index';

const InputSchema = z
  .object({
    query: z.string().min(2).max(200),
    kind: z
      .enum(['restaurant', 'tour', 'experience', 'event', 'hotel', 'unspecified'])
      .default('unspecified'),
    location_hint: z.string().max(200).optional(),
    proposed_date: z.string().datetime().optional(),
    max_results: z.number().int().min(1).max(5).default(3),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: false; error: 'not_implemented_yet'; user_message: string }
  | { ok: false; error: 'invalid_input'; detail: string };

registerTool<Input, Output>({
  name: 'place_search_v2',
  description:
    "Search activity / restaurant / experience / event / hotel catalogs (Viator + OpenTable + Ticketmaster) for venue or experience cards. Use when curator names an activity, restaurant, tour, ticket, or hotel — 'dinner at Carbone', 'wine tour in Sonoma', 'Hamilton tickets'. Returns 1-5 suggestions; curator picks and you add_card with type='activity'. NEVER use for products — use affiliate_search.",
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      kind: {
        type: 'string',
        enum: [
          'restaurant',
          'tour',
          'experience',
          'event',
          'hotel',
          'unspecified',
        ],
      },
      location_hint: { type: 'string' },
      proposed_date: { type: 'string', format: 'date-time' },
      max_results: { type: 'integer', minimum: 1, maximum: 5 },
    },
    required: ['query'],
  },
  deferLoading: true,
  handler: async (input): Promise<Output> => {
    try {
      InputSchema.parse(input);
    } catch (err) {
      return {
        ok: false,
        error: 'invalid_input',
        detail: err instanceof Error ? err.message : String(err),
      };
    }
    return {
      ok: false,
      error: 'not_implemented_yet',
      user_message:
        'Place search (Viator / OpenTable / Ticketmaster) lands in packet 42. For now, ask the curator for a specific URL and use scrape_url.',
    };
  },
});
