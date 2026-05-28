# peek.gift — Anthropic API context

A reference for the Anthropic side of the stack. Pairs with the product brief. Facts and mechanics are stated; tradeoffs are surfaced; the conclusions are yours.

---

## Account state

- Org: **Peek.Gift** (`ebe4a13c-a018-4291-b26c-7f66f8140a59`), one admin (Frank), credit-balance billing, no Team subscription.
- Workspaces: one (`Default`) containing four runtime API keys (`sk-ant-api03-…`).
- One Admin API key provisioned (`sk-ant-admin01-…`); exposed to server-side jobs only, env var convention `ANTHROPIC_ADMIN_KEY`.
- One service account `usage` (`svac_01GGADZbsaTaMHK6Cjh2uxg9`) exists with no federation rules attached. It's a leftover from a WIF exploration; not currently in any code path.
- Rate-limit tier: **Tier 1**. Tiers auto-advance with cumulative credit purchases ($5 → Tier 1, $40 → Tier 2, $200 → Tier 3, $400 → Tier 4). Custom limits via sales above Tier 4.
- Monthly spend cap: $500. Auto-reload: off. Current balance fluctuates ~$13–15.
- Disclosures filed during org setup: business is consumer-facing, used internationally, not for legal/medical/financial advice to consumers, not intended for under-18 users.

---

## Model lineup and pricing

All prices per million tokens, base (no caching, no batch discount).

| Alias | Input | Output | Context | Max output | Notes |
|---|---|---|---|---|---|
| `claude-opus-4-7` | $5 | $25 | 1M | 128K | Adaptive thinking. Latency: moderate. |
| `claude-sonnet-4-6` | $3 | $15 | 1M | 64K | Extended + adaptive thinking. Latency: fast. |
| `claude-haiku-4-5` | $1 | $5 | 200K | 64K | Extended thinking. Latency: fastest. |

Aliases auto-track the latest snapshot. Dated IDs (e.g. `claude-haiku-4-5-20251001`) pin a specific snapshot — useful for evals and regression tests where you want to isolate prompt changes from model changes.

Output tokens are 5× input across the board, so generation length is usually the dominant cost lever, not model selection.

Image inputs count as tokens by area. A 1568×1568 image is roughly 1.6K tokens; a 512×512 is roughly 165 tokens. Downscaling before send is approximately free quality-wise for most use cases and ~10× cost difference.

---

## Prompt caching

Mechanics:

- A `cache_control: { type: "ephemeral" }` marker on a content block tells the API "cache the prefix up to and including this block."
- Cache **writes** cost ~1.25× base input (5-minute TTL) or ~2× base input (1-hour TTL).
- Cache **reads** cost ~10% of base input (e.g. $0.30/MTok on Sonnet vs. $3 base).
- Minimum cacheable block size: 1024 tokens for Opus/Sonnet, 2048 for Haiku. Below the minimum, the marker is silently ignored.
- TTL resets on every read within the window.

What this means in practice: any token that appears in every request is dramatically cheaper after the first call. Anything that varies per request lives after the breakpoint and is billed at base.

Shape that maximizes hit rate:

```
[ stable system prompt          ]
[ tool definitions              ]
[ persona / style guide         ]
[ retrieved long context (opt.) ]  ← cache breakpoint here
[ per-request user input        ]  ← varies
```

If the cached prefix mutates per request (e.g. user name interpolated into the system prompt), the cache misses every time. Variables go after the breakpoint, or are passed as tool inputs / message content.

For peek.gift specifically: the chat instance's persona, the rules-engine schema description, the page-model JSON schema, and any "how to build a gift page" instructions are all good candidates to live in the cached prefix. The per-conversation curator inputs (images, voice transcripts, free text) sit after.

---

## Batch API

`POST /v1/messages/batches` accepts an array of message requests, processes asynchronously, SLA up to 24 hours. All token usage billed at **50% off** the base rates above. Limit: 50 batch requests submitted per minute.

Fit shape: anything not on a user's critical path. Examples that might come up in peek.gift: nightly enrichment of suggested-item catalogs, bulk pre-generation of hero image prompts for common occasion archetypes, eval suite runs, classifier backfills, A/B prompt sweeps.

Doesn't fit interactive chat or streaming UX (latency is async, not realtime).

---

## Streaming

