import { z } from 'zod';
import { registerTool } from './index';

const InputSchema = z
  .object({
    tmdb_id: z.number().int().positive().optional(),
    query: z.string().min(2).max(200).optional(),
    variant_group_id: z.string().uuid().optional(),
  })
  .strict()
  .refine((x) => x.tmdb_id || x.query, { message: 'need tmdb_id or query' });
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: false; error: 'not_implemented_yet'; user_message: string }
  | { ok: false; error: 'invalid_input'; detail: string };

registerTool<Input, Output>({
  name: 'set_movie_card',
  description:
    "Add a digital card for a movie or TV show via TMDB. Pass tmdb_id when you have it, or query (title) to search. Watch-link buttons (Apple TV, Prime) attached when available. Use when curator references a film ('she loves The Notebook').",
  input_schema: {
    type: 'object',
    properties: {
      tmdb_id: { type: 'integer', minimum: 1 },
      query: { type: 'string' },
      variant_group_id: { type: 'string' },
    },
    required: [],
  },
  deferLoading: true,
  handler: async (input): Promise<Output> => {
    // W09 from BUGS-WAVE2: surface invalid input as a structured envelope
    // so the model recovers gracefully instead of seeing a raw Zod string.
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
        'TMDB movie cards are Tier 1. Use add_card with a description for now.',
    };
  },
});
