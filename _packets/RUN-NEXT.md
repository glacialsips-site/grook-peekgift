# RUN-NEXT — the live dispatch queue

_Owner: orchestrator updates this file after every batch lands. Worker session reads it and dispatches subagents._

## How the worker session uses this file

You (the cc-on-web worker session) are the single point of contact for the user. Each "go check" or "dispatch" command from the user means:

1. `git pull origin atelier-integration` to refresh.
2. Read this file — the **Ready batch** section lists every packet currently ready to fire.
3. For each `READY` packet: spawn an Agent subagent with `isolation: "worktree"` and this prompt:
   > Read CLAUDE.md, _packets/PROTOCOL.md, _packets/STATE.md, then execute _packets/NN-<slug>/prompt.md exactly. Work on branch `claude/packet-NN-<slug>` in your worktree. Validate per the prompt. Commit `packet NN: <one-line summary>` and push the branch. Reply with branch name + 2 sentence summary.
4. Dispatch them all in parallel.
5. Report results, push any STATE/NOTES updates, end your turn.

---

## Ready batch — nothing currently queued

_All of batches 1, 2A, 2B, 3 (packets 01-26 minus the deferred 08, 19, 23, 27-30) are integrated on `atelier-integration`. Build green; site live at peek-gift-vnext after the auto-deploy fires._

The orchestrator is drafting the next batch from `_packets/ROADMAP.md` Phase A (hardening) once you confirm the live build smoke-tests clean. Expect a fresh ready batch in the next orchestrator cycle.

## Blocked

_(none)_

## Drafted but not yet packeted

See `_packets/ROADMAP.md` for the full post-MVP plan. Top of the queue once batch 3 smoke-tests:

- **Phase A1 — Live $12 payment smoke test** (manual, you + orchestrator)
- **Phase A5 — Rate limiting via Upstash Redis** (packet, blocks public launch)
- **Phase A2 — Lighthouse + a11y pass** (packet)
- **Phase A4 — Security review** (packet)
- **08 — Sentry re-add** (packet, can land any time now there's traffic to monitor)
- **23 — Group co-curation** (packet)
- **27 — Social outbound** (packet)
- **18-followup — share-sheet client-side analytics events** (small)

---

## After every dispatch cycle

Worker session: reply with ONE message:

```
Dispatched N packets. Branches:
- claude/packet-NN-<slug>: <2-line summary>
- ...

Issues (if any):
- packet NN: <error>
```
