# `_archive/` — integrated work, kept for lineage

_Archived 2026-05-27._

This folder holds orchestration artifacts whose work has already integrated to trunk (`atelier-integration`). Nothing in here is live — it's reference for `git blame`, postmortems, and tracing decisions back to the packet that introduced them.

## What's in here

### `integrated-packets/`

The original numbered packet folders (`01-foundation/` through `35-quality/`) that the orchestrator dispatched in batches 1, 2A, 2B, 3, and 4 (plus Wave 1 + Wave 1.5 bug-fix follow-ups). Every one of these merged to `atelier-integration` successfully; their full lineage (branches, shas, validation status, notes) is in `_packets/STATE.md`.

Folder structure is preserved exactly as it was at the top level — each contains its original `PROMPT.md`, `NOTES.md`, returns, etc.

### `orch-desktop/`

Handoff and audit docs from earlier desktop / web-chat orchestrator sessions:

- `A-001-runtime-state.md`, `Q-001-runtime-state.md` — runtime-state snapshots
- `HANDOFF.md`, `HANDOFF-CC-001.md` through `HANDOFF-CC-004.md` — session handoffs across CC instances
- `PROMPT-REVIEW-CC-005.md`, `PROMPT-V2-DRAFT.md` — prompt iterations
- `AUDIT-ENVS-001.md` — env-var audit
- `CLERK-V7-NOTES.md` — Clerk upgrade notes
- `TOOL-DESCRIPTION-TONE.md` — tool-description style guide

All superseded by the canonical orchestration spine at `_packets/SPINE/`.

## Why archive instead of delete

Three reasons:

1. **Lineage.** Anything in trunk can be traced back to its packet by branch name (`claude/packet-NN-*`) — the packet folder explains *why* the change exists.
2. **Postmortem material.** When something breaks, the original `NOTES.md` often contains the worker's reasoning, gotchas, and known follow-ups.
3. **Prompt patterns.** The packets that worked become templates for future packets.

## Rule for the future

**Integrated packets get moved here once their work is on trunk.** When a new numbered packet (`_packets/36-*/`, `_packets/40-*/`, etc.) lands on `atelier-integration` and the orchestrator marks it DONE in `STATE.md`, move it here:

```
git mv _packets/NN-slug _packets/_archive/integrated-packets/NN-slug
```

Keep the top level of `_packets/` reserved for **live** orchestration: `SPINE/`, `STATE.md`, `RUN-NEXT.md`, `ROADMAP.md`, `PROTOCOL.md`, in-flight packet folders, and the live reference docs (`BUGS.md`, `AUDIT.md`, `CONCEPT-V2.md`, etc.).

Do not delete from `_archive/`. Disk is cheap, history is not.
