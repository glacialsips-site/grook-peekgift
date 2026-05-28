import { z } from 'zod';
import { buildMemoryHandler, prefixForUser } from '../memory/store';
import { registerTool } from './index';

const InputSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(120)
      .regex(
        /^[A-Za-z0-9._-]+$/,
        'key must match [A-Za-z0-9._-]+ (hierarchical dot keys, e.g. family.sister.name)',
      ),
    value: z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(z.unknown()),
      z.record(z.string(), z.unknown()),
    ]),
    expires_at: z.string().datetime().optional(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: true; key: string; value: unknown }
  | {
      ok: false;
      error: 'memory_unavailable' | 'unauthorized' | 'invalid_key';
      user_message?: string;
    };

registerTool<Input, Output>({
  name: 'set_curator_memory',
  description:
    "Write a durable fact about the curator that should persist across all future peeks. Use for facts that would change the NEXT peek they build: 'Mom's name is Diana, birthday March 14'; 'Sister Hannah, allergic to nuts'; 'Wife and I anniversary Aug 14, prefer warm-romantic vibes'. Do NOT use for transient peek-specific facts (use set_recipient_profile for those). Anon curators: tool fails — durable memory requires signed-in.",
  input_schema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description:
          'Hierarchical dot-key: e.g. family.sister.name, defaults.vibe.preset, recent_recipients.0.name. [A-Za-z0-9._-]+',
      },
      value: { description: 'Any JSON value.' },
      expires_at: { type: 'string', format: 'date-time' },
    },
    required: ['key', 'value'],
  },
  deferLoading: true,
  handler: async (input, ctx): Promise<Output> => {
    let parsed: Input;
    try {
      parsed = InputSchema.parse(input);
    } catch (_err) {
      return { ok: false, error: 'invalid_key' };
    }
    if (!ctx.userId) {
      return {
        ok: false,
        error: 'unauthorized',
        user_message: 'Memory requires a signed-in curator.',
      };
    }
    try {
      const handler = buildMemoryHandler({ clerkUserId: ctx.userId });
      const path = `${prefixForUser(ctx.userId)}kv/${parsed.key}.json`;
      const payload = JSON.stringify({
        value: parsed.value,
        expires_at: parsed.expires_at ?? null,
        set_at: new Date().toISOString(),
      });
      const result = await handler.create({
        command: 'create',
        path,
        file_text: payload,
      });
      if (typeof result === 'string' && result.startsWith('Error:')) {
        return {
          ok: false,
          error: 'memory_unavailable',
          user_message: result,
        };
      }
      return { ok: true, key: parsed.key, value: parsed.value };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: 'memory_unavailable', user_message: msg };
    }
  },
});
