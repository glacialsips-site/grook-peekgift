# RUN-NEXT — the live dispatch queue

_Owner: orchestrator updates this file after every batch lands. Worker session reads it and dispatches subagents._

## How the worker session uses this file

You (cc-on-web worker) are the single point of contact for the user. Each "go" or "dispatch" command means:

1. `git pull origin atelier-integration`.
2. Read this file — the **Ready batch** below.
3. **For each READY packet, spawn an Agent subagent with `isolation: "worktree"`** in a SINGLE message containing parallel Agent tool calls. Don't dispatch one at a time. Don't await one before starting the next.
4. Standard subagent prompt template:

   > Read CLAUDE.md, _packets/PROTOCOL.md, _packets/STATE.md, _packets/AUDIT.md (if it exists), then execute _packets/NN-<slug>/prompt.md EXACTLY. Work on branch `claude/packet-NN-<slug>` in your isolated worktree (`pwd` should end in `.claude/worktrees/agent-*`). The packet itself says to use sub-sub-agents per directory/concern where parallel work is possible — DO THAT, max parallelism within your packet. Validate per the prompt's Validation rule. Commit `packet NN: <one-line summary>` and push. Reply with branch + 2 sentences + any NOTES.md key takeaway.

5. Once ALL subagents return, push any STATE/RUN-NEXT updates you made, report results to the user in ONE message:
   ```
   Dispatched N packets in parallel. Returns:
   - claude/packet-NN-<slug>: <1-line>
   ...
   ```
6. End your turn.

**Critical: subagents within each packet ALSO use sub-sub-agents.** The packets explicitly say "use subagents per directory/per concern" — make sure your dispatched subagent honors that, doesn't go serial.

---

## Ready batch — 8 packets, dispatch in parallel

| Packet | Path | What it kills | Branch on completion |
|---|---|---|---|
| 28 | `_packets/28-custom-auth-ui/prompt.md` | Clerk's branded `<SignIn />` / `<SignUp />` — replace with our custom forms via hooks | `claude/packet-28-custom-auth-ui` |
| 29 | `_packets/29-audit/prompt.md` | Surfaces every shortcut + drift across `atelier/` → writes `_packets/AUDIT.md`. **NO CODE CHANGES.** Other packets reference its output. | `claude/packet-29-audit` |
| 30 | `_packets/30-type-safety/prompt.md` | Generated Supabase types replace `Record<string, unknown>` placeholder; kill every `as unknown as` / `any` / `@ts-ignore` | `claude/packet-30-type-safety` |
| 31 | `_packets/31-security/prompt.md` | HMAC fail-closed, Upstash rate-limiting, CSP headers, webhook idempotency, service-role audit | `claude/packet-31-security` |
| 32 | `_packets/32-tests-ci/prompt.md` | Vitest unit + Playwright E2E + GitHub Actions running typecheck/lint/test/build on every push & PR | `claude/packet-32-tests-ci` |
| 33 | `_packets/33-reliability/prompt.md` | React error boundaries, structured logger, retry/backoff on every external API call | `claude/packet-33-reliability` |
| 34 | `_packets/34-observability/prompt.md` | Sentry re-add, OG image caching, internal scrape-worker call, client-side share events, per-turn LLM observability aggregation | `claude/packet-34-observability` |
| 35 | `_packets/35-quality/prompt.md` | A11y audit + fixes, SEO basics, mobile slide-up sheet hardening, real palette extraction (replaces JPEG byte-histogram) | `claude/packet-35-quality` |

All 8 target separate paths or are read-only. Conflicts on integration are mechanical (orchestrator handles).

### Suggested dispatch order if you must serialize for some reason

You shouldn't serialize. But if a subagent crashes mid-flight:
- Dispatch 29 (audit) FIRST in its own batch — it's read-only and produces input for the others.
- Then dispatch 28, 30-35 in one parallel batch.

In practice: dispatch all 8 at once. Subagents are isolated worktrees. They don't see each other's work mid-flight. Conflicts surface at orchestrator integration time, not in your dispatch.

---

## Pre-dispatch checks (worker confirms with the user)

Before dispatching, verify with the user:

1. **Clerk `peek-gift-vnext.netlify.app` is an authorized origin** in Clerk Dashboard. Without this, packet 28's custom UI still won't render. User is fixing this manually.
2. **Upstash Redis env vars** (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) are set on Netlify. Packet 31 wires rate-limiting; without these vars it falls back to "allow with warning" but degrades the value of the packet. If user hasn't set these, dispatch 31 anyway — orchestrator wires Upstash in a follow-up if needed.
3. **`GUEST_CLAIM_TOKEN_SECRET`** is set on Netlify (≥32 chars). Packet 31 makes this REQUIRED — if the env var is absent, deploys break. User sets it via Netlify dashboard or orchestrator does it via MCP before merge.
4. **Sentry org/project + DSN** if you want packet 34 to fully work — DSN can be missing (Sentry init no-ops), but the build wraps with `withSentryConfig`. Surface to user; not blocking.

If any precondition is unclear, ask once, then proceed with the assumption stated.

---

## Drafted but not yet ready (lower-stakes, queued for after this batch)

- **36 — i18n (next-intl):** currently English-only including the Peek persona. Wait until product is stable on EN.
- **37 — Performance pass:** bundle analysis, code splitting strategy, image optimization audit. Wait until real traffic exists.
- **38 — Cost dashboard:** structured logs → PostHog → vendor-cost rollup. After 33 + 34 settle.
- **23 — Group co-curation MVP**: full multi-curator flow, invite tokens, role-gated tools.
- **27 — Social outbound** (Pinterest, IG, TikTok, Buffer/Ayrshare).
- **A1 — Live $12 payment smoke test:** manual, post-packet-28.

---

## After every dispatch cycle

Reply to the user with ONE message:

```
Dispatched <N> packets in parallel.

Branches & summaries:
- claude/packet-NN-<slug>: <2-line summary, key NOTES takeaway>
- ...

Failed/blocked:
- packet NN: <error>

Pre-merge actions still on the user (if any):
- ...
```

Then end your turn. Orchestrator takes integration from there.
