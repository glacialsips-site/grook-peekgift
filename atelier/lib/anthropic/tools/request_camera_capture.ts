import { z } from 'zod';
import { registerTool } from './index';

const PurposeEnum = z.enum([
  'hero_candidate',
  'curator_selfie_note',
  'inspiration_photo',
]);

const InputSchema = z
  .object({
    purpose: PurposeEnum,
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: false; error: 'not_implemented_yet'; user_message: string }
  | { ok: false; error: 'invalid_input'; detail: string };

registerTool<Input, Output>({
  name: 'request_camera_capture',
  description:
    "Surface the camera UI in the + menu so the curator can shoot a photo (hero candidate, selfie for note avatar, inspiration). Browser handles capture + upload; subsequent message includes the URL + Vision call. Use when curator says 'let me take a photo of...' or you proactively suggest for vibe extraction.",
  input_schema: {
    type: 'object',
    properties: {
      purpose: {
        type: 'string',
        enum: ['hero_candidate', 'curator_selfie_note', 'inspiration_photo'],
      },
    },
    required: ['purpose'],
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
      user_message: 'Camera capture UI lands in packet 44.',
    };
  },
});
