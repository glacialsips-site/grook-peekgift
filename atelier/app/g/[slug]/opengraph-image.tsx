import { ImageResponse } from 'next/og';
import { getSupabaseService } from '@/lib/supabase/service';
import type { Vibe, VibePalette } from '@/lib/peek/types';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'g/[slug]/opengraph-image' });

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'A Peek from peek.gift';

type PeekOgRow = {
  recipient_name: string | null;
  occasion: string | null;
  hero_image_url: string | null;
  vibe: Vibe | null;
};

const DEFAULT_PALETTE: Required<Pick<VibePalette, 'bg' | 'surface' | 'ink' | 'accent'>> & {
  accent2: string;
} = {
  bg: '#0b0a14',
  surface: '#15131f',
  ink: '#fbf7ee',
  accent: '#ff7a59',
  accent2: '#ffd166',
};

function resolvePalette(vibe: Vibe | null) {
  const palette = vibe?.palette;
  return {
    bg: palette?.bg ?? DEFAULT_PALETTE.bg,
    surface: palette?.surface ?? DEFAULT_PALETTE.surface,
    ink: palette?.ink ?? DEFAULT_PALETTE.ink,
    accent: palette?.accent ?? DEFAULT_PALETTE.accent,
    accent2: palette?.accent2 ?? DEFAULT_PALETTE.accent2,
  };
}

function fallbackResponse() {
  const palette = DEFAULT_PALETTE;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: `linear-gradient(135deg, ${palette.bg} 0%, ${palette.surface} 100%)`,
          color: palette.ink,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            color: palette.accent,
          }}
        >
          peek.gift
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 32,
            opacity: 0.8,
          }}
        >
          something thoughtful is waiting
        </div>
      </div>
    ),
    size,
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let peek: PeekOgRow | null = null;
  try {
    const { data } = await getSupabaseService()
      .from('peeks')
      .select('recipient_name, occasion, hero_image_url, vibe')
      .eq('slug', slug)
      .maybeSingle();
    peek = (data as PeekOgRow | null) ?? null;
  } catch (err) {
    log.warn('og_image_lookup_failed', {
      slug,
      err: err instanceof Error ? err.message : String(err),
    });
    peek = null;
  }

  if (!peek) {
    return fallbackResponse();
  }

  const palette = resolvePalette(peek.vibe);
  const recipientName = peek.recipient_name ?? 'you';
  const occasion = peek.occasion ?? '';
  const heroUrl = peek.hero_image_url;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: `linear-gradient(135deg, ${palette.bg} 0%, ${palette.surface} 100%)`,
          color: palette.ink,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {heroUrl ? (
          <img
            src={heroUrl}
            alt=""
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.55,
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.75) 100%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px 80px',
            width: '100%',
            height: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: palette.ink,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: palette.accent,
              }}
            />
            peek.gift
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                fontSize: 36,
                opacity: 0.85,
                letterSpacing: '-0.01em',
              }}
            >
              a Peek for
            </div>
            <div
              style={{
                fontSize: 128,
                fontWeight: 700,
                letterSpacing: '-0.05em',
                lineHeight: 1,
                color: palette.accent,
              }}
            >
              {recipientName}
            </div>
            {occasion ? (
              <div
                style={{
                  fontSize: 40,
                  opacity: 0.92,
                  letterSpacing: '-0.01em',
                  color: palette.accent2,
                }}
              >
                {occasion}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
