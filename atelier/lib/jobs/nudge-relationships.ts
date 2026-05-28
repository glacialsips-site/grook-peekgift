import 'server-only';
import { cron } from 'inngest';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { inngest } from '@/lib/inngest/client';
import { db } from '@/db/client';
import { events, users } from '@/db/schema';
import { sendEmail } from '@/lib/email/send';
import { RelationshipNudgeEmail } from '@/lib/email/templates/relationship-nudge';

type NudgeRow = {
  id: string;
  user_id: string;
  recipient_name: string;
  relationship: string | null;
  upcoming_kind: 'birthday' | 'anniversary';
  upcoming_date: string;
  last_peek_id: string | null;
};

function toArray<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    result !== null &&
    typeof result === 'object' &&
    'rows' in result &&
    Array.isArray((result as { rows: unknown }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export const dailyNudgeFn = inngest.createFunction(
  {
    id: 'daily-nudge',
    name: 'Daily relationship nudge sweep',
    triggers: [cron('0 14 * * *')],
  },
  async ({ step }) => {
    const candidates = await step.run('find-nudges', async () => {
      const rows = await db.execute<NudgeRow>(sql`
        SELECT
          r.id,
          r.user_id,
          r.recipient_name,
          r.relationship,
          r.last_peek_id,
          CASE
            WHEN r.birthday IS NOT NULL
              AND date_trunc('day', (r.birthday + (date_part('year', age(r.birthday)) + 1) * interval '1 year'))
                  = date_trunc('day', (now() + interval '14 days') AT TIME ZONE 'UTC')
            THEN 'birthday'
            ELSE 'anniversary'
          END AS upcoming_kind,
          CASE
            WHEN r.birthday IS NOT NULL
              AND date_trunc('day', (r.birthday + (date_part('year', age(r.birthday)) + 1) * interval '1 year'))
                  = date_trunc('day', (now() + interval '14 days') AT TIME ZONE 'UTC')
            THEN to_char(r.birthday + (date_part('year', age(r.birthday)) + 1) * interval '1 year', 'YYYY-MM-DD')
            ELSE to_char(r.anniversary + (date_part('year', age(r.anniversary)) + 1) * interval '1 year', 'YYYY-MM-DD')
          END AS upcoming_date
        FROM peek_v2.relationships r
        WHERE
          (
            r.birthday IS NOT NULL
            AND date_trunc('day', (r.birthday + (date_part('year', age(r.birthday)) + 1) * interval '1 year'))
                = date_trunc('day', (now() + interval '14 days') AT TIME ZONE 'UTC')
          )
          OR (
            r.anniversary IS NOT NULL
            AND date_trunc('day', (r.anniversary + (date_part('year', age(r.anniversary)) + 1) * interval '1 year'))
                = date_trunc('day', (now() + interval '14 days') AT TIME ZONE 'UTC')
          )
      `);
      return toArray<NudgeRow>(rows);
    });

    for (const r of candidates) {
      await step.run(`nudge-${r.id}`, async () => {
        const year = new Date().getUTCFullYear();
        const dedupePayload = {
          relationshipId: r.id,
          kind: r.upcoming_kind,
          year,
        };

        const already = await db
          .select({ id: events.id })
          .from(events)
          .where(
            and(
              eq(events.kind, 'nudge_sent'),
              eq(events.userId, r.user_id),
              gte(events.ts, sql`date_trunc('year', now())`),
              lt(events.ts, sql`date_trunc('year', now()) + interval '1 year'`),
              sql`payload->>'relationshipId' = ${r.id}`,
              sql`payload->>'kind' = ${r.upcoming_kind}`,
            ),
          )
          .limit(1);
        if (already.length > 0) return { skipped: 'already_sent' as const };

        const curator = await db
          .select({ email: users.email, displayName: users.displayName })
          .from(users)
          .where(eq(users.clerkUserId, r.user_id))
          .limit(1);
        const curatorRow = curator[0];
        if (!curatorRow || !curatorRow.email) {
          return { skipped: 'no_email' as const };
        }

        const result = await sendEmail({
          to: curatorRow.email,
          subject:
            r.upcoming_kind === 'birthday'
              ? `${r.recipient_name}'s birthday is in 2 weeks`
              : `${r.recipient_name}'s anniversary is in 2 weeks`,
          react: RelationshipNudgeEmail({
            recipientName: r.recipient_name,
            relationship: r.relationship,
            kind: r.upcoming_kind,
            upcomingDate: r.upcoming_date,
            hadPriorPeek: Boolean(r.last_peek_id),
            curatorDisplayName: curatorRow.displayName,
          }),
        });

        await db.insert(events).values({
          userId: r.user_id,
          kind: 'nudge_sent',
          payload: {
            ...dedupePayload,
            email_result: result,
          },
        });

        return { sent: result.ok };
      });
    }

    return { processed: candidates.length };
  },
);
