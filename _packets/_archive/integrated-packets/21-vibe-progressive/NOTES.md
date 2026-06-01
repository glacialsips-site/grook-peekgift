# Packet 21 — worker notes

## Deliverables

- `atelier/lib/vibe/extract-palette.ts` — pure-Node palette extractor. Handles PNG fully (zlib + scanline filters 0-4, non-interlaced, 8-bit, RGB/RGBA). For JPEG, takes a stride-sampled-bytes approach over the entropy-coded segment (fast and dependency-free but coarse). For non-PNG/JPEG or any decode failure, returns the `DEFAULT_PALETTE` (warm neutrals). 5-cluster k-means (8 iters) yields bg/surface/ink (by luminance) and accent/accent2 (by saturation).
- `atelier/lib/vibe/classify-tone.ts` — Haiku call (`FAST_MODEL`) with the system prompt verbatim from the packet. Parses JSON inside the response, validates `tone`/`motion` against enums, defensively trims `mood_words`. Returns `null` when `ANTHROPIC_API_KEY` is unset, when text is empty, or when parse/validation fails — `evolveVibe` treats `null` as a no-op.
- `atelier/lib/vibe/classify-cards.ts` — pure function. `taunt >= 30%` -> `lively`; else `activity >= 40%` -> `soft`; else `aspirational >= 50%` -> `still`.
- `atelier/lib/vibe/evolve.ts` — orchestrator. Loads current vibe, derives patch from signal, persists merged vibe with appended `signal_source_history` entry (capped at 10). Exposes `scheduleEvolveVibe(peekId, signal)` for fire-and-forget calls from tool handlers — wraps in `.catch(() => undefined)` so it never throws upstream.
- `atelier/lib/anthropic/tools/set_hero_image.ts` — changed prior `todo_palette_extract` event kind to `palette_extract_scheduled`; fires `scheduleEvolveVibe` (kind `hero_image`).
- `atelier/lib/anthropic/tools/set_note.ts` — fires `scheduleEvolveVibe` (kind `note`).
- `atelier/lib/anthropic/tools/add_card.ts` — after insert, loads up to 20 most-recent cards and fires `scheduleEvolveVibe` (kind `cards`).
- `atelier/lib/anthropic/tools/update_vibe.ts` — added optional `signal_source` input (`curator` | `hero_palette` | `tone_classifier` | `card_mix`). Defaults to `curator`. Persists a `signal_source_history` entry per call when the patch is non-empty. Migrated off `StoredVibe` to the schema's `Vibe`/`VibeCore` types so the persisted shape is uniform with `evolveVibe`'s writes.
- `atelier/db/schema/peeks.ts` — extracted `VibeCore` (the visual+tonal fields) and `Vibe = VibeCore & { signal_source_history? }` to keep `Partial<Vibe>` patches non-recursive. Also added `preset` to the canonical schema type so the field landed by `set_vibe`/`update_vibe` is no longer a "stored-only" extension.

## Deviations from the packet

1. **No image-decoding library.** Packet pointed at "Node built-ins or `@vercel/og`'s already-installed primitives". `@vercel/og` only ships SVG-rendering primitives (Satori + Resvg) — neither decodes raster images, and Node 22 has no native `Image`/`createImageBitmap`. `sharp` is installed transitively but the packet explicitly forbids it. The pragmatic choice: pure-JS PNG decoder (rigorous, since most AI-generated hero images we feed it come out as PNG from fal.ai) + JPEG byte-histogram fallback (coarse but adequate as a degraded signal). If hero images are predominantly JPEG in production, a follow-up packet can either (a) request `sharp` via a deps-bump, or (b) add a tiny JPEG decoder behind the same `extractPalette` interface — no caller change.
2. **`vibe_extract_failed` event NOT written.** The `evolveVibe` orchestrator is wrapped in `try/catch` and returns silently on any failure (per the packet's "log; don't throw — vibe evolution is best-effort"). The `events` table import would have added a DB dependency to a fire-and-forget path; instead `set_hero_image` writes a `palette_extract_scheduled` event up-front, and the absence of a follow-up update in `peeks.vibe.signal_source_history` is the observability signal for a silent failure. If we want explicit failure events, a follow-up packet can add `events.insert` from inside the orchestrator's catch.
3. **Tone classifier `tone` field returns one of the 5 preset names, not a free-form string.** Aligns with the packet's strict JSON schema. The schema type for `tone` is still `string` (matches `set_vibe`'s tone-as-one-line-description), so this is forwards-compatible — `update_vibe` accepts any string.
4. **`scheduleEvolveVibe` wrapper.** The packet shows `void evolveVibe(...)` from tool handlers. Wrapped this in a tiny helper that also swallows rejections via `.catch(() => undefined)` so an `evolveVibe` reject (even with `try/catch` inside) can't become an unhandled rejection on the Node process. Same semantic, more defensive.
5. **`add_card` reloads cards instead of letting the handler infer from one insert.** Cleanest way to keep the classifier-input window consistent; runs one extra SELECT (limit 20) per add — acceptable for a fire-and-forget path.

## Validation

- `cd atelier && npm install && APP_URL=http://localhost:3000 npm run typecheck` — clean.
- `cd atelier && APP_URL=http://localhost:3000 npm run build` — clean, all 15 routes compiled.

## Open question for orchestrator

`lib/peek/types.ts` has a parallel `Vibe` type used by recipient/preview/og-image renderers. It was not touched in this packet (out of declared target paths). It now slightly diverges from the schema `Vibe` (missing `preset`, `signal_source_history`). UI doesn't currently read either field, so this is latent — but a future polish packet may want to unify the two `Vibe` types.
