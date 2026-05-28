# BUGS-WAVE2 follow-ups — MAJORs left open

_Compiled 2026-05-28 by the MAJOR-fix sub. Wave 2 BLOCKs (W01-W05) shipped in commit `17cd407`. Wave 2 MAJOR pure-code fixes shipped in this branch (W06, W07, W09, W12, W15, W18). The list below is what's still open and why — either needs Frank action, a migration, or a future packet's surface._

## Still open

### W08 — server-side B11-redux replay path
Status: **already addressed**. `app/api/chat/route.ts:153-162` filters `tool_result` rows alongside `user`/`assistant` and re-shapes them as user-role messages. Confirmed by re-reading the file in this audit pass. No follow-up needed.

### W10 — rulesPhase / imageGenerationPhase / voiceMode wiring
Status: **needs packet 43 (voice) + heuristics work**. The chat route currently computes `threadPhase` and `cardsPhase` from peek state, but the other three `SystemPromptOptions` fields are never set, so the conditional skills (`rules-engine-patterns`, `image-direction`, `voice-camera-protocol`) never load even though they're bundled. Two-part fix:
- `rulesPhase`: can be heuristically inferred from `snap.cards.some((c) => c.isLocked) || snap.variantGroups.length > 0`. Could ship today as an O(n) check inside the existing `loadPeekSnapshot` consumer block.
- `imageGenerationPhase`: needs the last tool call from the recent transcript — requires plumbing the last `tool_use` name from `loadChatHistory` to the system-prompt options. Doable but more touch than a single line.
- `voiceMode`: gated on packet 43 session metadata. Hold.

Recommendation: small follow-up packet wires `rulesPhase` heuristically (one-line) + plumbs `imageGenerationPhase`. `voiceMode` waits on 43.

### W11 — audio file handling half-built
Status: **needs packet 43 (voice surface)**. Upload route accepts `audio/*`, attaches stable file_ids, but the chat route only emits `image`/`document` content blocks — audio falls back to a text mention the model can't use. Two options:
- Reject audio in the upload route until 43 wires the real surface (immediate fix, drops curators on the floor when they upload voice memos).
- Document the limitation in the `attach_files_api_ref` tool description so the model doesn't promise audio playback.

Recommendation: reject audio in upload + return `audio_not_supported_yet` error. ~10 LOC. Park for the next sub-pass; not in scope for this MAJOR sweep.

### W13 — skill-bundle weight on cold turns
Status: **needs PostHog observability**. `vibe-direction` (~30KB) + `copy-house-style` (~30KB) is ~15K tokens in Block 2 on every turn. Cached on warm turns; full burn on cold starts / cache evictions. Decision needed: move `vibe-direction` into Block 3 conditional (loads only in `theming` phase) — but the SPINE declares it as always-loaded. Frank decision before code change.

Recommendation: write a packet that emits a cache_creation/cache_read ratio to PostHog daily summary; revisit after 1 week of data.

### W14 — Unicode path support in memory regex
Status: **needs DB migration**. The app-layer regex `/^[/A-Za-z0-9._-]+$/` is the audit's named finding, but the DB CHECK constraint in migration 0013 is also ASCII-strict (`[A-Za-z0-9_-]+` user segment + `[A-Za-z0-9._/-]+` rest). Loosening at the app layer alone defers Unicode rejection to Postgres with a worse error string; loosening at both layers requires a migration to rewrite the CHECK constraint.

Recommendation: not Wave 2 scope. Current behavior is consistent app+DB (both reject Unicode). The set_curator_memory Zod key restriction is ASCII-only too, so the model never produces Unicode paths from `set_curator_memory`. If a curator with a Unicode Clerk user ID ever lands, the prefix is built from `clerkUserId` which Clerk emits as ASCII, so paths under it are also ASCII.

### W16 — prewarm shape mismatch
Status: **observability-dependent**. `prewarmCache` uses default opts (no `occasionType`/`threadPhase`), so Block 3 is omitted at prewarm time. Real turns ALWAYS attach Block 3 once classification resolves. Cache fingerprints differ → prewarm primes a different key than real turns hit. Net: prewarm probably wastes the cache_creation cost.

Two ways forward:
1. Pass `occasionType: 'just-because'` + `threadPhase: 'intro'` to prewarm (representative shape for first-message turns). Fingerprints will match for the most common case (anon landing).
2. Accept that prewarm only primes Blocks 1+2 and document.

Recommendation: ship option (1) in a small follow-up packet; cheap, no observability needed.

### W17 — DB CHECK contract drift
Status: **documentation issue**. DB CHECK requires at least one char after `/memories/<user>/`. App-layer `validatePath` returns `/memories/<user>/` (trailing slash, empty path) on view-root semantics. View is a SELECT, not an INSERT, so this works in practice. If future Memory spec ever inserts at the bare prefix path, the DB will reject. No code change today; leave as latent constraint match.

Recommendation: add a comment in `validatePath` referencing the migration constraint so future contributors don't accidentally write an upsert on a bare prefix.

## Anti-followups (looked like they need follow-up, don't)

- **W12** (affiliate_search `web_search_tool_bm25` drift): looked at the audit pass; the current `affiliate_search.ts` description says `web_search` (correct), and the comment block discusses the right tool. The audit's premise that comment + description disagree is outdated — already fixed when affiliate_search was gated behind the env-key check.
- **W06** (expires_at enforcement): now enforced in the chat route's KV load loop. The view/str_replace/insert handlers don't need filtering because they operate on raw file content; the chat route is the only consumer that interprets the JSON payload.
