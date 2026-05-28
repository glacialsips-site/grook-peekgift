# Packet 22 — fal.ai image gen pipeline harden + Supabase Storage re-host + URL scraper

- **Worker:** cc-on-web
- **Branch:** `claude/packet-22-image-gen`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** `@/lib/anthropic/tools`, `@/lib/supabase/storage`, `@/lib/env`, `@/db/schema/cards`, `@/lib/anthropic/client`
- **Validation:** `cd atelier && npm install && npm run typecheck`
- **Target paths:** `atelier/lib/image-gen/**` (new), `atelier/lib/scrape/**` (new), `atelier/lib/anthropic/tools/generate_hero_image.ts` (modify), `atelier/lib/anthropic/tools/scrape_url.ts` (modify), `atelier/app/api/scrape/**` (new)

## Context

Two tools are currently stubbed:
- `generate_hero_image` calls fal.ai with an unverified endpoint shape and doesn't actually re-host the generated image to our Supabase Storage (so it'd vanish when fal's CDN expires).
- `scrape_url` returns `{ error: 'scrape_pending_implementation' }` and doesn't actually scrape anything.

Both block real product use. This packet hardens both end-to-end.

## Deliver

### `atelier/lib/image-gen/fal.ts` (new)

Typed client for fal.ai Flux models. The fal HTTP API uses key-auth via `Authorization: Key {FAL_KEY}` header. Use `https://queue.fal.run/fal-ai/flux/dev` (or `schnell` for cheaper/faster — make it configurable).

```ts
import { env } from '@/lib/env';

const FAL_MODEL = 'fal-ai/flux/schnell';
const ASPECT_TO_SIZE: Record<string, string> = {
  '16:9': 'landscape_16_9',
  '4:3': 'landscape_4_3',
  '1:1': 'square_hd',
  '9:16': 'portrait_16_9',
};

export interface FalResult {
  ok: boolean;
  imageUrl?: string;
  contentType?: string;
  error?: string;
}

export async function generateFalImage(opts: { prompt: string; aspect?: keyof typeof ASPECT_TO_SIZE }): Promise<FalResult> {
  if (!env.FAL_KEY) return { ok: false, error: 'fal_not_configured' };
  const size = ASPECT_TO_SIZE[opts.aspect ?? '16:9'];
  const submit = await fetch(`https://queue.fal.run/${FAL_MODEL}`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${env.FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: opts.prompt, image_size: size, num_images: 1, enable_safety_checker: true }),
  });
  if (!submit.ok) return { ok: false, error: `fal_submit_${submit.status}` };
  const { request_id, status_url, response_url } = await submit.json() as { request_id: string; status_url: string; response_url: string };

  // Poll status_url every 1s up to 60s
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const status = await fetch(status_url, { headers: { 'Authorization': `Key ${env.FAL_KEY}` } });
    if (!status.ok) continue;
    const body = await status.json() as { status: string };
    if (body.status === 'COMPLETED') break;
    if (body.status === 'FAILED') return { ok: false, error: 'fal_generation_failed' };
  }

  const final = await fetch(response_url, { headers: { 'Authorization': `Key ${env.FAL_KEY}` } });
  if (!final.ok) return { ok: false, error: `fal_response_${final.status}` };
  const result = await final.json() as { images: { url: string; content_type: string }[] };
  const first = result.images[0];
  if (!first) return { ok: false, error: 'fal_no_image' };
  return { ok: true, imageUrl: first.url, contentType: first.content_type };
}
```

### `atelier/lib/image-gen/rehost.ts` (new)

Downloads an image from a URL and re-hosts to Supabase Storage. Used by `generate_hero_image` to durably persist generated images.

```ts
import 'server-only';
import { uploadAsset } from '@/lib/supabase/storage';

