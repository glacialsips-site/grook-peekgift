# Comment audit log

Every comment that lands in the codebase must be logged here with the WHY it can't be a code change. Audited periodically; stale ones get removed (and code re-checked).

Format:

```
- `path/to/file.ts:LINE` — "<the comment>" — <why a comment, not a code change>
```

## Current entries

- `atelier/lib/anthropic/tools/generate_hero_image.ts:tryEvolveVibe` — "intentionally swallowed: vibe evolution is best-effort" — empty catch block needs a WHY so a future reader doesn't think the error swallow is a bug; vibe evolution is a packet-21 background signal and must not fail the user-visible image gen tool turn.
- `atelier/lib/anthropic/tools/index.ts:24` — `tool as unknown as ToolDefinition` cast — load-bearing registry generic erasure: `registerTool<Input, Output>` accepts a strongly-typed handler, but the `TOOL_REGISTRY: Map<string, ToolDefinition>` stores them under `ToolDefinition<unknown, unknown>` so the dispatcher (`runTool`) can call any handler. The cast widens `(input: Input, ctx) => Output` into `(input: unknown, ctx) => unknown` — TypeScript's function-parameter contravariance rejects a direct cast. Kept per packet 30 instructions.
