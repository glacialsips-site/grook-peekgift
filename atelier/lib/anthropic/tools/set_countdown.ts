import { z } from 'zod';
import { registerTool } from './index';

const InputSchema = z
  .object({
    target_iso: z.string().datetime(),
    label: z.string().min(1).max(120).optional(),
    visible: z.boolean().default(true),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output = { ok: false; error: 'not_implemented_yet'; user_message: string };

registerTool<Input, Output>({
  name: 'set_countdown',
  description:
    "Set a countdown timer on the page to a specific date (birthday, wedding, anniversary). One countdown per peek; call again to update. The countdown UI on the recipient page reads from this. Use when the curator confirmed an occasion date.",
  input_schema: {
    type: 'object',
    properties: {
      target_iso: {
        type: 'string',
        format: 'date-time',
        description: 'Target date in ISO 8601 (UTC recommended).',
      },
      label: {
        type: 'string',
        description: "Optional label shown above the countdown (e.g. 'Sarah's 40th').",
      },
      visible: {
        type: 'boolean',
        description: 'Whether the countdown UI renders on the recipient page.',
      },
    },
    required: ['target_iso'],
  },
  deferLoading: true,
  handler: async (input): Promise<Output> => {
    InputSchema.parse(input);
    return {
      ok: false,
      error: 'not_implemented_yet',
      user_message:
        'Countdown support lands in packet 42. For now, mention the date in set_note and move on.',
    };
  },
});
