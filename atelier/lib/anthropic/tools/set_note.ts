import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { peeks } from '@/db/schema';
import { moderateInput } from '@/lib/anthropic/moderation';
import { scheduleEvolveVibe } from '@/lib/vibe/evolve';
import { registerTool } from './index';

const InputSchema = z
  .object({
    note_md: z.string().min(1).max(5000),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: true; note_md: string }
  | { ok: false; error: 'moderation_block'; user_message: string };

registerTool<Input, Output>({
  name: 'set_note',
  description:
    "Set the personal note that opens the page (markdown supported). Use once you have something concrete in the curator's voice; idempotent — call again to overwrite. The final words should sound like the curator, not you.",
  input_schema: {
    type: 'object',
    properties: {
      note_md: {
        type: 'string',
        description: "The full note text in markdown. Replaces any prior note.",
      },
    },
    required: ['note_md'],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);

    const verdict = await moderateInput({
      text: parsed.note_md,
      field: 'note',
      peekId: ctx.peekId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
    });
    if (!verdict.allow) {
      return {
        ok: false,
        error: 'moderation_block',
        user_message: verdict.user_message,
      };
    }

    const [row] = await db
      .update(peeks)
      .set({
        noteMd: parsed.note_md,
        updatedAt: new Date(),
      })
      .where(eq(peeks.id, ctx.peekId))
      .returning({ noteMd: peeks.noteMd });
    if (!row) throw new Error(`peek ${ctx.peekId} not found`);

    scheduleEvolveVibe(ctx.peekId, {
      kind: 'note',
      text: parsed.note_md,
    });

    return { ok: true, note_md: row.noteMd ?? parsed.note_md };
  },
});
