import { z } from 'zod';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { registerTool } from './index';

const log = logger.child({ component: 'tool/request_voice_capture' });

const PurposeEnum = z.enum([
  'curator_voice_clone',
  'voice_note_card',
  'voice_mode_toggle',
]);

const InputSchema = z
  .object({
    purpose: PurposeEnum,
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | {
      ok: false;
      error: 'voice_mode_not_available';
      message: string;
    }
  | { ok: false; error: 'not_implemented_yet'; user_message: string };

registerTool<Input, Output>({
  name: 'request_voice_capture',
  description:
    "Surface the mic UI in the chat surface so the curator can record (for voice mode chat input, attach to a card, or capture a 30s voice-clone sample). The actual capture + transcription happens in the browser; subsequent user-turn delivers the transcript. NEVER auto-flip into voice mode without explicit curator opt-in.",
  input_schema: {
    type: 'object',
    properties: {
      purpose: {
        type: 'string',
        enum: ['curator_voice_clone', 'voice_note_card', 'voice_mode_toggle'],
      },
    },
    required: ['purpose'],
  },
  deferLoading: true,
  handler: async (input): Promise<Output> => {
    InputSchema.parse(input);
    if (!env.DEEPGRAM_API_KEY || !env.ELEVENLABS_API_KEY) {
      log.warn('voice_capture_unconfigured', {
        deepgram: Boolean(env.DEEPGRAM_API_KEY),
        elevenlabs: Boolean(env.ELEVENLABS_API_KEY),
      });
      return {
        ok: false,
        error: 'voice_mode_not_available',
        message:
          'Add DEEPGRAM_API_KEY and ELEVENLABS_API_KEY to enable voice mode',
      };
    }
    return {
      ok: false,
      error: 'not_implemented_yet',
      user_message: 'Voice capture UI lands in packet 43.',
    };
  },
});
