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
    "Signal that the Peek is ready to publish — emits a 'mark_ready' event the UI listens for to surface the paywall. Call this when the curator says they're done and the Peek has at least a recipient, a vibe, a hero (image or AI), a note, and at least one card.",
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
