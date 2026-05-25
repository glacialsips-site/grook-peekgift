# Packet Protocol

A **packet** is a self-contained build task that any fresh Claude session can execute with zero prior conversation context.

## Folder layout

```
_packets/
  PROTOCOL.md            this file
  STATE.md               live task graph + decisions log
  NN-slug/
    prompt.md            the packet itself (worker reads this)
    inputs/              files the worker needs to reference
    returns/             deliverables land here (zip or unpacked files)
    notes.md             orchestrator integration notes after merge
```

## Packet prompt format (`prompt.md`)

Every packet starts with this header:

```
# Packet NN — <title>

- **Worker:** cc-on-web | webchat-opus | cowork
- **Branch:** claude/packet-NN-<slug>     (cc-on-web only — worker pushes here)
- **Depends on:** packet NN merged, or "none"
- **Estimated tokens:** ~XXk
- **Target paths:** atelier/...
```

Then in body:

1. **Context (1 paragraph)** — what this packet exists for, no project history.
2. **Inputs** — list every file in `inputs/` and its purpose. If none, say so.
3. **Deliver** — explicit file list with exact paths. Exit criteria. Anti-scope.
4. **Constraints** — TS strict, no `any`, no extra deps, etc.
5. **Reply format** — for webchat: zip name. For cc-on-web: branch + commit message convention.

Model after [packet 26 of the prior project](https://example) — single-file scope where possible, inline code stubs for fiddly logic, "be terse" instruction at the end.

## Validation rule (every packet)

Workers MUST run this before declaring done:

```bash
cd atelier && npm install && npm run build
```

`npm run build` generates `next-env.d.ts` (which is gitignored), runs TypeScript checking, and proves the app compiles end-to-end. **A bare `npm run typecheck` will falsely fail on fresh checkouts** because `next-env.d.ts` doesn't exist yet — use `build`.

If build fails, do NOT push. Either fix in-packet (preferred) or surface in `NOTES.md` and push anyway with a clear "blocked" status so the orchestrator can write a fix-packet.

## Worker execution

### Claude Code on web worker

User spawns a CC-on-web session in this repo and pastes:

> Execute `_packets/NN-<slug>/prompt.md`. Read STATE.md and PROTOCOL.md first. Work on branch `claude/packet-NN-<slug>`. Commit with message `packet NN: <one-line summary>`. Push the branch. Reply with the branch name and a 2-sentence summary. Do not modify anything outside the target paths declared in the packet.

The worker:
1. `git checkout -b claude/packet-NN-<slug>`
2. Reads the packet, executes deliverables.
3. Runs validation if specified (typecheck, build).
4. Commits all changes with `packet NN:` prefix.
5. `git push -u origin claude/packet-NN-<slug>`.

### Webchat opus worker

User opens new Claude.ai webchat with Opus selected and pastes the full `prompt.md`. Worker returns one zip named `NN-<slug>-deliverable.zip` containing the files at their target paths (relative to `atelier/`). User drops the zip in `_packets/NN-<slug>/returns/` and pushes to this branch.

## Orchestrator integration loop

For each returned packet:

1. **CC-on-web returns:** `git fetch --all`, identify `claude/packet-NN-*` branches with new commits.
2. **Webchat returns:** unzip from `_packets/NN-<slug>/returns/` into target paths.
3. **Validate**: run typecheck and build inside `atelier/`. If broken → do NOT merge; write a follow-up packet `NN-fix-<reason>`.
4. **Integrate**: merge the branch (or commit the unzipped files) into the working branch.
5. **Record**: append integration notes to `_packets/NN-<slug>/notes.md` (what was kept, what was rewritten, why).
6. **Update STATE.md**: mark packet done, unblock dependents, commit.

## Batching

The orchestrator writes packets in batches whenever they're independent. The user can dispatch the whole batch in parallel — N CC-on-web sessions or N webchat sessions — without waiting for round-trips.

A batch is committed and pushed as a single git commit so the user sees the full set at once.

## Anti-patterns

- **Never write a packet that requires the worker to ask follow-up questions.** Inline every assumption and ambiguity resolution.
- **Never let a worker touch files outside its declared target paths** (especially `package.json`, shared schemas). Coordinate package.json bumps via dedicated packets.
- **Never commit a packet return unvalidated.** If a packet declares "must pass `npm run build`", the orchestrator runs that before merging.
