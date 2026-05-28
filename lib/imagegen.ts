import { putBytes, blobKey } from './storage';
import { q, q1opt } from './db';

interface HeroOpts {
  prompt: string;
  aspect?: '16:9' | '4:3' | '1:1' | '9:16';
  peek_id: string;
}

interface HeroResult {
  ok: boolean;
  url?: string;
  provider?: string;
  error?: string;
}

const REPLICATE_MODEL = 'black-forest-labs/flux-schnell';

const ASPECT_DIMS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '4:3': { width: 1024, height: 768 },
  '1:1': { width: 1024, height: 1024 },
  '9:16': { width: 720, height: 1280 }
};

export async function generateHero(opts: HeroOpts): Promise<HeroResult> {
  const dims = ASPECT_DIMS[opts.aspect || '16:9'];

  if (process.env.REPLICATE_API_TOKEN) {
    try {
      const url = await viaReplicate(opts.prompt, dims);
      if (url) {
        const stored = await cacheRemoteImage(url, opts.peek_id, 'hero', 'webp');
        return { ok: true, url: stored.publicUrl, provider: 'replicate' };
      }
    } catch (e) {
      console.error('replicate gen failed', e);
    }
  }

  if (process.env.FAL_API_KEY) {
    try {
      const url = await viaFal(opts.prompt, dims);
      if (url) {
        const stored = await cacheRemoteImage(url, opts.peek_id, 'hero', 'webp');
        return { ok: true, url: stored.publicUrl, provider: 'fal' };
      }
    } catch (e) {
      console.error('fal gen failed', e);
    }
  }

  const svg = gradientPlaceholder(opts.prompt, dims);
  const stored = await putBytes(blobKey('hero/fallback', opts.peek_id, 'svg'), new TextEncoder().encode(svg), {
    contentType: 'image/svg+xml'
  });
  return { ok: true, url: stored.publicUrl, provider: 'fallback-svg' };
}

async function viaReplicate(prompt: string, dims: { width: number; height: number }): Promise<string | null> {
  const res = await fetch('https://api.replicate.com/v1/models/' + REPLICATE_MODEL + '/predictions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.REPLICATE_API_TOKEN,
      'Content-Type': 'application/json',
      Prefer: 'wait=60'
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: aspectRatioForReplicate(dims),
        num_outputs: 1,
        output_format: 'webp',
        output_quality: 85,
        megapixels: '1',
        go_fast: true
      }
    })
  });
  if (!res.ok) {
    console.error('replicate http', res.status, await res.text().catch(() => ''));
    return null;
  }
  const body = await res.json();
  const output = body.output;
  if (Array.isArray(output) && output[0]) return output[0];
  if (typeof output === 'string') return output;
  const pollUrl = body.urls?.get;
  if (pollUrl) {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const r2 = await fetch(pollUrl, { headers: { Authorization: 'Bearer ' + process.env.REPLICATE_API_TOKEN } });
      const d = await r2.json();
      if (d.status === 'succeeded') {
        const o = d.output;
        return Array.isArray(o) ? o[0] : typeof o === 'string' ? o : null;
      }
      if (d.status === 'failed' || d.status === 'canceled') return null;
    }
  }
  return null;
}

function aspectRatioForReplicate(dims: { width: number; height: number }): string {
  const r = dims.width / dims.height;
  if (Math.abs(r - 16 / 9) < 0.05) return '16:9';
  if (Math.abs(r - 4 / 3) < 0.05) return '4:3';
  if (Math.abs(r - 9 / 16) < 0.05) return '9:16';
  return '1:1';
}

async function viaFal(prompt: string, dims: { width: number; height: number }): Promise<string | null> {
  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: 'Key ' + process.env.FAL_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      image_size: { width: dims.width, height: dims.height },
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: false
    })
  });
  if (!res.ok) {
    console.error('fal http', res.status, await res.text().catch(() => ''));
    return null;
  }
  const body = await res.json();
  return body.images?.[0]?.url ?? null;
}

