import { notFound, redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import { sendEmail } from '@/lib/email/send';
import { PeekPublishedEmail } from '@/lib/email/templates/peek-published';
import { ShareSheet } from '@/components/build/share-sheet';

export const dynamic = 'force-dynamic';

function buildShareUrl(slug: string): string {
  const base = env.APP_URL.replace(/\/+$/, '');
  return `${base}/g/${slug}`;
}

async function maybeSendConfirmation(args: {
  peekId: string;
  userId: string;
  recipientName: string | null;
  occasion: string | null;
  shareUrl: string;
  toEmail: string | null;
}): Promise<void> {
  if (!args.toEmail) return;
  const db = getSupabaseService();
  const { count, error: countErr } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('peek_id', args.peekId)
    .eq('kind', 'curator_published_email');
  if (countErr) return;
  if ((count ?? 0) > 0) return;

  const subject = args.recipientName
    ? `${args.recipientName}'s Peek is live`
    : 'Your Peek is live';

  const result = await sendEmail({
    to: args.toEmail,
    subject,
    react: (
      <PeekPublishedEmail
        recipientName={args.recipientName}
        occasion={args.occasion}
        shareUrl={args.shareUrl}
      />
    ),
  });

  await db.from('events').insert({
    peek_id: args.peekId,
    user_id: args.userId,
    kind: 'curator_published_email',
    payload: {
      to: args.toEmail,
      outcome: result.ok ? 'sent' : 'failed',
      error: result.ok ? null : result.error,
    },
  });
}

export default async function PublishSharePage({
  params,
}: {
  params: Promise<{ peekId: string }>;
}) {
  const { peekId } = await params;
  const { userId } = await auth();
  if (!userId) {
    redirect(`/sign-in?returnTo=/build/${peekId}/publish/share`);
  }

  const sb = getSupabaseService();
  const { data: peek, error } = await sb
    .from('peeks')
    .select('id, slug, curator_id, recipient_name, occasion, status, share_url')
    .eq('id', peekId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load peek: ${error.message}`);
  }
  if (!peek) notFound();
  if (peek.curator_id !== userId) notFound();
  if (peek.status !== 'published') {
    redirect(`/build/${peekId}/publish/checkout`);
  }

  const shareUrl = peek.share_url ?? buildShareUrl(peek.slug);

  const user = await currentUser();
  const toEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;
  const curatorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.username ||
    null;

  await maybeSendConfirmation({
    peekId: peek.id,
    userId,
    recipientName: peek.recipient_name,
    occasion: peek.occasion,
    shareUrl,
    toEmail,
  });

  const ogImageUrl = `${env.APP_URL.replace(/\/+$/, '')}/g/${peek.slug}/opengraph-image`;

  return (
    <main
      id="main"
      className="min-h-[100dvh] bg-background"
      aria-label="Share your published Peek"
    >
      <ShareSheet
        peekId={peek.id}
        slug={peek.slug}
        shareUrl={shareUrl}
        recipientName={peek.recipient_name}
        occasion={peek.occasion}
        curatorName={curatorName}
        ogImageUrl={ogImageUrl}
      />
    </main>
  );
}
