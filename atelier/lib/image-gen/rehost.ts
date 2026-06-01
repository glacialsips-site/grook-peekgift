import 'server-only';
import { randomUUID } from 'node:crypto';
import { withRetry } from '@/lib/retry';
import { uploadAsset } from '@/lib/supabase/storage';

export interface RehostInput {
  sourceUrl: string;
  pathPrefix: string;
}

export interface RehostResult {
  publicUrl: string;
  path: string;
  contentType: string;
  sizeBytes: number;
}

const EXT_FROM_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

function extFromContentType(contentType: string): string {
  const base = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  const mapped = EXT_FROM_MIME[base];
  if (mapped) return mapped;
  const tail = base.split('/')[1];
  return tail && /^[a-z0-9]+$/i.test(tail) ? tail : 'bin';
}

export async function rehostImage(opts: RehostInput): Promise<RehostResult> {
  const res = await withRetry(
    async () => {
      const r = await fetch(opts.sourceUrl);
      if (!r.ok) {
        throw new Error(`rehost_fetch_failed_${r.status}`);
      }
      return r;
    },
    { label: 'rehost.download', attempts: 3 },
  );
  const contentType = res.headers.get('content-type') ?? 'image/png';
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = extFromContentType(contentType);
  const prefix = opts.pathPrefix.replace(/^\/+|\/+$/g, '');
  const path = `${prefix}/${randomUUID()}.${ext}`;
  const uploaded = await uploadAsset({ path, data: buf, contentType });
  return {
    publicUrl: uploaded.publicUrl,
    path: uploaded.path,
    contentType,
    sizeBytes: buf.length,
  };
}
