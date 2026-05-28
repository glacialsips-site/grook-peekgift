import { z } from 'zod';
import { registerTool } from './index';

const InputSchema = z
  .object({
    spotify_track_id: z.string().min(1).max(64).optional(),
    query: z.string().min(2).max(200).optional(),
    variant_group_id: z.string().uuid().optional(),
    is_locked: z.boolean().optional(),
  })
  .strict()
  .refine((x) => x.spotify_track_id || x.query, {
    message: 'need spotify_track_id or query',
  });
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: false; error: 'not_implemented_yet'; user_message: string }
  | { ok: false; error: 'invalid_input'; detail: string };

registerTool<Input, Output>({
  name: 'set_song_card',
  description:
    "Add a digital card with an embedded Spotify player. Pass spotify_track_id when you have it, or query (artist + song) to let the tool search and pick top match. Use when curator mentions a song or artist as a card.",
  input_schema: {
    type: 'object',
    properties: {
      spotify_track_id: { type: 'string' },
      query: { type: 'string' },
      variant_group_id: { type: 'string' },
      is_locked: { type: 'boolean' },
    },
    required: [],
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
        'Spotify song cards are Tier 1. For now, ask the curator for a YouTube link or add a manual digital card via add_card.',
    };
  },
});
