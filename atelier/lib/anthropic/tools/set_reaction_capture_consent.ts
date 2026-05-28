import { z } from 'zod';
import { registerTool } from './index';

const InputSchema = z
  .object({
    disabled: z.boolean(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: false; error: 'not_implemented_yet'; user_message: string }
  | { ok: false; error: 'invalid_input'; detail: string };

registerTool<Input, Output>({
  name: 'set_reaction_capture_consent',
  description:
    "Toggle whether the recipient sees the 'record a reaction' button on reveal. Use when the curator says 'don't let her record a reaction' or the occasion is sensitive (condolence, bereavement — default disabled). Persists per-peek.",
  input_schema: {
    type: 'object',
    properties: {
      disabled: {
        type: 'boolean',
        description: 'true = hide the reaction-capture UI from the recipient.',
      },
    },
    required: ['disabled'],
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
      user_message: 'Reaction-capture consent setting lands in packet 44.',
    };
  },
});
