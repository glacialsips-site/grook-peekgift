import 'server-only';
import { randomUUID } from 'node:crypto';
import { env } from '@/lib/env';
import { getSupabaseService } from './service';

const BUCKET = env.SUPABASE_STORAGE_BUCKET ?? 'peek-v2-assets';

export async function uploadAsset(opts: {
  path?: string;
  data: Buffer | Uint8Array | Blob;
  contentType: string;
  cacheControl?: string;
  upsert?: boolean;
}): Promise<{ path: string; publicUrl: string }> {
  const path = opts.path ?? `${new Date().toISOString().slice(0, 10)}/${randomUUID()}`;
  const client = getSupabaseService();
  const { error } = await client.storage.from(BUCKET).upload(path, opts.data, {
    contentType: opts.contentType,
    cacheControl: opts.cacheControl ?? '604800',
    upsert: opts.upsert ?? false,
  });
  if (error) throw error;
  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function deleteAsset(path: string): Promise<void> {
  const { error } = await getSupabaseService().storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export function getPublicUrl(path: string): string {
  return getSupabaseService().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
