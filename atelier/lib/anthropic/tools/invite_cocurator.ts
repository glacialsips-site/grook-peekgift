import { z } from 'zod';
import { registerTool } from './index';

const InputSchema = z
  .object({
    email: z.string().email(),
    role: z.enum(['co_organizer', 'contributor']).default('contributor'),
    message: z.string().max(500).optional(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: false; error: 'not_implemented_yet'; user_message: string }
  | { ok: false; error: 'invalid_input'; detail: string };

registerTool<Input, Output>({
  name: 'invite_cocurator',
  description:
    "Invite a co-curator to collaborate on this peek (group gifts, multi-giver). Creates a Clerk org per peek if not exists, issues an invitation email with a magic accept link. Roles: co_organizer (full edit) or contributor (suggest cards). Tier 1 surface — only on explicit curator ask ('invite my sister').",
  input_schema: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['co_organizer', 'contributor'] },
      message: {
        type: 'string',
        description: "Optional personal note included in the invite email.",
      },
    },
    required: ['email'],
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
        'Co-curator invites are Tier 1. Acknowledge and continue solo for now.',
    };
  },
});
