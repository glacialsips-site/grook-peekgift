import { z } from 'zod';
import { registerTool } from './index';

const InputSchema = z
  .object({
    card_id: z.string().uuid(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output = { ok: false; error: 'not_implemented_yet'; user_message: string };

registerTool<Input, Output>({
  name: 'unlock_event',
  description:
    "Fire the unlock event on an event-locked card (post-publish dashboard action). Sets the card's unlock_event_fired_at timestamp so the recipient's pick route returns the card as unlocked. Use only after the curator manually triggers the event ('the ceremony's over → open the honeymoon card now'). Card must have unlock_rule.kind = 'event'.",
  input_schema: {
    type: 'object',
    properties: {
      card_id: {
        type: 'string',
        description: 'UUID of the event-locked card to unlock.',
      },
    },
    required: ['card_id'],
  },
  deferLoading: true,
  handler: async (input): Promise<Output> => {
    InputSchema.parse(input);
    return {
      ok: false,
      error: 'not_implemented_yet',
      user_message:
        'Event-unlock action lands in the post-publish dashboard packet (follow-up to 42).',
    };
  },
});
