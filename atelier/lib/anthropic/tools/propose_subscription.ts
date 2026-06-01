import { z } from 'zod';
import { registerTool } from './index';

const InputSchema = z
  .object({
    cadence: z.enum(['monthly', 'quarterly', 'annual']),
    duration_months: z.number().int().min(1).max(60).optional(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: false; error: 'not_implemented_yet'; user_message: string }
  | { ok: false; error: 'invalid_input'; detail: string };

registerTool<Input, Output>({
  name: 'propose_subscription',
  description:
    "Create a Stripe Subscription Schedule for recurring peeks ('give Mom a monthly peek for a year'). Tier 1 surface — only call when the curator EXPLICITLY asks for recurring. Don't propose unprompted.",
  input_schema: {
    type: 'object',
    properties: {
      cadence: { type: 'string', enum: ['monthly', 'quarterly', 'annual'] },
      duration_months: { type: 'integer', minimum: 1, maximum: 60 },
    },
    required: ['cadence'],
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
        'Recurring subscriptions are Tier 1 (post-MVP). Acknowledge the request and continue with the one-off peek for now.',
    };
  },
});
