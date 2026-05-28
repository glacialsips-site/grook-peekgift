# Packet 22 notes

## fal.ai endpoint shape

Implementation uses the queue API at `https://queue.fal.run/{model}` per docs:

1. POST to `https://queue.fal.run/fal-ai/flux/schnell` with `Authorization: Key {FAL_KEY}` → returns `{ request_id, status_url, response_url }`.
2. Poll `status_url` once per second up to 60s. Looks for `status === 'COMPLETED'` (terminates loop) or `status === 'FAILED'` (returns failure). Other statuses (e.g. `IN_QUEUE`, `IN_PROGRESS`) continue polling.
3. Fetch `response_url` for the final payload `{ images: [{ url, content_type }] }`.

This replaces the previous synchronous `https://fal.run/...` shape that was in packet 11's stub. The queue endpoint is the documented path and gives us status URLs we can later swap for webhooks without changing call sites.

Caller (`generate_hero_image`) then downloads the temporary fal URL and re-hosts via `uploadAsset` to `hero/{peekId}/{uuid}.{ext}` in `SUPABASE_STORAGE_BUCKET`.

## evolveVibe hook (packet 21 coupling)

`generate_hero_image` fires `evolveVibe(peekId, { kind: 'hero_image', imageUrl })` via a runtime dynamic import of `@/lib/vibe/evolve`. If packet 21 hasn't merged, the module resolves to null and the call is silently skipped. Once packet 21 lands the path will resolve and the hook runs.

The dynamic import uses a string-array `.join('/')` to defeat TS's static module resolution so we don't get a TS2307 ("Cannot find module") error before packet 21 ships. After packet 21 integrates, the orchestrator may simplify this to a direct static import.

## Scrape pipeline

`POST /api/scrape` with `{ url, peekId?, sessionId? }`. Requires Clerk auth (no anonymous scrape — DOS guard). Returns `{ ok: true, product: ScrapedProduct, source: { cached, provider } }` or `{ ok: false, error }`.

Pipeline order:

1. Browserbase (POST `/v1/sessions` then POST `/v1/sessions/{id}/page` for an HTML snapshot — see caveat below).
2. ZenRows fallback at `https://api.zenrows.com/v1/?url=...&apikey=...&js_render=true`.
3. Both wrapped in a 25s overall timeout.
4. HTML → Anthropic Haiku (`FAST_MODEL`) → JSON product extract.
5. Result cached in `events` (`kind: 'scrape_complete'`) so repeats hit instantly.

### Browserbase API caveat

Browserbase's actual public REST surface is primarily about session lifecycle (`/v1/sessions`) for connecting via Playwright/Puppeteer WebSocket; there's no fully-public one-shot HTML snapshot endpoint at the documented URL today (the `/page` extension is the shape this packet's prompt sketched). The implementation here:

- creates a session,
- attempts `POST /v1/sessions/{id}/page` (the natural REST shape if Browserbase exposes it),
- on any non-2xx, returns `null` so the pipeline falls back to ZenRows,
- always tries to clean up the session via DELETE.

If Browserbase shipped a real one-shot endpoint with a different path, swap the `pageRes` call in `browserbase.ts`. Until then ZenRows handles nearly every prod scrape — Browserbase will mostly no-op.

## Packet 24 conflict

Packet 24 will modify `lib/anthropic/tools/scrape_url.ts` to wrap `source_url` with the affiliate network before returning it (Skimlinks/Sovrn).

This packet's `scrape_url.ts` returns the raw `source_url`. Integration merge: packet 24 should layer the affiliate wrap on top of the structured result (around `result.source_url = parsed.url`).

## Files added

- `atelier/lib/image-gen/fal.ts` — typed fal.ai queue client with status polling
- `atelier/lib/image-gen/rehost.ts` — fetch + upload to Supabase Storage
- `atelier/lib/scrape/browserbase.ts` — Browserbase session+page client (returns null on failure → fallback)
- `atelier/lib/scrape/zenrows.ts` — ZenRows REST client
- `atelier/lib/scrape/extract.ts` — Anthropic Haiku JSON extractor
- `atelier/lib/scrape/pipeline.ts` — composes browserbase → zenrows → extract with 25s timeout
- `atelier/app/api/scrape/route.ts` — POST endpoint with Clerk auth + cache lookup

## Files modified

- `atelier/lib/anthropic/tools/generate_hero_image.ts` — uses new fal + rehost modules, evolveVibe hook
- `atelier/lib/anthropic/tools/scrape_url.ts` — real pipeline integration replacing stub

## Constraints respected

- No new deps in `package.json`.
- `lib/env.ts` untouched (FAL_KEY / BROWSERBASE_* / ZENROWS_API_KEY already optional).
- TS strict, `noUncheckedIndexedAccess: true`. No `any`.
- All external SDK responses narrowed via `unknown` + type guards.
- No narrative comments. One justified comment in `generate_hero_image.ts` (logged in `_packets/COMMENTS.md`).
