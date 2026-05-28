# Packet 41 — NOTES: alternatives considered, risks, things to flag

## Considered alternatives (and why we didn't pick them)

### 1. Use Anthropic-hosted Memory (Managed Agents / Skills) instead of self-hosted Supabase store

**Considered:** Anthropic's Agent SDK exposes a "managed memory" backend (per CAPABILITY_INVENTORY §A14). We could hand off storage entirely.

**Rejected because:**
- CAPABILITY_INVENTORY §H1 already locked the decision: stay on raw Messages API for now. Adopting Managed Agents is a separate post-Wave-2 architectural packet.
- Memory IS curator PII (recipient names, family graphs, allergies, "Mom's birthday March 14"). Keeping it in our Postgres = one less third-party data-residency dependency.
- We get free lifecycle ops: nightly export, GDPR delete-on-request, analytics on what curators are storing.
- Cost: Supabase row cost is rounding error vs. any Anthropic billing on managed memory if/when they price it.

### 2. Store memory as one big JSON blob per curator instead of a virtual filesystem

**Considered:** `users.memory_blob jsonb` keyed by `clerk_user_id`. Single read, single write per turn.

**Rejected because:**
- Anthropic's Memory tool spec IS a filesystem (view/create/str_replace/insert/delete/rename with line numbers). Modeling it as a blob means the handler has to re-serialize the entire blob on every str_replace call — quadratic in memory size as it grows.
- The 50KB-per-file × 100-files-per-curator cap (5MB ceiling per curator) is much easier to enforce as row-level constraints than as JSON-size validation.
- Future surfaces (memory-diary UI in /settings) want per-file timestamps and individual content addressability. Pre-paying for that now is cheap.

### 3. Implement web_search ourselves (call SerpAPI / Brave / Tavily directly)

**Considered:** Don't use Anthropic's server-side `web_search_20260209` — instead, register our own `web_search` tool that hits SerpAPI (or similar) and returns results to the model.

**Rejected because:**
- Anthropic's server-side tool is the cheapest path: $10/1000 searches, no second vendor, no separate API key to rotate.
- The dynamic-filtering version (`web_search_20260209`) gives us domain allowlist/blocklist at request-time — we don't have to re-validate URLs ourselves before letting Peek call `scrape_url` on them.
- It's a one-line addition to the `tools` array. Self-hosting buys ~$0 in flexibility we'd actually use.
- TRADEOFF: web_search results don't pass through our moderation pipeline. If Peek surfaces NSFW results in a card title/description, our existing `add_card` moderation catches it on insert. Acceptable.

### 4. Use the new `web_search_20260209` (Dec 2026) vs the older `web_search_20250305`

**Picked the new one.** `_20260209` requires `code_execution_20260120` to also be enabled (the dynamic-filtering variant runs the filter inside the sandbox). We're enabling code_execution anyway for the broader agentic surface, so there's no marginal cost. The older `_20250305` lacks dynamic filtering — fine for production-quality answers, but worse for future skill paths that want per-occasion domain allowlists ("for wedding peeks, only search theknot.com / brides.com / ...").

### 5. Skip `code_execution_20260120` entirely

**Considered:** Code execution is Tier 2 per CAPABILITY_INVENTORY §A10 ("marginal use"). Why pay for the cold-start latency?