export async function rehostImage(opts: { sourceUrl: string; pathPrefix: string }): Promise<{ publicUrl: string; path: string; contentType: string; sizeBytes: number }> {
  const res = await fetch(opts.sourceUrl);
  if (!res.ok) throw new Error(`rehost fetch failed: ${res.status}`);
  const contentType = res.headers.get('content-type') ?? 'image/png';
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = contentType.split('/')[1]?.split(';')[0] ?? 'png';
  const path = `${opts.pathPrefix}/${crypto.randomUUID()}.${ext}`;
  const { publicUrl, path: storedPath } = await uploadAsset({ path, data: buf, contentType });
  return { publicUrl, path: storedPath, contentType, sizeBytes: buf.length };
}
```

### `atelier/lib/anthropic/tools/generate_hero_image.ts` (modify)

After fal.ai returns the temporary URL, call `rehostImage({ sourceUrl, pathPrefix: \`hero/\${peekId}\` })`, then update `peeks.hero_image_url` to the rehosted URL. Persist `hero_prompt` + `hero_image_source: 'ai_generated'`. Fire `evolveVibe(peekId, { kind: 'hero_image', imageUrl })` from packet 21 (if 21 is merged) — graceful skip if `evolveVibe` doesn't exist.

### `atelier/lib/scrape/browserbase.ts` (new)

Browserbase HTTP API client. Browserbase exposes sessions over WebSocket for full browser control but for product scraping the cheap path is their "Page Snapshot" endpoint — send a URL, get back HTML + screenshot. If Browserbase has changed its API or doesn't expose a one-shot scrape, fall back to ZenRows (see below).

```ts
import { env } from '@/lib/env';

export async function browserbaseScrape(url: string): Promise<{ html: string; screenshotUrl?: string } | null> {
  if (!env.BROWSERBASE_API_KEY || !env.BROWSERBASE_PROJECT_ID) return null;
  // Try Browserbase's session create + page snapshot.
  // If the API surface differs from the assumed shape, return null so the caller falls back to ZenRows.
  // See https://docs.browserbase.com for current API; verify endpoint shape.
  // ...
}
```

### `atelier/lib/scrape/zenrows.ts` (new)

ZenRows fallback. ZenRows has a clean `https://api.zenrows.com/v1/?url=...&apikey=...` endpoint that returns rendered HTML.

```ts
import { env } from '@/lib/env';

export async function zenrowsScrape(url: string): Promise<{ html: string } | null> {
  if (!env.ZENROWS_API_KEY) return null;
  const res = await fetch(`https://api.zenrows.com/v1/?url=${encodeURIComponent(url)}&apikey=${env.ZENROWS_API_KEY}&js_render=true`);
  if (!res.ok) return null;
  return { html: await res.text() };
}
```

### `atelier/lib/scrape/extract.ts` (new)

LLM-powered product extraction from HTML. Uses Anthropic Haiku — cheap, fast, well-suited.

```ts
import { anthropic, FAST_MODEL } from '@/lib/anthropic/client';

export interface ScrapedProduct {
  title: string;
  description?: string;
  imageUrl?: string;
  valueCents?: number;
  sourceRetailer?: string;
}

export async function extractProduct(opts: { html: string; sourceUrl: string }): Promise<ScrapedProduct | null> {
  // Trim HTML to ~30k chars (drop scripts/styles)
  const trimmed = opts.html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '').slice(0, 30000);
  const res = await anthropic.messages.create({
    model: FAST_MODEL,
    max_tokens: 600,
    system: `Extract product info from HTML. Respond ONLY as JSON: { "title": string, "description"?: string (1-2 sentences), "imageUrl"?: string (absolute URL), "valueCents"?: integer (price in cents, USD), "sourceRetailer"?: string (brand name). No prose.`,
    messages: [{ role: 'user', content: `URL: ${opts.sourceUrl}\n\nHTML:\n${trimmed}` }],
  });
  // parse JSON from res.content[0]
}
```

### `atelier/app/api/scrape/route.ts` (new)

POST endpoint. Body `{ url: string }`. Validates URL, runs the scrape pipeline:

1. Try Browserbase → if returns null, try ZenRows.
2. If both fail, return `{ ok: false, error: 'scrape_failed' }`.
3. Pass HTML to `extractProduct`, return the structured result.
4. Cache results in `events` table (kind: 'scrape_complete') so repeat scrapes are fast.
5. Requires Clerk auth (curator only, no anon scrape — DOS risk).

### `atelier/lib/anthropic/tools/scrape_url.ts` (modify)

Replace the stub. Call `/api/scrape` server-to-server (since the tool runs in the chat API which is server-side). Or import `extractProduct` etc directly. Returns the structured product so Claude can pass it to `add_card`.

## Constraints

- TS strict. No `any`. Use `unknown` + type narrowing for SDK responses.
- All scrape calls have a 25-second total timeout (page render + LLM extract).
- Don't add new deps — Browserbase + ZenRows + fal.ai are all REST-only.
- fal.ai polling is fine for now; future packet may move to webhooks if latency is bad.
- Do not modify `package.json`, `lib/env.ts`, or files outside target paths.
- No narrative comments.

## Reply format

Branch `claude/packet-22-image-gen`, commit `packet 22: fal.ai harden + scrape pipeline`, push. NOTES.md with the actual fal.ai endpoint shape if it differs from the spec.

Worker briefing (always apply): workspace check, code only, ambiguities in NOTES.md, minimal reply.
