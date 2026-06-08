import { storeImage } from "@/lib/persistence/storage";

const FAL_DIMS: Record<string, { width: number; height: number }> = {
  "16:9": { width: 1280, height: 720 },
  "4:3": { width: 1024, height: 768 },
  "1:1": { width: 1024, height: 1024 },
  "9:16": { width: 720, height: 1280 },
  "3:4": { width: 768, height: 1024 },
};

export interface GenResult {
  ok: boolean;
  url?: string;
  provider?: string;
  error?: string;
}

export async function generateHero(prompt: string, aspect?: string): Promise<GenResult> {
  const key = process.env.FAL_KEY ?? process.env.FAL_API_KEY;
  if (!key) return { ok: false, error: "image generation not configured" };
  const dims = FAL_DIMS[aspect ?? "16:9"] ?? FAL_DIMS["16:9"]!;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45000);
    const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        image_size: dims,
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, error: `fal ${res.status}` };
    const body = (await res.json()) as { images?: { url?: string }[] };
    const falUrl = body.images?.[0]?.url;
    if (!falUrl) return { ok: false, error: "fal returned no image" };
    try {
      const img = await fetch(falUrl);
      if (img.ok) {
        const bytes = new Uint8Array(await img.arrayBuffer());
        const stored = await storeImage(bytes, img.headers.get("content-type") ?? "image/jpeg", "hero");
        if (stored) return { ok: true, url: stored, provider: "fal" };
      }
    } catch {
    }
    return { ok: true, url: falUrl, provider: "fal" };
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? "image generation failed" };
  }
}
