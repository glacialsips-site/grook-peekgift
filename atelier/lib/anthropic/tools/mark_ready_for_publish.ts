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

    // Already published / claimed / archived → refuse + do not emit the event,
    // do not re-surface the paywall.
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

    // Status is 'draft' or 'ready_for_publish'. Idempotency: if status is
    // already ready_for_publish, don't re-emit the event and don't re-surface
    // the paywall as a "new" step.
    if (peek.status === 'ready_for_publish') {
      return { ok: true, next_step: 'paywall', already_ready: true };
    }

    // Preconditions for marking ready.
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

    // Vibe must be set with at least a preset — proves the vibe engine ran.
    const vibe = peek.vibe as { preset?: unknown } | null;
    if (!vibe || typeof vibe.preset !== 'string' || vibe.preset.length === 0) {
      missing.push('vibe_preset');
    }

    // At least one real (non-taunt) card.
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

    // Atomic transition: only flip status if still in draft. Also stamp
    // metadata.markedReadyAt for audit / analytics + back-compat with any
    // pre-enum tooling that reads the metadata key. This guards against a
    // concurrent call that races us to ready/publish.
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
      // Lost the race — re-read and answer accordingly.
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
      // Fallthrough — shouldn't happen, but degrade gracefully.
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