**Rejected because:**
- It's a prerequisite for the new `web_search_20260209` and `web_fetch_20260209` (their dynamic filtering runs IN the sandbox).
- It's FREE when combined with web_search/web_fetch (per Anthropic pricing as of late 2025).
- It unblocks Anthropic Skills (skills-2025-10-02 beta) for free — if/when we want to attach Anthropic-hosted skills (pdf, docx, xlsx, pptx) as adjuncts to our peek/* skills, that ride is paid for.
- Programmatic Tool Calling (PTC) via `allowed_callers: ['code_execution_20260120']` becomes available as a Tier 1 follow-up: Peek can compose multi-step tool sequences in Python rather than burning model tokens on tool_use loop iterations. We don't ship PTC here, but enabling code_execution paves the road.

### 6. Use `tool_search_tool_regex_20251119` instead of `_bm25_20251119`

**Picked BM25.** Per the verified API specs: BM25 is the relevance-ranking variant; regex is for exact-pattern matches. Peek's tool catalog (28+ tools) has natural-language names + descriptions ("affiliate_search — search Skimlinks for product gift suggestions") that BM25 ranks well. Regex would force Peek to construct regex queries, which is wrong abstraction. If we hit BM25 quality issues post-launch, regex stays as a one-line swap.

### 7. defer_loading EVERYTHING vs keep some always-loaded

**Picked hybrid.** Always-loaded (5-7 tools): `ping`, `set_recipient`, `set_recipient_profile`, `set_vibe`, `update_vibe`, `set_note`, `add_card`, `mark_ready_for_publish`. These are the tools Peek calls on EVERY peek build. Tool-search for them would add a round-trip cost ($) and latency (~200ms per search) for zero gain.

The Tier 1 / Tier 2 tools (`set_song_card`, `set_movie_card`, `set_youtube_card`, `share_to_social`, `propose_subscription`, `invite_cocurator`, `unlock_event`, `set_reaction_capture_consent`, `set_countdown`, `set_rules_template`, `affiliate_search`, `place_search_v2`, `propose_payment_method`, `propose_checkout`, `share_pack_generate`, `attach_files_api_ref`, `set_curator_memory`, `request_voice_capture`, `request_camera_capture`) all defer. Most peeks never touch them; loading them on demand cuts the system-prompt prefix by ~40-60%.

Update CURATOR_PROMPT.md TOOL LIST section (line 14-32 area) to add a note: "Some tools are loaded on demand via tool_search. If the tool you need isn't visible, issue a tool_search query (e.g., 'add a song card', 'invite collaborator') and the relevant tool will be loaded inline."

### 8. Implement Extended Thinking as a `thinking: {type:'enabled'}` flag on the chat route turn parameter (always-on for note writing) vs as a callable tool Peek decides to invoke

**Picked the callable-tool route.** Reasoning:
- Frank's CURATOR_PROMPT explicitly mentions Extended Thinking "for the hardest creative job" (note drafting, rules trees, ambiguous recipient signals). Putting it under Peek's control = Peek decides per turn whether the latency cost is worth it.
- "Always-on for note writing" requires the chat route to detect intent ("is Peek about to call set_note this turn?") — brittle.
- A `request_extended_thinking` tool fires before the heavy lift, the chat route catches the tool-use in `onToolResult` and stashes a flag on the chat session, and the NEXT messages.create call adds `thinking: {type:'enabled', budget_tokens: 8000}`.
- COST: an extra round-trip per use (one turn to call request_extended_thinking, then the next turn does the thinking). Worth it for the precision.
- ANTI-PATTERN: never in voice mode (per skills/voice-camera-protocol.md §2). The tool handler should check voice-mode session flag and refuse with a `user_message` if active.

ALTERNATIVE: a "sentinel string" in Peek's text response (e.g. ending a turn with `<extended_thinking_next/>`). Cleaner but harder to enforce; tools are typed.

### 9. Files API: upload-and-reference vs every upload-becomes-a-tool

**Picked the upload-then-attach pattern.** The Files API beta returns a `file_id`; we store it in `peeks.metadata.uploaded_files[]`; Peek references it via the existing `attach_files_api_ref` tool (already in TOOL_MANIFEST §"attach_files_api_ref — NET-NEW"). 

Alternative: have separate tools per purpose (`attach_recipient_album`, `attach_voice_memo`, etc.). Rejected because it explodes the tool count for no semantic gain — the purpose enum on the existing tool covers the variation.

### 10. Files API: re-upload on every chat turn vs store the file_id

**Stored the file_id.** Anthropic Files API persists files for 30 days (per Anthropic docs at the time of writing). Storing `file_id` in `peeks.metadata.uploaded_files[]` and re-injecting via `{type:'document',source:{type:'file',file_id}}` on subsequent turns means:
- Big files (recipient voice memo, 50MB PDF) upload ONCE, get a file_id, then ride free on every turn.
- 30-day expiry is comfortably longer than the median peek-build session (minutes-to-hours).
- If a peek is ever resumed > 30 days later, the chat route detects the file fetch returning 404 and surfaces an "old upload expired — re-upload?" message to the curator. Edge case.

## Risks + things to watch

### R1. The `web_search` admin enable is a Frank-action, not code

Frank MUST enable web search at console.anthropic.com → org Settings → Privacy before this packet's tools work. Without it, `web_search_20260209` returns `unavailable` error code. The packet documents this; the worker can't unblock it.

**Mitigation in the packet:** the chat route handler should detect `web_search_tool_result_error` with `error_code: 'unavailable'` and log a structured warning ("admin_enable_required"). Surface in Sentry; orchestrator sees it on first deploy and pings Frank.

### R2. The `defer_loading` + `tool_search` flow is opaque to Peek

Peek doesn't see "deferred" tools in its system prompt. It must issue a tool_search to find them. If CURATOR_PROMPT doesn't teach Peek to do this, Peek will hallucinate tool names that don't appear in the loaded set — `Unknown tool: set_song_card` returns. 

**Mitigation:** the packet REQUIRES an update to `atelier/lib/anthropic/system-prompt.ts` adding a bullet: "If the tool you need is not in your visible set, issue a `tool_search_tool_bm25` query — describe what you want to do in 2-5 words, and the relevant tool will be loaded inline. Examples: 'add song card', 'invite cocurator', 'fire countdown event'."

This goes in the always-loaded prefix (it's a meta-rule about tool discovery, not a per-tool description).

### R3. Path-traversal attack surface on Memory tool

The Memory tool client-side handler accepts paths from Anthropic's response. A poisoned upstream (compromised SDK, MITM) could send `path: '/memories/../etc/passwd'`. The migration's CHECK constraint catches the obvious cases, but the application-layer guard MUST also normalize and re-validate:

```ts
function validatePath(clerkUserId: string, path: string): string {
  const expected = `/memories/${clerkUserId}/`;
  const normalized = path.replace(/\/+/g, '/');         // collapse //
  if (!normalized.startsWith(expected)) throw new Error('path_outside_namespace');
  if (normalized.includes('..')) throw new Error('path_traversal');
  if (normalized.includes('%2e') || normalized.includes('%2f')) throw new Error('encoded_traversal');
  if (!/^[/A-Za-z0-9._-]+$/.test(normalized)) throw new Error('invalid_chars');
  return normalized;
}
```

Belt + suspenders: DB CHECK constraint blocks the worst, app layer blocks subtleties.

### R4. Memory tool quota explosion via Claude going wild

Theoretical: Claude decides to write 100 files × 50KB on every turn. Mitigation = per-curator file count ceiling (100) + size ceiling (50KB) enforced at the tool handler. Beyond that, monitor: a PostHog event `memory_quota_hit` fires when create/insert is rejected for ceiling; we'll see in the dashboard if Claude is being chatty about memory.

### R5. Files API quota: org-wide 500GB

Per the verified specs, 500MB per file and 500GB per org. For peeks, the biggest realistic uploads are voice memos (~50MB max for 10-min memo) and image albums (~50MB for 10-15 high-res photos). 500GB org-wide = 10,000 max uploads at 50MB. We won't hit this in MVP, but the packet should include a cleanup Inngest job (Tier 1 follow-up) that purges `uploaded_files[]` entries older than 25 days and DELETEs the file via Anthropic SDK to free quota.

### R6. Beta header compatibility

The Files API requires `anthropic-beta: files-api-2025-04-14`. Memory is GA-shaped (no beta header). Web Search / Web Fetch / Code Execution / Tool Search are GA via the messages API. We instantiate ONE Anthropic client with the Files beta header (per the packet, on the `anthropic` const in `client.ts`). The other calls don't care — the header is benign for non-Files endpoints.

**Tradeoff:** if Anthropic deprecates the Files beta header (very unlikely in MVP timeframe) we change ONE line. Cheap.

### R7. Memory tool isn't yet a "tool the model has to call" — it's expected to be ALWAYS loaded

Per Anthropic's spec, Memory has unusual loading behavior: it gets called eagerly by Claude when the model "wants" memory. We CAN defer it but doing so means Claude has to issue a tool_search for memory first, which breaks the eager-memory pattern that makes the tool valuable.

**Decision:** Memory tool is ALWAYS loaded (not deferred). It's one of the 5-7 always-on tools. The packet should document this.

### R8. Extended Thinking tool needs to suppress its own "next turn" from also being extended

If Peek calls `request_extended_thinking` then in the SAME turn calls `set_note` (Claude in single message uses both tools in parallel), the thinking flag should fire for THIS turn's set_note dispatch, not the next user-turn-driven turn.

**Decision:** the simplest implementation: `request_extended_thinking` flips `thinking` ON for the IMMEDIATELY NEXT messages.create iteration of THIS turn (the post-tool-result re-issue). It auto-unflips after one iteration. If Peek wants extended thinking on the NEXT user-turn, it calls the tool again.

### R9. Anthropic Skills (skills-2025-10-02 beta) are NOT what our peek/* skills are

CRITICAL clarification: the verified docs mention Anthropic-hosted skills (pdf, docx, xlsx, pptx) that ride on the code-execution sandbox. These are DIFFERENT from our peek/* curator/vibe/share/etc skills. Our peek/* are markdown prompt-cached system blocks (per CAPABILITY_INVENTORY §A6 + §H2). Anthropic skills are sandboxed-code adjuncts.

**Decision for packet 41:** do NOT wire Anthropic skills here. They're Tier 2. If a future packet wants to ride the Anthropic xlsx skill for "build me a registry CSV" — separate packet.

### R10. The new Memory tool needs a Supabase-backed virtual filesystem; the SDK exposes `betaMemoryTool(handlers)` helper

The Anthropic TypeScript SDK already exposes `betaMemoryTool` (per `node_modules/@anthropic-ai/sdk/helpers/beta/memory.d.ts`) — it gives you a typed handler builder for the 6 commands. The worker should USE this helper rather than hand-rolling type-narrowing on the tool-use input. Less surface for bugs.

### R11. CURATOR_PROMPT.md says "{curator_memory}" is interpolated; our store must round-trip that

The current `system-prompt.ts` (verified) does NOT yet interpolate `{curator_memory}`. After this packet, the chat route should load curator memory ON SESSION OPEN (Memory tool's own view command would do this) — OR — pre-load the `/memories/<clerk_user_id>/profile.md` and feed it as the `{curator_memory}` interpolation in the system prompt's per-turn dynamic block.

**Decision:** ship both. The dynamic system-prompt block reads ONE specific file (`/memories/<clerk_user_id>/profile.md`) and prepends it as `{curator_memory}`. The Memory TOOL is still wired so Claude can ALSO call view/create/etc on other files (e.g., `/memories/<clerk_user_id>/recipients/sarah.md`) as needed. Belt + suspenders: cheap default load + on-demand tool access for granular fetch.

## Things to flag for orchestrator

1. **Frank admin action required:** web_search enable at console.anthropic.com. Surface in `STATE.md` after merge.
2. **Frank admin action required:** verify Files API beta header is on the org's allowed list (most orgs have it by default; if not, file an Anthropic support ticket — 24h turnaround typical).
3. **DB migration:** `migration.sql` applies to `peek_v2`. Orchestrator applies via Supabase MCP after merge — same pattern as packet 31's RLS migration.
4. **No env vars added.** All Anthropic surface uses the existing `ANTHROPIC_API_KEY`.
5. **Tool count rises from 13 to 32** after this packet lands (13 existing + 4 server tools + Memory + Files-related + Thinking + tool_search + the 11 deferred Tier 1/2 tools that get their basic registrations done here so the spine is complete). Some of those 11 are STUBS (return `{ok:false, error:'not_implemented_yet'}`) until their dedicated packets (42-50) flesh them out. The point of the stubs: Peek can call them WITHOUT hallucinating, and the tool_search index has real entries.
6. **CURATOR_PROMPT update needed.** The packet includes the diff for system-prompt.ts. Verify the additions are minimal — we're not rewriting the prompt, just adding 2-3 sentences about tool_search behavior + 1 line about memory load.
7. **Verify integration with packet 40 (prompt caching).** Packet 40 marks the tools array's last item with cache_control. Packet 41 adds ~15 new tools. After both land, the cache breakpoint stays on the last tool — that's what `withToolsCacheControl` in `chat.ts:13` already does. No conflict.

## Open questions Frank may want to weigh in on

- **Q1:** Should Memory be opt-in via a settings toggle ("remember things about me across peeks: ON/OFF")? Or always-on for signed-in curators? Default: always-on for signed-in, never for anon (the unauthorized check returns no-op silently per TOOL_MANIFEST §"set_curator_memory" cross-ref).
- **Q2:** Should we let Peek delete memory entries on the curator's behalf ("forget that Mom prefers warm tones — she pivoted")? The DELETE command is in the spec; we should wire it. Default: enabled. Curator-only via UI is Tier 2.
- **Q3:** Should web_search be rate-limited per curator beyond Anthropic's 30 req/s ceiling? Default: no, but expose a `WEB_SEARCH_MAX_PER_TURN` env var (default 5) the tool handler reads to cap per-iteration calls. Same pattern for `WEB_FETCH_MAX_PER_TURN` (default 3).
- **Q4:** Should the request_extended_thinking budget be dynamic (curator's tier affects max budget_tokens)? Default: no — fixed 8000 budget per the verified specs. Easy to make tier-aware later.
