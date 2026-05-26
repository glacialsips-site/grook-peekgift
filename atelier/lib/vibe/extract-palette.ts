import 'server-only';
import { Vibrant } from 'node-vibrant/node';

export interface ExtractedPalette {
  bg: string;
  surface: string;
  ink: string;
  accent: string;
  accent2: string;
}

const DEFAULT_PALETTE: ExtractedPalette = {
  bg: '#F4EFE6',
  surface: '#E8DFCF',
  ink: '#23201D',
  accent: '#B86E4A',
  accent2: '#6C8EAD',
};

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 12 * 1024 * 1024;

export async function extractPalette(
  imageUrl: string,
): Promise<ExtractedPalette> {
  try {
    const buffer = await fetchImageBuffer(imageUrl);
    if (!buffer) return DEFAULT_PALETTE;

    const swatches = await Vibrant.from(buffer).getPalette();

    return {
      bg:
        swatches.LightMuted?.hex ??
        swatches.LightVibrant?.hex ??
        DEFAULT_PALETTE.bg,
      surface:
        swatches.Muted?.hex ?? swatches.LightMuted?.hex ?? DEFAULT_PALETTE.surface,
      ink:
        swatches.DarkMuted?.hex ??
        swatches.DarkVibrant?.hex ??
        DEFAULT_PALETTE.ink,
      accent:
        swatches.Vibrant?.hex ??
        swatches.DarkVibrant?.hex ??
        DEFAULT_PALETTE.accent,
      accent2:
        swatches.LightVibrant?.hex ??
        swatches.Vibrant?.hex ??
        DEFAULT_PALETTE.accent2,
    };
  } catch (err) {
    console.warn('[extract-palette] failed', {
      imageUrl,
      message: err instanceof Error ? err.message : String(err),
    });
    return DEFAULT_PALETTE;
  }
}

async function fetchImageBuffer(imageUrl: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(imageUrl, { signal: controller.signal });
    if (!res.ok) return null;
    const contentLength = res.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_BYTES) {
      return null;
    }
    const ab = await res.arrayBuffer();
    if (ab.byteLength > MAX_BYTES) return null;
    return Buffer.from(ab);
  } finally {
    clearTimeout(timeout);
  }
}
