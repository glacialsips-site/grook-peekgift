import 'server-only';
import { inflateSync } from 'node:zlib';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'vibe/extract-palette' });

export interface ExtractedPalette {
  bg: string;
  surface: string;
  ink: string;
  accent: string;
  accent2: string;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const DEFAULT_PALETTE: ExtractedPalette = {
  bg: '#F4EFE6',
  surface: '#E8DFCF',
  ink: '#23201D',
  accent: '#B86E4A',
  accent2: '#6C8EAD',
};

const FETCH_TIMEOUT_MS = 10_000;
const TARGET_SAMPLES = 4096;
const KMEANS_ITERATIONS = 8;
const KMEANS_K = 5;

export async function extractPalette(
  imageUrl: string,
): Promise<ExtractedPalette> {
  try {
    const pixels = await loadPixels(imageUrl);
    if (pixels.length === 0) return DEFAULT_PALETTE;
    const clusters = kmeans(pixels, KMEANS_K);
    return paletteFromClusters(clusters);
  } catch (err) {
    log.warn('extractPalette failed', {
      imageUrl,
      err: err instanceof Error ? err.message : String(err),
    });
    return DEFAULT_PALETTE;
  }
}

async function loadPixels(imageUrl: string): Promise<Rgb[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let bytes: Uint8Array;
  try {
    const res = await fetch(imageUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    bytes = new Uint8Array(buf);
  } finally {
    clearTimeout(timeout);
  }

  if (isPng(bytes)) return decodePngSamples(bytes);
  if (isJpeg(bytes)) return decodeJpegSamples(bytes);
  return [];
}

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

interface PngHeader {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  interlace: number;
}

function decodePngSamples(bytes: Uint8Array): Rgb[] {
  const chunks = readPngChunks(bytes);
  const ihdr = chunks.find((c) => c.type === 'IHDR');
  if (!ihdr) return [];
  const header = parseIhdr(ihdr.data);
  if (header.interlace !== 0) return [];
  if (header.bitDepth !== 8) return [];
  if (header.colorType !== 2 && header.colorType !== 6) return [];

  const idatChunks = chunks.filter((c) => c.type === 'IDAT');
  if (idatChunks.length === 0) return [];
  const totalLen = idatChunks.reduce((acc, c) => acc + c.data.length, 0);
  const compressed = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of idatChunks) {
    compressed.set(c.data, offset);
    offset += c.data.length;
  }
  const raw = inflateSync(compressed);
  const bpp = header.colorType === 6 ? 4 : 3;
  const stride = header.width * bpp + 1;
  if (raw.length < stride * header.height) return [];

  const samples: Rgb[] = [];
  const step = Math.max(
    1,
    Math.floor((header.width * header.height) / TARGET_SAMPLES),
  );
  let counter = 0;
  const prev = new Uint8Array(header.width * bpp);
  const current = new Uint8Array(header.width * bpp);
  for (let y = 0; y < header.height; y++) {
    const rowStart = y * stride;
    const filter = raw[rowStart] ?? 0;
    for (let x = 0; x < header.width * bpp; x++) {
      const rawByte = raw[rowStart + 1 + x] ?? 0;
      const left = x >= bpp ? (current[x - bpp] ?? 0) : 0;
      const up = prev[x] ?? 0;
      const upLeft = x >= bpp ? (prev[x - bpp] ?? 0) : 0;
      let value = rawByte;
      switch (filter) {
        case 0:
          break;
        case 1:
          value = (rawByte + left) & 0xff;
          break;
        case 2:
          value = (rawByte + up) & 0xff;
          break;
        case 3:
          value = (rawByte + ((left + up) >> 1)) & 0xff;
          break;
        case 4:
          value = (rawByte + paeth(left, up, upLeft)) & 0xff;
          break;
        default:
          return [];
      }
      current[x] = value;
    }
    for (let x = 0; x < header.width; x++) {
      counter++;
      if (counter % step !== 0) continue;
      const base = x * bpp;
      const r = current[base] ?? 0;
      const g = current[base + 1] ?? 0;
      const b = current[base + 2] ?? 0;
      if (bpp === 4) {
        const a = current[base + 3] ?? 0;
        if (a < 16) continue;
      }
      samples.push({ r, g, b });
    }
    prev.set(current);
  }
  return samples;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

interface PngChunk {
  type: string;
  data: Uint8Array;
}

function readPngChunks(bytes: Uint8Array): PngChunk[] {
  const chunks: PngChunk[] = [];
  let cursor = 8;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (cursor + 8 <= bytes.length) {
    const length = view.getUint32(cursor);
    const type = String.fromCharCode(
      bytes[cursor + 4] ?? 0,
      bytes[cursor + 5] ?? 0,
      bytes[cursor + 6] ?? 0,
      bytes[cursor + 7] ?? 0,
    );
    const dataStart = cursor + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) break;
    chunks.push({ type, data: bytes.subarray(dataStart, dataEnd) });
    cursor = dataEnd + 4;
    if (type === 'IEND') break;
  }
  return chunks;
}

function parseIhdr(data: Uint8Array): PngHeader {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    width: view.getUint32(0),
    height: view.getUint32(4),
    bitDepth: data[8] ?? 0,
    colorType: data[9] ?? 0,
    interlace: data[12] ?? 0,
  };
}

