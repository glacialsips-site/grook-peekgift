import { safeAuth as auth } from '@/lib/clerk-safe';
import { redirect } from 'next/navigation';
import { q1opt } from '@/lib/db';
import Link from 'next/link';
import ShareActions from './ShareActions';

export const dynamic = 'force-dynamic';

export default async function Done({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const { id } = await params;
  const peek = await q1opt<{
    slug: string; status: string; recipient_name: string | null;
    occasion: string | null; share_url: string | null; vibe: any;
    hero_image_url: string | null;
  }>(
    `SELECT slug, status, recipient_name, occasion, share_url, vibe, hero_image_url
     FROM peeks WHERE id = $1 AND curator_id = $2`,
    [id, userId]
  );
  if (!peek) redirect('/build');

  const base = process.env.APP_URL || '';
  const url = peek.share_url || (peek.slug ? `${base}/g/${peek.slug}` : null);
  const accent = peek.vibe?.palette?.accent || '#ff5a3c';

  return (
    <main className="min-h-dvh chrome-bg flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="relative rounded-3xl overflow-hidden border chrome-line aspect-[16/10] mb-6">
          {peek.hero_image_url ? (
            <img src={peek.hero_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accent}40, ${accent}10)` }} />
          )}
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 to-transparent">
            <div className="text-[10px] uppercase tracking-[0.22em] opacity-80 text-white">
              {peek.occasion || 'a peek'}
            </div>
            <div className="font-display text-2xl text-white">for {peek.recipient_name || 'them'}</div>
          </div>
          <div className="absolute top-3 left-3 rounded-full bg-[var(--peek-accent)] text-black text-[10px] uppercase tracking-wider px-2 py-1 font-medium">
            live
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="font-display text-3xl text-white">it&apos;s live.</div>
          <div className="opacity-70 mt-1 text-[var(--chrome-mute)]">
            share with {peek.recipient_name || 'them'}. they pick — you ship the truth.
          </div>
        </div>

        {url && peek.recipient_name && (
          <ShareActions shareUrl={url} recipientName={peek.recipient_name} occasion={peek.occasion} />
        )}

        <div className="mt-6 flex gap-2">
          {url && (
            <Link
              href={url}
              className="flex-1 text-center rounded-full bg-white/10 text-white px-4 py-2.5 text-sm hover:bg-white/15"
            >
              preview it
            </Link>
          )}
          <Link
            href="/dashboard"
            className="flex-1 text-center rounded-full border border-white/15 px-4 py-2.5 text-sm text-white"
          >
            my peeks
          </Link>
        </div>
      </div>
    </main>
  );
}
