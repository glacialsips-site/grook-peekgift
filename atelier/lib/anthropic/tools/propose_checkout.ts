import { z } from 'zod';
import { registerTool } from './index';

const InputSchema = z
  .object({
    coupon_code: z.string().min(1).max(80).optional(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: false; error: 'not_implemented_yet'; user_message: string }
  | { ok: false; error: 'invalid_input'; detail: string };

registerTool<Input, Output>({
  name: 'propose_checkout',
  // Do NOT mention the internal test coupon code here — Peek reads tool
  // descriptions and would leak it to curators despite the prompt rule.
  description:
    "Open the Stripe Checkout Session for the $12 publish fee. ONLY call after mark_ready_for_publish returned ok AND the curator confirmed they're ready. This is the bookend — fires once per peek; idempotent on already-paid peeks. Optional coupon_code is for promotional discounts the curator already knows about; never volunteer codes the curator hasn't mentioned.",
  input_schema: {
    type: 'object',
    properties: {
      coupon_code: {
        type: 'string',
        description: 'Optional Stripe promo code if the curator provides one.',
      },
    },
    required: [],
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
        'Stripe Checkout integration lands in packet 45. For now, the curator publishes via the existing UI surface.',
    };
  },
});
