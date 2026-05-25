import type { Metadata } from 'next';
import { getSupabaseService } from '@/lib/supabase/service';

type PeekMetaRow = {
  recipient_name: string | null;
  occasion: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let peek: PeekMetaRow | null = null;
  try {
    const { data } = await getSupabaseService()
      .from('peeks')
      .select('recipient_name, occasion')
      .eq('slug', slug)
      .maybeSingle();
    peek = (data as PeekMetaRow | null) ?? null;
  } catch {
    peek = null;
  }

  const recipientName = peek?.recipient_name ?? null;
  const occasion = peek?.occasion ?? null;
  const title = recipientName
    ? `A Peek for ${recipientName}${occasion ? ` — ${occasion}` : ''}`
    : 'peek.gift';
  const description = recipientName
    ? `Open ${recipientName}'s Peek.`
    : 'Open your Peek.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/g/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function Page() {
  return null;
}
