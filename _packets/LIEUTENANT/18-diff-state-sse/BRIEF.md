# BRIEF 18 — Diff-not-full-state SSE (optimization)

**Source of need:** the spine chat route currently pushes the FULL `SpineState` over SSE on every tool dispatch. For a 12-card peek that's already overkill; for a 50-card peek it becomes wasteful. The renderer can re-render surgically if we send `{ state, changed: Set<id> }` per the page-state.ts shape's anticipated commit contract.

**Pre-reqs:**
- BRIEFs 03 (edge plumbing), 04 (mutation tools), 06 (depth-layer UI), 08 (mutation log) all merged.

**Read first:**
1. `atelier/lib/anthropic-edge/tool-loop.ts` — where the SSE events fire post-dispatch.
2. `atelier/app/api/spine/chat/route.ts` — current `tool_batch_complete` event shape.
3. `atelier/components/renderer/page-state.ts` — the `{ state, changed: Set<id> }` commit shape (already designed).
4. BRIEF 04's mutation log (entries already carry `changed_ids: string[]` per spec §6).

## DELIVERABLES

### 1. SSE event shape change

`atelier/lib/spine/types.ts` (or wherever SpineSseEvent lives) — split the current `state` event into:
- `state_full` (the existing full-state event; emitted on initial load + session-resume)
- `state_diff` (NEW: `{ patches: Array<{ op: 'replace_section'|'insert_card'|'remove_card'|'update_vibe'|...; path; value }>, changed_ids: string[], turn_id }` — sent post-mutation)

Either rolled-your-own patch shape or JSON Patch (RFC 6902) — pick the simpler one that the renderer can apply with minimal logic.

### 2. Server-side emission

In the spine chat route (or wherever tool dispatch flushes events): after each mutation, compute the patch from `prev_state → next_state` (or grab `changed_ids` from the mutation log entry produced by BRIEF 04's dispatch). Emit `state_diff` instead of `state_full`. Initial load still sends `state_full`.

### 3. Client-side patching

`atelier/components/spine/spine-builder.tsx` (or its production successor from BRIEF 06): on `state_diff`, apply the patch to local state. On `state_full`, replace. Drop the changed_ids set into a React context the renderer reads to decorate the affected cards/sections (diff-mark integration with BRIEF 06's vocabulary).

### 4. Tests

- Patch application is deterministic + idempotent.
- 100 random mutations produce final state identical to applying full state.
- Renderer correctly highlights `changed_ids` for ~3s then clears.

## HARD RULES

- **Backward compatible.** Initial load + session-resume still get `state_full`. Patches are additive optimization.
- **Patch size <2KB typical.** If a vibe regenerate produces a patch >5KB, fall back to `state_full` (small heuristic).
- **Edge-safe.** Patch generation runs in edge route; no `node:` imports.
- **Branch:** `lt/diff-state-sse` off `claude/bold-ride-Li5zK`. Push.

## VERIFICATION

- typecheck/test/build green.
- Browser smoke: mutate, observe SSE network panel shows `state_diff` events; observe renderer diff-marks the right nodes.

## RETURN.md

Sections: patch format chosen; backward-compat strategy; diff-mark wiring with BRIEF 06; bandwidth measurement (full-state size vs diff size on a 5-card peek); bright ideas. Honesty section.

Per PROTOCOL.md: push `lt/diff-state-sse`, write RETURN.md.
