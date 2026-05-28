import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { peeks } from '@/db/schema';
import { registerTool } from './index';

const PurposeEnum = z.enum([
  'hero_candidate_album',
  'recipient_voice_memo',
  'recipient_pdf',
  'inspiration_doc',
]);

const InputSchema = z
  .object({
    file_id: z.string().min(1).max(120),
    purpose: PurposeEnum,
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: true; file_id: string; purpose: string; attached_at: string }
  | {
      ok: false;
      error: 'peek_not_found' | 'file_not_found_in_peek';
      user_message?: string;
    };

registerTool<Input, Output>({
  name: 'attach_files_api_ref',
  description:
    "Attach a previously-uploaded Anthropic Files API file to the next conversation turn. Pass the file_id from peeks.metadata.uploaded_files[] (the curator uploaded it via /api/upload/anthropic). Use when you need to reference a big upload (photo album, PDF, voice memo) Claude already has access to — saves re-uploading. The file appears as a content block on the next user turn.",
  input_schema: {
    type: 'object',
    properties: {
      file_id: {
        type: 'string',
        description: 'Anthropic file_id from a prior upload.',
      },
      purpose: {
        type: 'string',
        enum: [
          'hero_candidate_album',
          'recipient_voice_memo',
          'recipient_pdf',
          'inspiration_doc',
        ],
        description: 'What the file is for. Drives how the chat route renders it.',
      },
    },
    required: ['file_id', 'purpose'],
  },
  deferLoading: true,
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);
    const [row] = await db
      .select({ metadata: peeks.metadata })
      .from(peeks)
      .where(eq(peeks.id, ctx.peekId));
    if (!row) {
      return { ok: false, error: 'peek_not_found' };
    }
    const meta = (row.metadata as Record<string, unknown>) ?? {};
    const uploaded = Array.isArray(meta['uploaded_files'])
      ? (meta['uploaded_files'] as Array<{ file_id?: string }>)
      : [];
    if (!uploaded.some((f) => f.file_id === parsed.file_id)) {
      return {
        ok: false,
        error: 'file_not_found_in_peek',
        user_message: 'That upload is not part of this peek.',
      };
    }
    const active = Array.isArray(meta['active_attached_file_ids'])
      ? (meta['active_attached_file_ids'] as string[])
      : [];
    if (!active.includes(parsed.file_id)) {
      await db
        .update(peeks)
        .set({
          metadata: {
            ...meta,
            active_attached_file_ids: [...active, parsed.file_id],
          },
          updatedAt: new Date(),
        })
        .where(eq(peeks.id, ctx.peekId));
    }
    return {
      ok: true,
      file_id: parsed.file_id,
      purpose: parsed.purpose,
      attached_at: new Date().toISOString(),
    };
  },
});