async function cacheRemoteImage(
  url: string,
  peekId: string,
  prefix: string,
  ext: string
): Promise<{ publicUrl: string; key: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch source image failed: ' + res.status);
  const buf = new Uint8Array(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/' + ext;
  const stored = await putBytes(blobKey(prefix, peekId, ext), buf, { contentType });
  return { publicUrl: stored.publicUrl, key: stored.key };
}

function gradientPlaceholder(prompt: string, dims: { width: number; height: number }): string {
  let h = 0;
  for (const c of prompt) h = (h * 31 + c.charCodeAt(0)) | 0;
  const h1 = ((h % 360) + 360) % 360;
  const h2 = (h1 + 60) % 360;
  const label = prompt.slice(0, 64).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${h1} 70% 60%)"/>
        <stop offset="100%" stop-color="hsl(${h2} 70% 45%)"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
      font-family="Georgia, serif" font-size="${Math.round(dims.height/20)}" fill="rgba(255,255,255,0.65)" font-style="italic">${label}</text>
  </svg>`;
}

export async function generateOgImage(peekId: string): Promise<string | null> {
  const peek = await q1opt<any>(
    `SELECT id, slug, recipient_name, occasion, relationship, vibe, hero_image_url, note_md FROM peeks WHERE id = $1`,
    [peekId]
  );
  if (!peek) return null;
  const cached = await q1opt<{ image_url: string }>(`SELECT image_url FROM og_images WHERE peek_id = $1`, [peekId]);
  if (cached) return cached.image_url;

  const palette = peek.vibe?.palette || { bg: '#0f0f10', surface: '#1a1a1a', ink: '#f4f4f4', accent: '#ff5a3c' };
  const recipient = (peek.recipient_name || 'someone special').slice(0, 40);
  const occasion = (peek.occasion || '').slice(0, 40).toUpperCase();
  const heroBg = peek.hero_image_url
    ? `<image href="${escapeAttr(peek.hero_image_url)}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice" opacity="0.55" />`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <radialGradient id="vibe" cx="20%" cy="20%" r="90%">
        <stop offset="0%" stop-color="${escapeAttr(palette.accent)}" stop-opacity="0.45"/>
        <stop offset="60%" stop-color="${escapeAttr(palette.bg)}" stop-opacity="1"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="${escapeAttr(palette.bg)}"/>
    ${heroBg}
    <rect width="100%" height="100%" fill="url(#vibe)"/>
    <text x="60" y="100" font-family="Georgia, serif" font-size="36" fill="${escapeAttr(palette.accent)}" letter-spacing="6">${escapeText(occasion || 'A PEEK')}</text>
    <text x="60" y="280" font-family="Georgia, serif" font-style="italic" font-size="120" fill="${escapeAttr(palette.ink)}">for ${escapeText(recipient)}</text>
    <text x="60" y="370" font-family="ui-sans-serif, system-ui, sans-serif" font-size="32" fill="${escapeAttr(palette.ink)}" opacity="0.75">
      something they actually want.
    </text>
    <text x="60" y="570" font-family="Georgia, serif" font-size="40" fill="${escapeAttr(palette.accent)}">peek.gift</text>
  </svg>`;
  const stored = await putBytes(blobKey('og', peekId, 'svg'), new TextEncoder().encode(svg), {
    contentType: 'image/svg+xml'
  });
  await q(
    `INSERT INTO og_images (peek_id, image_url, image_key, created_at) VALUES ($1,$2,$3, now())
     ON CONFLICT (peek_id) DO UPDATE SET image_url = EXCLUDED.image_url, image_key = EXCLUDED.image_key, created_at = now()`,
    [peekId, stored.publicUrl, stored.key]
  );
  return stored.publicUrl;
}

function escapeAttr(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
function escapeText(s: string): string {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
}
