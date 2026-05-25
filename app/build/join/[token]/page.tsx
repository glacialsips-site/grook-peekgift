import { safeAuth as auth, safeCurrentUser as currentUser } from '@/lib/clerk-safe';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { q, q1opt } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function JoinAsContributor({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await q1opt<{
    peek_id: string; accepted_at: string | null; invited_by: string;
  }>(`SELECT peek_id, accepted_at, invited_by FROM invites WHERE token = $1`, [token]);
  if (!invite) {
    return (
      <main className="min-h-dvh chrome-bg flex items-center justify-center p-6">
        <div className="text-center text-white max-w-md">
          <div className="text-4xl mb-3">🤔</div>
          <div className="font-display text-2xl">this invite expired or never existed</div>
          <div className="opacity-60 mt-2">ask whoever sent it for a fresh link.</div>
        </div>
      </main>
    );
  }

  const peek = await q1opt<{
    recipient_name: string | null; occasion: string | null; hero_image_url: string | null;
    vibe: any;
  }>(`SELECT recipient_name, occasion, hero_image_url, vibe FROM peeks WHERE id = $1`, [invite.peek_id]);
  if (!peek) redirect('/');

  const { userId } = await auth();
  if (!userId) {
    // Bounce through sign-in; come back here after.
    return (
      <main className="min-h-dvh chrome-bg flex items-center justify-center p-6">
        <div className="max-w-md text-center text-white">
          <Hero peek={peek} />
          <div className="mt-6 font-display text-2xl">you got invited.</div>
          <div className="opacity-70 mt-1 text-sm">
            sign in to add your cards to {peek.recipient_name || 'their'} peek.
          </div>
          <Link
            href={`/sign-in?redirect_url=${encodeURIComponent(`/build/join/${token}`)}`}
            className="inline-block mt-6 rounded-full bg-[var(--peek-accent)] text-black px-7 py-3 font-medium"
          >
            sign in to join
          </Link>
        </div>
      </main>
    );
  }

  // Already signed in — accept the invite
  const user = await currentUser();
  await q(
    `INSERT INTO curators (clerk_user_id, email, display_name)
     VALUES ($1,$2,$3)
     ON CONFLICT (clerk_user_id) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name`,
    [userId, user?.emailAddresses?.[0]?.emailAddress || null, user?.firstName || user?.username || null]
  );
  if (!invite.accepted_at) {
    await q(`UPDATE invites SET accepted_at = now() WHERE token = $1`, [token]);
  }
  await q(
    `INSERT INTO contributors (peek_id, clerk_user_id, role, display_name)
     VALUES ($1,$2,'co_curator',$3)
     ON CONFLICT (peek_id, clerk_user_id) DO NOTHING`,
    [invite.peek_id, userId, user?.firstName || user?.username || null]
  );

  // For now, co-curators land on the build page in shared mode (TODO: build a co-curator chat
  // scoped to this peek). Drop a flag so the chat opens for this specific peek.
  redirect(`/build?peek_id=${invite.peek_id}`);
}

function Hero({ peek }: { peek: any }) {
  return (
    <div className="rounded-2xl overflow-hidden border chrome-line aspect-[16/10]">
      {peek.hero_image_url ? (
        <img src={peek.hero_image_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[var(--peek-accent)]/40 to-[var(--peek-accent-2)]/40" />
      )}
    </div>
  );
}
