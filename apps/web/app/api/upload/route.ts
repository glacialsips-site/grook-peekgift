import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = process.env.PEEK_V2_STORAGE_BUCKET ?? process.env.SUPABASE_STORAGE_BUCKET ?? "peek-v2-assets";

export async function POST(req: Request): Promise<Response> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ error: "image storage isn't configured in this environment" }, { status: 503 });

  let file: File | null = null;
  try {
    const fd = await req.formData();
    const f = fd.get("file");
    if (f instanceof File) file = f;
  } catch {
    return Response.json({ error: "expected a multipart file upload" }, { status: 400 });
  }
  if (!file) return Response.json({ error: "no file in the upload" }, { status: 400 });

  const mediaType = file.type || "image/jpeg";
  if (!ALLOWED.has(mediaType)) return Response.json({ error: `unsupported image type: ${mediaType}` }, { status: 415 });

  const bytes = Buffer.from(await file.arrayBuffer());
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
