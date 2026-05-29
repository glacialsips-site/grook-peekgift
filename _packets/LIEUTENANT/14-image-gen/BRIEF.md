# BRIEF 14 — Image gen wired (FAL → `set_hero` + `add_card`)

**Source of need:** the curator-tools spec has `generate_hero_image` (C2) + an implicit card-image gen via `request_image`. Currently stubbed (FAL key may not be wired yet — check concierge SETUP-STATUS). This brief wires the real image-generation pipeline.

**Pre-reqs:**
- BRIEF 04 (mutation tools) merged.
- `FAL_KEY` keyed on Netlify per concierge. **If not keyed, this brief still implements the code; runtime is no-op until key arrives.**

**Read first:**
1. `_packets/LIEUTENANT/_research/curator-tools/REPORT.md` C2 + §7 (`image_gen_offline` error code).
2. Existing `atelier/lib/imagegen.ts` (legacy root, may be Tailwind-era) — info-source for fal.ai SDK shape; build fresh.
3. fal.ai docs (use WebSearch for the current Flux model + pricing).
4. `atelier/lib/vibe/grammar/grammar.ts` — for the vibe palette/mood the prompt incorporates.

## DELIVERABLES

### 1. fal.ai client (edge-safe)

`atelier/lib/fal-edge/`:
- `client.ts` — `generateImage({ prompt, aspect, model? })` returning `{ url: string } | { url: null, reason: string }`. Uses raw `fetch` (no SDK if SDK has Node deps). Reads `process.env['FAL_KEY']`. Times out at 30s; fal-side rate limits surface as `reason: 'rate_limited'`.
- `prompt-enrich.ts` — given a curator prompt + a validated `Vibe` + recipient context, enrich the prompt with vibe palette/mood/imagery treatment + a quality-clamp clause ("photorealistic 4k, magazine cover quality, no text in image"). Pure function; testable.

### 2. Hosting

When fal returns an image URL (their CDN), background-copy to Supabase Storage `peek-v2-assets` bucket so it survives fal's CDN expiration:
- `atelier/lib/image-host/copy-to-storage.ts` — `copyImageToStorage(srcUrl, peekId)` — fetches, uploads to bucket with content-addressed name (`{peekId}/{sha256}.jpg`), returns the Supabase public URL.
- The fal CDN URL is what gets returned to Peek immediately (so the renderer doesn't wait); the Supabase URL replaces it lazily via a background job (or just on next page load via Drizzle update).

### 3. Wire into tools

- BRIEF 04's C2 `generate_hero_image` handler: call `generateImage`, pass result through.
- BRIEF 04's D2 `add_card` handler: if `image_url` empty AND `kind: 'homemade' | 'custom_experience'`, attempt one image-gen call from the card's title + description.
- Both surface `image_url: null` when fal offline (NEVER `ok: false` per spec §7 image_gen_offline rule). Peek's prompt handles graceful fallback.

### 4. Cost tracking

Every `generateImage` call returns the fal-reported cost (or estimated cost if missing). Dispatch wrapper (BRIEF 04) writes to `peek_mutation_log.image_gen_cost_cents` per spec §6.

### 5. Tests

- `generateImage` with mocked fetch returns the expected envelope.
- `prompt-enrich` produces deterministic output for a given (prompt, vibe, recipient) tuple.
- `copyImageToStorage` round-trips a small test image (mock Supabase if no creds).
- Cost tracking writes to mutation log.
- FAL unkeyed scenario: `generateImage` returns `{ url: null, reason: 'unkeyed' }`.

## HARD RULES

- **Graceful degrade when `FAL_KEY` missing.** Per BRIEF 04 spec §7 `image_gen_offline` — never error, always `{ url: null }`.
- **Edge-safe.** No `node:` imports.
- **Quality clamp in every prompt.** No tone-deaf AI-slop. Magazine-quality, no text in image, no logos.
- **Aspect ratios:** default 16:9 for hero; 1:1 for card; 4:3 fallback.
- **No persistent caching of generated prompts/images BY PROMPT.** Cache by `(prompt + vibe-hash)` — different vibes = different image.
- **Branch:** `lt/image-gen` off `claude/bold-ride-Li5zK`. Push.

## VERIFICATION

- typecheck/test/build green.
- If FAL_KEY present in sandbox: one live image generation succeeds and stores to Supabase.
- If not: tests show stub path returns correct envelope; flag for Frank-verify post-FAL-key.

## RETURN.md

Sections: what you built; FAL-key presence + live test result (or stub-mode-only flag); prompt enrichment examples (3 vibes × 1 prompt); cost-per-image observed; storage copy strategy; bright ideas (e.g. progressive image loading via Flux LoRAs for vibe consistency). Honesty section.

Per PROTOCOL.md: push `lt/image-gen`, write RETURN.md.
