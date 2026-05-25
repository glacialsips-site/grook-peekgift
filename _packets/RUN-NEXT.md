# RUN-NEXT — the live dispatch queue

_Owner: orchestrator updates this file after every batch lands. Worker session reads it and dispatches subagents._

## How the worker session uses this file

You (the cc-on-web worker session) are the single point of contact for the user. Each "go check" or "dispatch" command from the user means:

1. `git pull origin atelier-integration` to refresh.
2. Read this file (`_packets/RUN-NEXT.md`) — the **Ready batch** section lists every packet currently ready to fire.
3. For each `READY` packet: spawn an Agent subagent with `isolation: "worktree"` and this prompt:
   > Read CLAUDE.md, _packets/PROTOCOL.md, _packets/STATE.md, then execute _packets/NN-<slug>/prompt.md exactly. Work on branch `claude/packet-NN-<slug>` in your worktree. Validate per the prompt. Commit `packet NN: <one-line summary>` and push the branch. Reply with branch name + 2 sentence summary.
4. Dispatch them all in parallel (one Agent tool call per packet, all in one message).
5. When all subagents return:
   - For each that succeeded: report branch SHA + 2-line summary to the user.
   - For each that failed: include their NOTES.md content + their error so the orchestrator (a separate session) knows what went wrong.
6. Push any `NOTES.md` / `STATE.md` updates you made during dispatch.
7. End your turn. The user will say "integrate" or "go check" next, at which point you fetch any new commits on `atelier-integration` (the orchestrator integrates returned branches separately, you don't merge).

## Quick conventions

- Never dispatch a `BLOCKED` packet — wait for its dependency to merge into `atelier-integration` first.
- Each subagent runs in its own worktree (`isolation: "worktree"`) so concurrent runs don't stomp each other.
- If a worker requests a dependency that isn't in `package.json`, surface in NOTES.md — the orchestrator writes a deps-bump packet, never the worker.
- After dispatching, you can rest. Don't try to integrate (that's the orchestrator's job).

---

## Ready batch — fire all of these in parallel

| Packet | Path | Status | Branch on completion |
|---|---|---|---|
| 20 | `_packets/20-chat-polish/prompt.md` | READY | `claude/packet-20-chat-polish` |
| 21 | `_packets/21-vibe-progressive/prompt.md` | READY | `claude/packet-21-vibe-progressive` |
| 22 | `_packets/22-image-gen/prompt.md` | READY | `claude/packet-22-image-gen` |
| 24 | `_packets/24-affiliate/prompt.md` | READY | `claude/packet-24-affiliate` |
| 25 | `_packets/25-analytics/prompt.md` | READY | `claude/packet-25-analytics` |
| 26 | `_packets/26-inngest-jobs/prompt.md` | READY | `claude/packet-26-inngest-jobs` |

## Blocked (waiting on something)

_(none currently)_

## Drafted but not yet ready

| Packet | Reason it's not in the ready batch |
|---|---|
| 23 (group co-curation) | Want to see batch 3 land first; UX nuances will be clearer with real chat flow working |
| 27 (social outbound) | Same — defer until batch 3 lands |
| 08 (Sentry re-add) | Defer until there's traffic worth monitoring |

---

## After every dispatch cycle

Worker session: reply to the user with ONE message containing:

```
Dispatched N packets. Branches:
- claude/packet-NN-<slug>: <2-line summary>
- ...

Issues (if any):
- packet NN: <error>
```

Don't list the packets you didn't dispatch (BLOCKED, DRAFTED) — keep noise low.
