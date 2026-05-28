import { z } from 'zod';
import { registerTool } from './index';

const PlatformEnum = z.enum([
  'og',
  'ig_story',
  'twitter',
  'facebook',
  'whatsapp',
  'sms',
  'email',
]);

const InputSchema = z
  .object({
    platforms: z.array(PlatformEnum).optional(),
    force_regenerate: z.boolean().default(false),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: false; error: 'not_implemented_yet'; user_message: string }
  | { ok: false; error: 'invalid_input'; detail: string };

registerTool<Input, Output>({
  name: 'share_pack_generate',
  description:
    "Generate platform-specific share assets (OG image, IG story, Twitter card, etc.) for a published peek. Auto-fires on publish via Inngest fan-out; manual calls are idempotent — they retrieve existing pack. Use on-demand post-publish when curator asks 'give me the Instagram one'. Returns the pre-generated variant.",
  input_schema: {
    type: 'object',
    properties: {
      platforms: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['og', 'ig_story', 'twitter', 'facebook', 'whatsapp', 'sms', 'email'],
        },
      },
      force_regenerate: { type: 'boolean' },
    },
    required: [],
  },
  deferLoading: true,
  handler: async (input): Promise<Output> => {
    // W09 from BUGS-WAVE2: structured invalid_input envelope.
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
        'Share-pack generation lands in packet 48. For now, the curator copies the share URL from the publish modal.',
    };
  },
});