function decodeJpegSamples(bytes: Uint8Array): Rgb[] {
  const { width, height } = parseJpegDimensions(bytes);
  if (width === 0 || height === 0) return [];
  const samples: Rgb[] = [];
  const totalPixels = width * height;
  const targetSamples = Math.min(TARGET_SAMPLES, Math.max(64, totalPixels));
  const stride = Math.max(1, Math.floor(bytes.length / targetSamples / 3));
  let cursor = findJpegScanStart(bytes);
  if (cursor < 0) cursor = 0;
  for (let i = cursor; i + 2 < bytes.length; i += 3 * stride) {
    const r = bytes[i] ?? 0;
    const g = bytes[i + 1] ?? 0;
    const b = bytes[i + 2] ?? 0;
    samples.push({ r, g, b });
    if (samples.length >= targetSamples) break;
  }
  return samples;
}

function parseJpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  let cursor = 2;
  while (cursor + 8 < bytes.length) {
    if (bytes[cursor] !== 0xff) {
      cursor++;
      continue;
    }
    const marker = bytes[cursor + 1] ?? 0;
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd9)) {
      cursor += 2;
      continue;
    }
    const segLen =
      ((bytes[cursor + 2] ?? 0) << 8) | (bytes[cursor + 3] ?? 0);
    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3
    ) {
      const height =
        ((bytes[cursor + 5] ?? 0) << 8) | (bytes[cursor + 6] ?? 0);
      const width =
        ((bytes[cursor + 7] ?? 0) << 8) | (bytes[cursor + 8] ?? 0);
      return { width, height };
    }
    cursor += 2 + segLen;
  }
  return { width: 0, height: 0 };
}

function findJpegScanStart(bytes: Uint8Array): number {
  for (let i = 0; i + 1 < bytes.length; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xda) {
      const segLen =
        ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0);
      return i + 2 + segLen;
    }
  }
  return -1;
}

function kmeans(samples: Rgb[], k: number): { center: Rgb; weight: number }[] {
  if (samples.length === 0) return [];
  const centers: Rgb[] = [];
  const step = Math.max(1, Math.floor(samples.length / k));
  for (let i = 0; i < k; i++) {
    const candidate = samples[Math.min(i * step, samples.length - 1)];
    if (candidate) centers.push({ ...candidate });
  }
  while (centers.length < k && centers.length < samples.length) {
    const candidate = samples[centers.length];
    if (!candidate) break;
    centers.push({ ...candidate });
  }
  if (centers.length === 0) return [];

  const assignments = new Array<number>(samples.length).fill(0);
  for (let iter = 0; iter < KMEANS_ITERATIONS; iter++) {
    let moved = false;
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      if (!sample) continue;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const center = centers[c];
        if (!center) continue;
        const dr = sample.r - center.r;
        const dg = sample.g - center.g;
        const db = sample.b - center.b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = c;
        }
      }
      if (assignments[i] !== bestIdx) {
        assignments[i] = bestIdx;
        moved = true;
      }
    }
    const sums = centers.map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const slot = sums[assignments[i] ?? 0];
      if (!sample || !slot) continue;
      slot.r += sample.r;
      slot.g += sample.g;
      slot.b += sample.b;
      slot.n += 1;
    }
    for (let c = 0; c < centers.length; c++) {
      const slot = sums[c];
      if (!slot || slot.n === 0) continue;
      centers[c] = {
        r: Math.round(slot.r / slot.n),
        g: Math.round(slot.g / slot.n),
        b: Math.round(slot.b / slot.n),
      };
    }
    if (!moved) break;
  }

  const weights = new Array<number>(centers.length).fill(0);
  for (let i = 0; i < samples.length; i++) {
    const idx = assignments[i] ?? 0;
    weights[idx] = (weights[idx] ?? 0) + 1;
  }
  return centers.map((center, idx) => ({
    center,
    weight: weights[idx] ?? 0,
  }));
}

function paletteFromClusters(
  clusters: { center: Rgb; weight: number }[],
): ExtractedPalette {
  const valid = clusters.filter((c) => c.weight > 0);
  if (valid.length < 2) return DEFAULT_PALETTE;
  const byLuminance = [...valid].sort(
    (a, b) => luminance(a.center) - luminance(b.center),
  );
  const bySaturation = [...valid].sort(
    (a, b) => saturation(b.center) - saturation(a.center),
  );
  const bg = byLuminance[0]?.center ?? valid[0]?.center ?? { r: 244, g: 239, b: 230 };
  const ink = byLuminance[byLuminance.length - 1]?.center ?? bg;
  const surface =
    byLuminance[Math.floor(byLuminance.length / 2)]?.center ?? bg;
  const accent = bySaturation[0]?.center ?? bg;
  const accent2 = bySaturation[1]?.center ?? accent;
  const bgFinal = isHighLuminance(ink) ? bg : ensureDark(bg);
  const inkFinal = isHighLuminance(ink) ? ink : ensureLight(ink, bgFinal);
  return {
    bg: toHex(bgFinal),
    surface: toHex(surface),
    ink: toHex(inkFinal),
    accent: toHex(accent),
    accent2: toHex(accent2),
  };
}

function luminance(c: Rgb): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function saturation(c: Rgb): number {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function isHighLuminance(c: Rgb): boolean {
  return luminance(c) > 127;
}

function ensureDark(c: Rgb): Rgb {
  if (luminance(c) < 200) return c;
  return { r: Math.round(c.r * 0.6), g: Math.round(c.g * 0.6), b: Math.round(c.b * 0.6) };
}

function ensureLight(c: Rgb, bg: Rgb): Rgb {
  if (Math.abs(luminance(c) - luminance(bg)) > 80) return c;
  return luminance(bg) > 127
    ? { r: 35, g: 32, b: 29 }
    : { r: 244, g: 239, b: 230 };
}

function toHex(c: Rgb): string {
  const r = clamp(c.r);
  const g = clamp(c.g);
  const b = clamp(c.b);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

function clamp(n: number): number {
  if (n < 0) return 0;
  if (n > 255) return 255;
  return Math.round(n);
}
