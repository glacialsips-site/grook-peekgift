import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { q, q1opt } from '@/lib/db';
import { generateOgImage } from '@/lib/imagegen';
import RecipientView from './RecipientView';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const peek = await q1opt<any>(
    `SELECT id, recipient_name, occasion, vibe FROM peeks WHERE slug = $1 AND status IN ('published','claimed')`,
    [slug]
  );
  if (!peek) return {};
  const og = (await generateOgImage(peek.id).catch(() => null)) || undefined;
  const title = `a peek for ${peek.recipient_name || 'someone special'}`;
  const description = peek.occasion ? `${peek.occasion} — open it.` : 'open it.';
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      images: og ? [{ url: og, width: 1200, height: 630 }] : undefined,
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: og ? [og] : undefined
    }
  };
}

export default async function GiftPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const peek = await q1opt<any>(`SELECT * FROM peeks WHERE slug = $1`, [slug]);
  if (!peek) notFound();
  if (peek.status === 'draft' || peek.status === 'archived') notFound();

  const [cards, vgs, picks] = await Promise.all([
    q<any>(`SELECT * FROM cards WHERE peek_id = $1 ORDER BY position ASC`, [peek.id]),
    q<any>(`SELECT * FROM variant_groups WHERE peek_id = $1`, [peek.id]),
    q<{ card_id: string }>(`SELECT card_id FROM picks WHERE peek_id = $1`, [peek.id])
  ]);

  // Log a view (fire and forget)
  q(`INSERT INTO recipient_views (peek_id) VALUES ($1)`, [peek.id]).catch(() => {});

  return (
    <RecipientView
      peek={peek}
      cards={cards}
      variantGroups={vgs}
      pickedCardIds={picks.map((p) => p.card_id)}
      slug={slug}
    />
  );
}
