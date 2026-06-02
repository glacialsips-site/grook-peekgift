import { createClient } from "@supabase/supabase-js";

// Host an uploaded photo so it has a real, renderable URL. The studio sends the base64;
// we store it in the public `peek-v2-assets` bucket (service-role) and return the public URL,
// which the model then sets as the hero or a card's media. Without Supabase env this 503s
// honestly (no silent fallback). Bucket verified: public, 10MB cap, image mimes only.
export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = process.env.PEEK_V2_STORAGE_BUCKET ?? process.env.SUPABASE_STORAGE_BUCKET ?? "peek-v2-assets";

export async function POST(req: Request): Promise<Response> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ error: "image storage isn't configured in this environment" }, { status: 503 });

  let body: { data?: string; media_type?: string };
  try {
    body = (await req.json()) as { data?: string; media_type?: string };
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const mediaType = body.media_type ?? "image/jpeg";
  if (!ALLOWED.has(mediaType)) return Response.json({ error: `unsupported image type: ${mediaType}` }, { status: 415 });
  if (!body.data) return Response.json({ error: "no image data" }, { status: 400 });

  const bytes = Buffer.from(body.data, "base64");
  if (bytes.byteLength === 0) return Response.json({ error: "empty or corrupt image" }, { status: 400 });
  if (bytes.byteLength > MAX_BYTES) return Response.json({ error: "image too large (max 10MB)" }, { status: 413 });

  const ext = (mediaType.split("/")[1] ?? "jpg").replace("jpeg", "jpg").replace("+xml", "");
  const path = `uploads/${crypto.randomUUID()}.${ext}`;

  const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supa.storage.from(BUCKET).upload(path, bytes, { contentType: mediaType, upsert: false });
  if (error) return Response.json({ error: `storage upload failed: ${error.message}` }, { status: 502 });

  const { data } = supa.storage.from(BUCKET).getPublicUrl(path);
  return Response.json({ url: data.publicUrl, path });
}
