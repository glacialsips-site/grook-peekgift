# Packet 40 — worker notes

## Implementation choices

- `withToolsCacheControl` is now `export`ed from `chat.ts` and reused inside `prewarm.ts` so the marker is the single contract for both call sites (chat-turn loop and cold-start pre-warmer). Option (b) from orchestrator NOTES.md.
- `getSystemPrompt` rewritten to compose blocks in order: static prompt → optional common-skills → optional occasion-skill → dynamic per-curator. Skills blocks are guarded by a `.trim()` check so whitespace-only payloads (from packet 41 in degraded mode) do not light up an empty cache slot.
- The exported `CACHE_TTL` is a single constant so flipping from `'1h'` back to `'5m'` is one edit, never inline literals.
- Pre-warm uses `max_tokens: 1` per packet spec — the SDK rejects 0 on chat-completion paths.
- Pre-warm is NOT wired into `instrumentation.ts` or any route — orchestrator decision per packet instructions and NOTES.md.

## Test outcomes

- Whitespace-only-skill-text test passed first try — the `.trim()` guards in `getSystemPrompt` are correct.
- No existing tools carry `cache_control` on their raw schema in `getToolSchemas()` output — the marker only attaches via `withToolsCacheControl`.
- The chat.ts `withToolsCacheControl` helper is directly imported and tested (not reconstructed) since I went with option (b).

## Sanity

- Static system prompt length ≈ `STATIC_SYSTEM_PROMPT.length / 4` characters → roughly ~2000-2300 tokens. Below Opus's 4096 minimum on its own. The cache breakpoint sits at the END of the tools array (longest stable prefix), capturing system + tools combined, which clears the 4096 floor.
- Skills blocks (packet 41) will pass cleanly through `getSystemPrompt`'s plumbing once they emit non-empty text — no further wiring needed.

## Model identifier

- `DEFAULT_MODEL` left at `claude-opus-4-7` per packet instruction "Do not change the default model in this packet." Spine docs flag Sonnet 4.6 as the eventual default; that's a separate orchestrator move. All cache markers are valid for both Opus (4096 min) and Sonnet (1024 min) — the combined prefix clears both floors.
