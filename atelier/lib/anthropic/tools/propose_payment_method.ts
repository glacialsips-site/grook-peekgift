import { z } from 'zod';
import { registerTool } from './index';

const InputSchema = z
  .object({
    method: z.enum([
      'apple_pay',
      'google_pay',
      'link',
      'klarna',
      'afterpay',
      'affirm',
      'cashapp',
      'ach',
      'card',
    ]),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: false; error: 'not_implemented_yet'; user_message: string }
  | { ok: false; error: 'invalid_input'; detail: string };

registerTool<Input, Output>({
  name: 'propose_payment_method',
  description:
    "Suggest a specific payment method in the chat (Klarna for split-pay, Apple Pay for quick, ACH for low fee). UI hint only — Stripe Payment Element auto-renders enabled methods. Use when curator asks 'can I split this' or 'is Apple Pay an option.'",
  input_schema: {
    type: 'object',
    properties: {
      method: {
        type: 'string',
        enum: [
          'apple_pay',
          'google_pay',
          'link',
          'klarna',
          'afterpay',
          'affirm',
          'cashapp',
          'ach',
          'card',
        ],
      },
    },
    required: ['method'],
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
        'Payment-method suggestion UI lands in packet 45.',
    };
  },
});
