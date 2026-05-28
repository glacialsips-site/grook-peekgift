import { z } from 'zod';
import { env } from '@/lib/env';
import { requestExtendedThinking } from '../extended-thinking';
import { registerTool } from './index';

const InputSchema = z
  .object({
    reason: z.enum([
      'note_drafting',
      'rules_tree_design',
      'recipient_disambiguation',
      'other',
    ]),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: true; budget_tokens: number; consumed_on_next_iteration: true }
  | {
      ok: false;
      error: 'voice_mode_blocks_thinking' | 'already_pending' | 'invalid_input';
      detail?: string;
    };

registerTool<Input, Output>({
  name: 'request_extended_thinking',
  description:
    "Flip extended thinking ON for the NEXT message generation iteration of this turn. Use ONLY before the hardest creative jobs: drafting a personal note in the curator's voice, designing a complex rules tree (multi-card locks, beg-locks, event-locks), disambiguating conflicting signals from the curator about a recipient. NEVER use in voice mode (kills sub-1.5s latency). After this tool runs, fire the heavy tool (set_note / set_rules_template / set_recipient_profile) on the SAME assistant turn — the next inner iteration burns the thinking budget on that work.",
  input_schema: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        enum: [
          'note_drafting',
          'rules_tree_design',
          'recipient_disambiguation',
          'other',
        ],
        description:
          'Why you need the thinking budget. Used for analytics and rate-limiting.',
      },
    },
    required: ['reason'],
  },
  deferLoading: true,
  handler: async (input, ctx): Promise<Output> => {
    try {
      InputSchema.parse(input);
    } catch (err) {
      return {
        ok: false,
        error: 'invalid_input',
        detail: err instanceof Error ? err.message : String(err),
      };
    }
    requestExtendedThinking(ctx.sessionId, ctx.turnId);
    return {
      ok: true,
      budget_tokens: env.EXTENDED_THINKING_BUDGET_TOKENS ?? 8000,
      consumed_on_next_iteration: true,
    };
  },
});