`stream: true` on the messages endpoint returns SSE events as tokens are generated. Two reasons it tends to matter:

1. Time-to-first-token is dramatically lower than time-to-full-response, so perceived latency drops even when total latency doesn't.
2. The generation can be aborted mid-stream if the user navigates away or a stop condition triggers, refunding the unspent output tokens.

For peek.gift's chat surface, streaming is the natural choice. The relevant plumbing is SSE proxy through your backend so the runtime key isn't exposed to the browser.

---

## Rate limits

Tier 1 per-minute ceilings:

| Model | RPM | Input TPM | Output TPM |
|---|---|---|---|
| Opus | 50 | 500K | 80K |
| Sonnet | 50 | 30K | 8K |
| Haiku | 50 | 50K | 10K |

Batch: 50 batch submissions/min. Web search tool: 30/sec. Files API: 500 GB storage org-wide.

Sonnet's 8K output TPM is usually the first thing to bind under bursty traffic — at ~500–800 output tokens per chat turn that's ~10–15 concurrent turns/min before throttling.

Every response carries headers worth surfacing to telemetry:

- `request-id` — opaque ID needed for any support escalation
- `anthropic-ratelimit-requests-limit` / `-remaining` / `-reset`
- `anthropic-ratelimit-tokens-limit` / `-remaining` / `-reset` (RFC 3339 timestamp)
- `retry-after` (only on 429, in seconds)

Tier advancement happens automatically on credit purchase. $40 in credits is the threshold from Tier 1 → Tier 2, which roughly doubles the ceilings above. The credits themselves are real spend, not a fee.

---

## Error surface

Codes you're likely to actually see, and what each implies:

| Code | Meaning | Retriable | Notes |
|---|---|---|---|
| 400 | Invalid request shape | No | Usually a code bug; the response body explains which field |
| 401 | Auth failure | No | Key revoked, mistyped, or wrong env |
| 403 | Scope/permission | No | Most relevant if a WIF-minted token is used outside its scope |
| 413 | Request too large | No | Trim context |
| 429 | Rate limit | Yes | `retry-after` is authoritative; jitter on top is wise |
| 500 | Server error | Yes | Backoff |
| 503 | Unavailable | Yes | Backoff |
| 529 | Overloaded | Yes | Sometimes worth falling back to a smaller/cheaper model rather than waiting |

The SDKs ship sensible default retry behavior on 5xx and 429. Wrapping calls in your own circuit breaker is the standard way to keep a sustained upstream incident from cascading into a frontend outage.

---

## Admin API

Base: `https://api.anthropic.com`. Auth: `x-api-key: $ANTHROPIC_ADMIN_KEY` and `anthropic-version: 2023-06-01`.

Endpoints relevant to operating peek.gift:

| Endpoint | Returns |
|---|---|
| `GET /v1/organizations/me` | Org metadata. Sanity check the admin key. |
| `GET /v1/organizations/usage_report/messages` | Token usage. Params: `starting_at`, `ending_at`, `bucket_width` (`1m`/`1h`/`1d`), optional `group_by` of `workspace_id`, `api_key_id`, `model`, `service_tier`, `context_window`. |
| `GET /v1/organizations/cost_report` | Same shape, dollars instead of tokens. |
| `GET /v1/organizations/usage_report/claude_code` | Claude Code dev-session telemetry (separate from product traffic). |
| `GET /v1/organizations/rate_limits` | Current rate-limit consumption. Useful for live headroom widgets. |
| `GET /v1/organizations/api_keys` | Inventory: key IDs, names, workspaces, statuses, last-used. |
| Activity Feed (Compliance API, read-only with admin key) | Audit log of admin actions and key lifecycle. |

These are all polled, not push. A 15-minute cron is usually enough for cost/usage; rate_limits is worth polling more often if you build a "how close are we to throttle" surface.

The admin key cannot send Messages — it only reaches `/v1/organizations/...`. Conversely, `sk-ant-api03-...` runtime keys cannot read the Admin API. The split is intentional.

---

## Service accounts and Workload Identity Federation

The `usage` service account exists, currently with no federation rules. WIF lets workloads (on AWS/GCP/Azure/K8s/GitHub Actions/etc.) exchange short-lived OIDC tokens from their environment for short-lived Anthropic access tokens, instead of holding a long-lived `sk-ant-api03-...` key.

Two OAuth scopes are currently available for WIF rules:

