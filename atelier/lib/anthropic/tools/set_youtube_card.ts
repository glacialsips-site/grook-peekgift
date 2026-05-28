import { z } from 'zod';
import { registerTool } from './index';

const InputSchema = z
  .object({
    youtube_url: z.string().url(),
    variant_group_id: z.string().uuid().optional(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output = { ok: false; error: 'not_implemented_yet'; user_message: string };

registerTool<Input, Output>({
  name: 'set_youtube_card',
  description:
    "Add a digital card with an embedded YouTube player from a URL. Uses YouTube oEmbed for title/channel/thumbnail. Use when curator drops a YouTube link or mentions a video.",
  input_schema: {
    type: 'object',
    properties: {
      youtube_url: { type: 'string', format: 'uri' },
      variant_group_id: { type: 'string' },
    },
    required: ['youtube_url'],
  },
  deferLoading: true,
  handler: async (input): Promise<Output> => {
    InputSchema.parse(input);
    return {
      ok: false,
      error: 'not_implemented_yet',
      user_message:
        'YouTube card support is Tier 1. For now, add_card with type="digital" and the URL.',
    };
  },
});
