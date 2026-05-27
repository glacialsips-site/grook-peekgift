import { z } from 'zod';
import { track } from '@/lib/analytics/facade';
import { registerTool } from './index';

const InputSchema = z.object({}).strict();
type Input = z.infer<typeof InputSchema>;

interface Output {
  ok: true;
  next_step: 'paywall';
}

registerTool<Input, Output>({
  name: 'mark_ready_for_publish',
  description:
    "Signal the page is ready and surface the paywall to the curator. Call once the curator confirms they're done and the page has a recipient, a hero, a note, and at least one card. Always succeeds.",
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async (input, ctx): Promise<Output> => {
    InputSchema.parse(input);
    await track({
      name: 'peek_marked_ready',
      peekId: ctx.peekId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      payload: {},
    });
    return { ok: true, next_step: 'paywall' };
  },
});
