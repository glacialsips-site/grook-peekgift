# Packet Protocol

A **packet** is a self-contained build task that any fresh Claude session can execute with zero prior conversation context.

## Folder layout

```
_packets/
  PROTOCOL.md            this file
  STATE.md               live task graph + decisions log + per-batch installed-versions table
  NN-slug/
    prompt.md            the packet itself (worker reads this)
    inputs/              files the worker needs to reference
    returns/             webchat zips land here (cc-on-web returns are on branches)
    notes.md             orchestrator's integration notes after merge
```

## Packet prompt header (required)

```
# Packet NN — <title>

- **Worker:** cc-on-web | webchat-opus | cowork
- **Branch:** claude/packet-NN-<slug>     (cc-on-web only)
- **Depends on (sequencing):** packet NN merged, or "none"
- **Imports from siblings:** @/lib/foo, @/components/bar  (or "none")
- **Validation:** `npm install && npm run build` OR `npm install && npm run typecheck` (see rule below)
- **Target paths:** atelier/...
```

**`Depends on` is sequencing only** (worker can read merged code).
**`Imports from siblings` is import-time** (worker's code physically references files from another packet's territory). The orchestrator uses this list to decide merge order AND validation strictness.

## Validation rule

Default: `npm install && npm run build` — proves end-to-end compilation, generates `next-env.d.ts` (gitignored).

**Exception**: if `Imports from siblings` is non-empty, the worker uses `npm install && npm run typecheck` instead and DOES NOT inline-stub the missing modules. The orchestrator validates the full build after merge, not the worker. This avoids the "inline-stub then swap at merge" anti-pattern.

## Worker briefing (always include this at the end of every packet)

```
**Workspace check:** before writing any file, run `pwd` and confirm you are inside `.claude/worktrees/agent-*/` (your isolated worktree). If you are not, stop and re-isolate. Files written outside the worktree leak into the parent and contaminate other workers.

**Comment policy:** code only. No explanatory comments. No "this does X" descriptions. No reference to packets, fixes, or callers. Comments allowed ONLY when they explain a non-obvious WHY (subtle invariant, workaround for a specific upstream bug, behavior that would surprise a reader). If you write any comment, also add one line to `_packets/COMMENTS.md` with the file:line + the comment text + the reason it can't be a code change. Stale comments rot — having an index makes audits possible.

**Surface ambiguities in NOTES.md, not in the chat.** If the packet is unclear, choose the safer path, deliver, and document the choice in `NOTES.md` at the deliverable root. The orchestrator reads NOTES.md before merging.

**Reply minimally.** Branch name + commit hash + 2 sentences max. The orchestrator reads the diff, not your prose.
```

## Worker execution

### Claude Code on web

User spawns a new CC-on-web session in this repo and pastes:

> Read `CLAUDE.md`, `_packets/PROTOCOL.md`, `_packets/STATE.md` first. Then execute `_packets/NN-<slug>/prompt.md` exactly. Work on branch `claude/packet-NN-<slug>` in your isolated worktree (`.claude/worktrees/agent-*/`). Validate per the prompt's Validation rule. Commit `packet NN: <one-line summary>`. Push. Reply with branch + 2 sentences.

### Webchat opus

User opens a new Claude.ai webchat with Opus, pastes the entire packet prompt. Worker returns a single zip named `NN-<slug>-deliverable.zip` containing files at their paths relative to `atelier/`. User drops the zip in `_packets/NN-<slug>/returns/` and pushes to a branch named `claude/packet-NN-<slug>`. Orchestrator extracts and integrates.

### Cowork

User attaches a Cowork session to the repo folder, pastes the packet. Worker edits files in place on the branch `claude/packet-NN-<slug>`. User commits and pushes from Cowork or from local shell.

## Orchestrator integration loop

1. `git fetch --all` to see worker branches.
2. Per packet branch with new work:
   a. Check NOTES.md / deliverable notes for declared deviations.
   b. Read the diff against `atelier-integration`.
   c. Merge `--no-ff` into `atelier-integration`.
   d. If the packet declared `Imports from siblings`, rewrite any inline stubs to real imports as part of the integration commit (do not let stubs land in trunk).
   e. Run `cd atelier && npm install && npm run build`. If broken → revert the merge or push a small fix commit on `atelier-integration`. If the failure is non-trivial, write a fix-packet rather than carrying the fix yourself.
   f. Append integration notes to `_packets/NN-<slug>/notes.md` (what was kept, what was rewritten, why).
3. Update `STATE.md`: mark packet DONE with branch + sha + build status; unblock dependents.
4. Push `atelier-integration`.

`atelier-integration` is the live trunk. Worker branches stay around for review/rollback. When `atelier-integration` is solid for a deploy, promote to `main` (or whatever Netlify watches).

## Batching

Orchestrator writes packets in batches whenever they're independent on the `atelier-integration` trunk at dispatch time. The whole batch ships in a single orchestration commit so the user can fire them all off in parallel.

Between batches, the orchestrator may write a **deps-bump-N** packet that ONLY touches `package.json` + lockfile + `next.config.mjs` if upstream majors moved or new packages are needed. Workers can request deps via NOTES.md, orchestrator triages into the next deps-bump packet.

## Anti-patterns (history of pain — do not repeat)

- **Locking exact dep versions in a packet prompt.** Worker should resolve to latest stable at install. Prompt names libraries, not versions. (See `STATE.md` build principles.)
- **`Database = Record<string, unknown>`-style placeholders that compile but defeat type safety.** Use the permissive schema-shaped placeholder in `atelier/lib/supabase/types.ts` until real types are generated via `supabase gen types`.
- **Inline-stubbing a sibling packet's module to keep standalone build green.** Use the `Imports from siblings` mechanism instead and downgrade validation to `typecheck`.
- **Trying to enforce `package.json` immutability for the life of the build.** Use deps-bump packets between batches.
- **Comments explaining what code already says.** Banned. See worker briefing.
