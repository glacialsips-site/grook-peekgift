import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Store image bytes in the public assets bucket → a permanent public URL. Used by the fal
// hero-image adapter (fal urls are ephemeral) and available to any future asset writer.
// Returns null when storage isn't configured or the upload fails — callers fall back.
const BUCKET = process.env.PEEK_V2_STORAGE_BUCKET ?? process.env.SUPABASE_STORAGE_BUCKET ?? "peek-v2-assets";

let _client: SupabaseClient | null = null;
function admin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_client) _client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _client;
}

export async function storeImage(bytes: Uint8Array, contentType: string, prefix = "gen"): Promise<string | null> {
  const supa = admin();
  if (!supa) return null;
  const ext = (contentType.split("/")[1] ?? "webp").replace("jpeg", "jpg").replace("+xml", "");
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supa.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) return null;
  return supa.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
