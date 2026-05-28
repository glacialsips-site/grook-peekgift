import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { cards, peeks } from '@/db/schema';
import { track } from '@/lib/analytics/facade';
import { registerTool } from './index';

const InputSchema = z.object({}).strict();
type Input = z.infer<typeof InputSchema>;

type MissingField =
  | 'recipient_name'
  | 'note'
  | 'hero_image'
  | 'real_card'
  | 'vibe_preset';

type Output =
  | {
      ok: true;
      next_step: 'paywall';
      already_ready?: false;
    }
  | {
      ok: true;
      next_step: 'paywall';
      already_ready: true;
    }
  | {
      ok: false;
      error: 'already_published';
      user_message: string;
      share_url?: string | null;
    }
  | {
      ok: false;
      error: 'preconditions_failed';
      missing: MissingField[];
      user_message: string;
    }
  | {
      ok: false;
      error: 'not_found';
      user_message: string;
    };

registerTool<Input, Output>({
  name: 'mark_ready_for_publish',
  description:
    "Signal the page is ready and surface the paywall to the curator. Call once the curator confirms they're done and the page has a recipient, a hero, a note, a vibe, and at least one real (non-taunt) card. Refuses with error='preconditions_failed' listing exactly what's missing if any of those are absent — use the response to ask the curator for the gap. Refuses with error='already_published' if the peek is already live. Idempotent — calling again on a peek already marked ready is a no-op and does not re-surface the paywall.",
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async (input, ctx): Promise<Output> => {
    InputSchema.parse(input);

    const [peek] = await db
      .select({
        id: peeks.id,
        status: peeks.status,
        recipientName: peeks.recipientName,
        heroImageUrl: peeks.heroImageUrl,
        noteMd: peeks.noteMd,
        vibe: peeks.vibe,
        shareUrl: peeks.shareUrl,
      })
      .from(peeks)
      .where(eq(peeks.id, ctx.peekId))
      .limit(1);

    if (!peek) {
      return {
        ok: false,
        error: 'not_found',
        user_message:
          "Couldn't find this peek. Refresh and try again — if it keeps happening, something's wrong on our end.",
      };
    }

    if (peek.status === 'published' || peek.status === 'claimed') {
      const where = peek.shareUrl ? ` at ${peek.shareUrl}` : '';
      return {
        ok: false,
        error: 'already_published',
        user_message: `This peek is already live${where} — nothing to do here.`,
        share_url: peek.shareUrl ?? null,
      };
    }
    if (peek.status === 'archived') {
      return {
        ok: false,
        error: 'already_published',
        user_message:
          "This peek is archived and can't be published. Start a new peek if you want to share something fresh.",
        share_url: null,
      };
    }

    if (peek.status === 'ready_for_publish') {
      return { ok: true, next_step: 'paywall', already_ready: true };
    }

    const missing: MissingField[] = [];

    if (!peek.recipientName || peek.recipientName.trim().length === 0) {
      missing.push('recipient_name');
    }
    if (!peek.noteMd || peek.noteMd.trim().length === 0) {
      missing.push('note');
    }
    if (!peek.heroImageUrl) {
      missing.push('hero_image');
    }

    // Require a vibe.preset string — proves the vibe engine ran.
    const vibe = peek.vibe as { preset?: unknown } | null;
    if (!vibe || typeof vibe.preset !== 'string' || vibe.preset.length === 0) {
      missing.push('vibe_preset');
    }

    const [realCardCount] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(cards)
      .where(and(eq(cards.peekId, ctx.peekId), eq(cards.isTaunt, false)));
    if (!realCardCount || realCardCount.n < 1) {
      missing.push('real_card');
    }

    if (missing.length > 0) {
      const labels: Record<MissingField, string> = {
        recipient_name: 'recipient name',
        note: 'a personal note',
        hero_image: 'a hero image',
        real_card: 'at least one real gift card (not a gag)',
        vibe_preset: 'a vibe',
      };
      const friendly = missing.map((m) => labels[m]).join(', ');
      return {
        ok: false,
        error: 'preconditions_failed',
        missing,
        user_message: `Almost there — still need ${friendly} before this peek is ready to publish. Ask the curator for the missing pieces, then call this again.`,
      };
    }

    // Atomic transition: where status='draft' guards against a concurrent
    // call. metadata.markedReadyAt remains stamped for back-compat with
    // pre-enum tooling that reads it.
    const nowIso = new Date().toISOString();
    const updated = await db
      .update(peeks)
      .set({
        status: 'ready_for_publish',
        metadata: sql`jsonb_set(${peeks.metadata}, '{markedReadyAt}', to_jsonb(${nowIso}::text), true)`,
        updatedAt: new Date(),
      })
      .where(and(eq(peeks.id, ctx.peekId), eq(peeks.status, 'draft')))
      .returning({ id: peeks.id });

    if (updated.length === 0) {
      // Concurrent caller won the where-clause race — re-read and respond.
      const [recheck] = await db
        .select({
          status: peeks.status,
          shareUrl: peeks.shareUrl,
        })
        .from(peeks)
        .where(eq(peeks.id, ctx.peekId))
        .limit(1);
      if (recheck) {
        if (recheck.status === 'published' || recheck.status === 'claimed') {
          const where = recheck.shareUrl ? ` at ${recheck.shareUrl}` : '';
          return {
            ok: false,
            error: 'already_published',
            user_message: `This peek is already live${where} — nothing to do here.`,
            share_url: recheck.shareUrl ?? null,
          };
        }
        if (recheck.status === 'ready_for_publish') {
          return { ok: true, next_step: 'paywall', already_ready: true };
        }
      }
      // Unreachable in practice; degrade to idempotent success.
      return { ok: true, next_step: 'paywall', already_ready: true };
    }

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
