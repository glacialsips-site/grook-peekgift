import { z } from 'zod';
import { registerTool } from './index';

const PatternEnum = z.enum([
  'shoes_dinners_ferrari',
  'pick_everything_unless_afternoon',
  'wedding_registry_counter_propose',
  'escalator',
  'surprise_with_roast',
  'vintage_tee_chaos',
  'cheap_and_cheerful_plus_one_luxury',
  'all_of_these_no_choice',
  'event_locked_finale',
  'custom',
]);

const InputSchema = z
  .object({
    pattern: PatternEnum,
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: false; error: 'not_implemented_yet'; user_message: string }
  | { ok: false; error: 'invalid_input'; detail: string };

registerTool<Input, Output>({
  name: 'set_rules_template',
  description:
    "Apply a named rules pattern from skills/rules-engine-patterns.md (shoes_dinners_ferrari, escalator, surprise_with_roast, etc.) to the existing cards on the page. The tool orchestrates add_variant_group + update_card + is_taunt/is_locked flips per pattern spec. Curator must approve the pattern name first. Returns a log of applied sub-mutations.",
  input_schema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        enum: [
          'shoes_dinners_ferrari',
          'pick_everything_unless_afternoon',
          'wedding_registry_counter_propose',
          'escalator',
          'surprise_with_roast',
          'vintage_tee_chaos',
          'cheap_and_cheerful_plus_one_luxury',
          'all_of_these_no_choice',
          'event_locked_finale',
          'custom',
        ],
      },
      config: {
        type: 'object',
        description: 'Pattern-specific configuration (see rules-engine-patterns.md §2 per pattern).',
        additionalProperties: true,
      },
    },
    required: ['pattern'],
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
        'Rules-template orchestrator lands in packet 42. For now, compose the pattern by hand with add_variant_group + update_card.',
    };
  },
});
