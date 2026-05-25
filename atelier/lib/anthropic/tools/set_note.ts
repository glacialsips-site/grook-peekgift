import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { peeks } from '@/db/schema';
import { scheduleEvolveVibe } from '@/lib/vibe/evolve';
import { registerTool } from './index';

const InputSchema = z.object({
  note_md: z.string().min(1).max(5000),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  ok: true;
  note_md: string;
}

registerTool<Input, Output>({
  name: 'set_note',
  description:
    "Set the curator's hand-written note that opens the Peek. Markdown is supported. Idempotent — call again to overwrite. Keep it short and in the curator's voice; you can offer to draft it but the final words land here.",
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