- `workspace:developer` — equivalent to a workspace API key (Messages, Files, Skills, Managed Agents, etc.)
- `org:manage_tunnels` — MCP tunnels only

Neither scope grants Admin API access. Usage/cost reporting must use an actual `sk-ant-admin01-...` key, not a WIF token.

WIF tradeoff: removes static credentials from the surface (no key to leak, no rotation cron), at the cost of requiring an OIDC-issuing identity provider in the deployment environment. Mostly compelling once the deploy footprint is multi-environment or audit pressure exists; less compelling for a single Netlify/Vercel-style deploy where env-var keys are already low-risk.

---

## Application-level telemetry

Independent of Admin API polling, the runtime emits per-call data the Admin API can't reconstruct:

- `request_id` (from response header) — links your logs to Anthropic's
- `model` (alias used)
- `input_tokens`, `output_tokens` (from response `usage` block)
- `cache_creation_input_tokens`, `cache_read_input_tokens` (from `usage`) — exposes cache hit rate
- `latency_ms_total` and `latency_ms_to_first_token` (when streaming)
- `workspace_id`, last 4 of API key
- hashed user/curator ID
- `feature` enum — `"chat_curator"`, `"hero_image_prompt"`, `"rules_extract"`, `"page_model_emit"`, etc.
- `prompt_version` if prompts are versioned in the repo
- outcome — `success` / `4xx` / `5xx` / `timeout` / `circuit_open`

This enables per-feature unit economics (cost per gift page built, cost per checkout-reached session, cache hit rate per surface) without waiting for Anthropic's reporting cadence, and lets you correlate spikes to deploys.

---

## Security shape

- Runtime API keys are server-side; the browser proxies through the backend. Streaming to the client works as SSE pass-through.
- The Admin API key is a separate, higher-privilege credential. Treating it like a root DB password (separate vault, no overlap with runtime code paths) is the conservative default.
- Per-environment keys reduce blast radius on rotation and on accidental key exposure in logs/PRs. Workspace separation (e.g. `production` vs `dev`) reinforces this by also splitting rate limits and cost attribution.
- Logs: full prompts and full completions often contain PII or user-volunteered sensitive content. Hashing user IDs and redacting prompt/completion bodies before they hit log sinks is standard practice. `request-id` is fine to log freely.
- Prompt-injection surface: curator-supplied images, voice transcripts, and free text feed into the same prompt that drives the page-model emission. Treating model output as data (parsed into the structured page model) rather than as commands (executed directly) is the safer composition. The rules engine being first-class structured data — rather than reified from the chat's freeform text — leans into this.
- Org disclosures filed during setup imply a few content constraints worth knowing about: international users allowed (Anthropic's supported-country list applies), product positioned as 18+, not used for legal/medical/financial advice. A Haiku-based content filter on curator inputs is a cheap way to enforce these consistently regardless of which surface the input came from.

---

## Lever summary

A condensed view of the cost/perf levers and their typical shape:

| Lever | Typical impact | Effort |
|---|---|---|
| Caching the stable prefix | -50% to -90% on input cost for chat surfaces | Low; one `cache_control` marker |
| Routing classifier-style calls to Haiku | -3× on input cost vs. Sonnet | Low; explicit model choice per feature |
| Tight `max_tokens` and structured-output prompts | -20% to -70% on output cost | Low; per-call config |
| Streaming | Big perceived-latency win, allows early abort | Low |
| Batch API for non-realtime work | -50% on token cost | Medium; async plumbing |
| Image downscale before send | ~10× cost cut on image-heavy calls | Low |
| Prompt eval discipline (versioned prompts + Haiku grader) | Prevents quality regression on prompt edits | Medium |
| Pre-buy credits to advance tier | Doubles rate-limit headroom at no net cost | Trivial |
| Auto-reload on billing | Eliminates a class of outage (zero balance) | Trivial |
| Workspace split (prod/dev) | Cleaner cost attribution + isolated rate limits | Low, easier before traffic exists |
| WIF | Removes long-lived keys from deploy surface | Medium-high; needs OIDC IdP in deploy env |

---

## Where this is wrong

Source of truth is `docs.claude.com`. When a model ships, a price changes, or a scope/endpoint is added, that's authoritative. This file lags by definition; PRs adopting Anthropic-side changes are a reasonable place to update it.
