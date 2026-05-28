# Packet 40 — orchestrator notes (considered + rejected)

Notes for the integrator and the future-orchestrator audit trail. Not for the worker — the worker reads `prompt.md`.

## What lives in `chat.ts` already vs what we add

- `withToolsCacheControl(tools)` was already there (it landed somewhere between batches 2-3; not on a clean packet branch). Sets `cache_control: { type: 'ephemeral' }` (no TTL — defaults to 5m). The packet upgrades the TTL to `1h`. This is the smallest possible edit.
- `system-prompt.ts` already had a `cache_control: { type: 'ephemeral' }` on the static block (also 5m default). Same upgrade.

So in raw diff terms, this packet is: add `ttl: '1h'` to two existing markers, add hooks for two more skill blocks, add `prewarm.ts`, add a test file. Small surface, big leverage.

## Cache breakpoints budget — why this allocation

The API limit is 4. The 5-layer plan in CURATOR_PROMPT.md calls for:

```
[ Block 1: static system prompt        ] ← breakpoint 1
[ Block 2: tool definitions            ]
[ Block 3: common skills               ] ← breakpoint 2
[ Block 4: occasion-specific skill     ] ← breakpoint 3
[ Block 5: per-curator dynamic context ]   no breakpoint
```

Wait, the spine doc only has 3 explicit breakpoints (after system prompt, after common skills, after conditional skill) and notes the tools cache attaches "after tool definitions." That's actually 4 conceptual cache prefixes, occupying 4 slots.

I chose:
1. Static system prompt block (slot 1) — small but always-loaded.
2. Common skills block (slot 2) — only fires when packet 41 passes it.
3. Occasion-specific skill block (slot 3) — only fires when 41 passes it.
4. Last tool definition (slot 4) — always fires.

The cache "attaches to this block and EVERYTHING BEFORE IT in the request." So slot 4 on the last tool actually captures all tools + the system blocks. Slots 1-3 give earlier checkpoints so partial prefix mismatches (e.g. system prompt edit) don't blow away the tools cache too — they re-create from the last-still-valid slot.

What I considered and rejected:
- **Caching on user messages.** Wastes a slot for a benefit that doesn't materialize at our scale. Each user message is unique.
- **Caching on the dynamic per-curator block.** Same reason. It varies every turn; you'd write-then-discard.
- **Skipping the static system prompt marker** (since tools-last already captures it). Rejected — the slot 1 marker lets us add NEW skills/blocks later between system and tools without invalidating the system-prompt cache. Cheap insurance.
- **Using 5m TTL.** Cheaper per write (1.25× vs 2×) but mis-fits the burst pattern of curator sessions. See math in the packet.
- **Mixed TTLs** (5m on the volatile parts, 1h on system+tools). Possible but adds operational complexity. The dynamic block is uncached either way; everything else is roughly equally stable. Uniform 1h is simpler.

## Why I'm NOT putting `prewarmCache()` in `instrumentation.ts` yet

Cold-start tax. Every Next.js server boot would pay one ~12k-token cache-write hit (= ~$0.072 at Sonnet input cost, less if model is different). On Netlify Functions where each region+function combo cold-starts independently, that adds up if there's churn.

Options the orchestrator should decide later:
1. **Always pre-warm at boot** (`instrumentation.ts register()`). Highest hit rate, highest cold-start cost.
2. **Lazy pre-warm on first request to `/api/chat`** (fire-and-forget). No cold-start tax, first user pays a slightly cooler cache.
3. **Cron pre-warm** via Inngest every ~50 min during business hours. Steady-state warm, predictable cost.
4. **No pre-warm.** Let the first real curator turn write the cache. Simplest; first turn is slower but it's just one turn.

I'd ship 4 (no pre-warm) and revisit when we have real traffic data. The function is there if we want options 1-3 later. Surface this in the packet's NOTES section so the worker doesn't get clever and wire it in unilaterally.

## What I considered for the test design

- **Mock `messages.stream` and trace** the params that `chatTurn` passes. Rejected as too brittle — `chatTurn` involves the whole tool loop, observability capture, signal handling. Easier to test the building blocks: `getSystemPrompt` + `prewarmCache` + a reconstruction of the tool-cache-control helper.
- **Snapshot the full system prompt.** Rejected — snapshots become churn-y when the static prompt is edited (which happens every couple of weeks). Asserting structure (cache_control on the right indices) is more durable.
- **Add a `chatTurn` integration test** that mocks the stream and asserts `params.system[0].cache_control` is present. Tempting but cross-cuts with the existing `tests/integration/tool-registry.test.ts` mock setup. Worker can add this if they want; not required.

## Where this packet TOUCHES things landing later

- **Packet 41** (Skills + Memory + Files API): adds the `commonSkillsText` and `occasionSkillText` callers. This packet defines the contract; 41 just passes data. If 41 changes the signature of `SystemPromptOptions`, it should keep these two fields as no-ops for backward-compat.
- **Sub A's prompt trim** (if it happens before 41): the static prompt shrinks, slot 1 still caches it (no change needed).
- **`DEFAULT_MODEL` change to Sonnet** (eventually): every cached block above 1024 tokens lights up where Opus's 4096 cutoff hid it. Cost win compounds.

## Worker pitfalls to watch (orchestrator pre-flight checks)

- The SDK type `Anthropic.Tool` may not have `cache_control` exposed publicly in older versions; in `@anthropic-ai/sdk@0.98.0` it's there (verified in `node_modules/@anthropic-ai/sdk/resources/messages/messages.d.ts:139`). If a worker hits a TS error on `cache_control`, they likely upgraded SDK. Bump and re-typecheck.
- The current test setup file `tests/setup.ts` mocks `server-only`. `prewarm.ts` uses `'server-only'`, so the mock catches. No additional setup needed.
- `getToolSchemas()` returns from a module-level registry populated by `tools/bootstrap.ts`. The test must `import './tools/bootstrap'` (transitively, via `prewarm.ts` or directly) or the registry will be empty and the test assertion that tools.length > 0 will fail. The packet's prewarm.ts already imports bootstrap.

## Estimated impact

Per the packet body:
- Stable prefix ~10-15k tokens cached at 90% read discount.
- Per-turn cost on Sonnet 4.6 for the cached portion: ~$0.04 → ~$0.005 (8x reduction).
- Cache write tax: 2× base (1h TTL) paid once per TTL window. On a busy session (50 turns/hour) that's ~$0.072 amortized across 50 turns ≈ $0.0014/turn write overhead.
- Net: ~80-90% reduction in chat-input-token cost, observable in Admin API cost_report within ~24h of deploy.

## If the worker bikesheds on `withToolsCacheControl` placement

Either of these is acceptable, pick one:

a. **Keep it private in `chat.ts`, replicate the logic in `prewarm.ts`.** Two ~6-line functions. Test reconstructs once. Simpler.

b. **Export `withToolsCacheControl` from `chat.ts`, import in `prewarm.ts`.** DRY-er. Test imports it directly.

The packet leans (a) in its prose but accepts (b). NOTES.md captures the choice. Doesn't matter for behavior.
