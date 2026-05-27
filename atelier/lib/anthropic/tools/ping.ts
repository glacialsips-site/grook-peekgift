import { z } from 'zod';
import { registerTool } from './index';

/**
 * Trivial health-check tool. Proves the registry round-trips end-to-end:
 * the model can call it, our dispatcher invokes the handler, the result
 * comes back as a `tool_result` block.
 */
const PingInputSchema = z.object({}).strict();
type PingInput = z.infer<typeof PingInputSchema>;

interface PingOutput {
  pong: true;
  at: string;
}

registerTool<PingInput, PingOutput>({
  name: 'ping',
  description:
    "Health-check tool that returns { pong: true, at: <ISO timestamp> }. Use only when explicitly testing tool-use wiring. Always succeeds.",
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async (input): Promise<PingOutput> => {
    PingInputSchema.parse(input);
    return { pong: true, at: new Date().toISOString() };
  },
});
