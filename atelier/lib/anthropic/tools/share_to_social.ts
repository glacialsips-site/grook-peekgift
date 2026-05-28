import { z } from 'zod';
import { registerTool } from './index';

const InputSchema = z
  .object({
    platform: z.enum([
      'instagram_story',
      'instagram_feed',
      'pinterest',
      'tiktok',
      'facebook',
    ]),
    confirm: z.literal(true),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: false; error: 'not_implemented_yet'; user_message: string }
  | { ok: false; error: 'invalid_input'; detail: string };

registerTool<Input, Output>({
  name: 'share_to_social',
  description:
    "Post the published peek to a connected social account (Instagram Story / Feed, Pinterest, TikTok, Facebook). Requires curator to have OAuthed the platform via Ayrshare/Buffer first. ALWAYS curator-initiated with explicit confirm=true; NEVER auto-post on publish.",
  input_schema: {
    type: 'object',
    properties: {
      platform: {
        type: 'string',
        enum: [
          'instagram_story',
          'instagram_feed',
          'pinterest',
          'tiktok',
          'facebook',
        ],
      },
      confirm: {
        type: 'boolean',
        enum: [true],
        description:
          'Must be true (non-skippable curator confirmation gate).',
      },
    },
    required: ['platform', 'confirm'],
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
        'Social outbound is Tier 2. For now, the curator copies the share URL and posts manually.',
    };
  },
});
