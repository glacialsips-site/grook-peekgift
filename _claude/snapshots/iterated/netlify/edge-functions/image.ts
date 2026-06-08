// @ts-nocheck
const FAL = "https://fal.run/";

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const falKey =
    (typeof Netlify !== "undefined" && Netlify.env && Netlify.env.get("FAL_KEY")) ||
    (typeof Deno !== "undefined" && Deno.env.get("FAL_KEY")) || "";
  if (!falKey) return new Response(JSON.stringify({ error: "FAL_KEY not set" }), { status: 500, headers: { "content-type": "application/json" } });
  const p = await req.json().catch(() => null);
  if (!p) return new Response("bad request", { status: 400 });

  let model, body;
  if (p.src === "upload" && p.userImage) {
    model = "fal-ai/flux/dev/image-to-image";
    body = { prompt: p.desc || "integrate this photo into the design — cohesive, polished, true to the subject", image_url: p.userImage, strength: 0.5, num_images: 1 };
  } else {
    model = "fal-ai/flux-pro/v1.1";
    body = { prompt: p.desc || "a bespoke editorial illustration that fits the page", image_size: "square_hd", num_images: 1 };
  }
  try {
    const r = await fetch(FAL + model, { method: "POST", headers: { "Authorization": "Key " + falKey, "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return new Response(JSON.stringify({ error: "fal " + r.status }), { status: 502, headers: { "content-type": "application/json" } });
    const url = (j.images && j.images[0] && j.images[0].url) || null;
    return new Response(JSON.stringify({ url }), { headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err && err.message) || err) }), { status: 500, headers: { "content-type": "application/json" } });
  }
};

export const config = { path: "/api/image" };
