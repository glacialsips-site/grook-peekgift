# Packet 29 — Codebase audit (find every shortcut, no fixes)

- **Worker:** cc-on-web
- **Branch:** `claude/packet-29-audit`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** none
- **Validation:** none (this packet writes a report, doesn't change code)
- **Target paths:** `_packets/AUDIT.md` (new)

## Context

The orchestrator made several "speed > correctness" trade-offs during the original batch dispatches. The user explicitly never authorized these and wants them surfaced before any more product work happens. This packet doesn't fix anything — it produces a definitive list of every shortcut, placeholder, untested integration, `any`/`as unknown as` cast, fallback-that-should-be-an-error, and known issue across `atelier/`. Subsequent packets (30-35) fix specific categories.

Be aggressive. Default to "this is a shortcut" rather than "this is fine." The user would rather see a flagged item that turns out to be acceptable than miss a real one.

## Deliver

`_packets/AUDIT.md` with the following sections. Each finding includes file:line, the shortcut, what "right" would look like, and which subsequent packet (30-35) it falls under.

### 1. Type safety holes

Anything that defeats TS's guarantees. Find:
- Every `as unknown as`, `as any`, `as never`, `// @ts-ignore`, `// @ts-expect-error`
- Every `Record<string, unknown>` used as a placeholder for a real type
- Every `unknown` that should be a real type
- Every Zod schema looser than the runtime shape (e.g. `z.unknown()`, `z.any()`, missing `.strict()`)
- Every Drizzle column with `$type<...>()` that doesn't match how the column is actually queried
- Database types: `lib/supabase/types.ts` is `Database = { peek_v2: { Tables: { [k: string]: AnyTable }, ... } }` — a permissive scaffold. Every `.from(...)` query is essentially untyped. Note the cost.

### 2. Security shortcuts

- HMAC fallback in `app/g/[slug]/page.tsx` + `app/api/pick/route.ts`: when `GUEST_CLAIM_TOKEN_SECRET` is missing, signs as `unsigned:<sessionId>` and continues. **Fail open.** Should fail closed.
- Anon turn metering on `/api/chat`: enforced by counting `events` rows. Easy to bypass by changing `sessionId` client-side. Should be IP-keyed AND session-keyed.
- No rate limiting anywhere despite Upstash deps installed in packet 01.
- No CSP headers. Inline scripts unrestricted. Cross-origin policy unset.
- No webhook idempotency keys on Stripe/Clerk/Skimlinks handlers. Replay-attack window open.
- Service-role client used in some webhook routes for writes that could use the curator's authenticated session — over-privileged in a few places.
- `event.data.id` from Clerk delete events used without validation (Svix already verified, so probably fine — but document it).
- Catch any other security smells. Output to AUDIT.md and tag for packet 31.

### 3. Reliability holes

- No retry/backoff on external API calls (fal.ai, Browserbase, ZenRows, Resend, Twilio, Skimlinks, Stripe). Any transient failure surfaces as user-visible error.
- No React error boundaries. One bad render = blank UI.
- `console.error` scattered across the codebase. No structured logging. No log levels.
- `try { ... } catch {}` swallows in several places (see `_packets/COMMENTS.md` for the one that's documented; find others).
- Tag for packet 33.

### 4. Test + CI gaps

- Zero unit tests (Vitest installed in packet 01, never used).
- Zero E2E tests (Playwright installed, never used).
- No GitHub Actions running typecheck / lint / test on PR or push (only the deploy hook).
- No preview-deploy gating.
- Tag for packet 32.

### 5. Observability gaps

- No Sentry (was ripped out pre-batch-1, never re-added).
- LLM observability captures per-iteration of inner agent loop instead of per user-turn — noisy.
- Client-side share events (copy / native / twitter / facebook / iMessage / WhatsApp) don't fire (worker flagged in packet 25 NOTES).
- No PII redaction in `events` payloads.
- OG image regenerates on every fetch — no per-Peek caching with invalidation. Expensive for viral Peeks.
- Tag for packet 34.

### 6. Performance + quality gaps

- Vibe palette extractor (`lib/vibe/extract-palette.ts`): JPEG branch uses a byte-histogram fallback that returns near-random colors. Most hero images are JPEG. Worker flagged this.
- Inngest scrape-worker calls `/api/scrape` over HTTP from inside an Inngest function. Should call the internal pipeline directly.
- No image-size limits at storage RLS level.
- Chat history loads ALL messages on every page mount. No pagination.
- Realtime channel: no reconnection backoff, no optimistic updates.
- Mobile slide-up sheet built with framer-motion from scratch — no real-device testing.
- Touch targets unaudited.
- Aria labels missing on most interactive components.
- Tag for packet 35.

### 7. Code organization smells

- `lib/peek/types.ts` Vibe diverges from `db/schema/peeks.ts` Vibe.
- Several tool files have logic that should live in `lib/` helpers.
- `try/finally` patterns inconsistent (some use the `success = false` flag, some don't).
- Stale comment / TODO / `// removed for X` strings — find any.
- Unused exports (run a dead-code scan).
- Tag for relevant packet or surface as new follow-up packets.

### 8. Documentation drift

- `_packets/06-clerk/prompt.md` and several other early packets describe `<SignIn />` / `<SignUp />` use that's about to be removed by packet 28. Note which packet prompts have outdated specs.
- README.md at `atelier/` if it exists — verify it matches current reality.

### 9. Worker-noted concerns (re-confirm)

Cross-check every NOTES.md the workers left for items the orchestrator did NOT action:
- packet 14: prefers-reduced-motion handling never wired
- packet 15: `publish-cta.tsx` location (already fixed in 20)
- packet 17: Vibe casts in `app/build/[peekId]/page.tsx:68` (already fixed by orchestrator)
- packet 18: schema-exposure migration applied to live; verify it's idempotent for fresh DBs
- packet 22: Browserbase one-shot API unverified — list every external API endpoint where shape is assumed not verified
- packet 24: Skimlinks webhook signature format unverified
- packet 25: PostHog reverse-proxy untested with real traffic
- packet 26: Inngest signing-key path untested in live

### Output format

```markdown
# AUDIT — atelier/

_Generated by packet 29 on <date>._

## Summary

- N total findings
- M critical (security / data loss)
- K major (reliability / correctness)
- L minor (quality / polish)

## Findings (grouped by target packet)

### → Packet 30 (Type safety)
- `<path>:<line>` — <what's wrong> — <what "right" looks like>
- ...

### → Packet 31 (Security)
- ...

### → Packet 32 (Tests + CI)
- ...

### → Packet 33 (Reliability)
- ...

### → Packet 34 (Observability)
- ...

### → Packet 35 (Quality)
- ...

### → New follow-up packet needed
- ...

## Anti-findings (things checked, no shortcut found)

- ...
```

## Constraints

- READ-ONLY. Do not modify any code. Output is only `_packets/AUDIT.md`.
- Use subagents aggressively (`isolation: "worktree"` Agent calls, one per major directory: `app/`, `lib/anthropic/`, `lib/scrape/`, `lib/vibe/`, `lib/affiliate/`, `lib/analytics/`, `lib/inngest/`, `lib/jobs/`, `lib/chat/`, `lib/auth/`, `lib/supabase/`, `lib/image-gen/`, `lib/email/`, `lib/stripe/`, `lib/peek/`, `components/`, `db/`). Each subagent audits its slice and reports findings; you compose the final report.
- Don't suggest the same fix in two places — pick the right packet.
- Be terse. One bullet per finding. The point is the LIST, not the prose.

## Reply format

Branch `claude/packet-29-audit`, commit `packet 29: audit report`, push. Reply with: `N findings (M critical, K major, L minor). AUDIT.md committed.` Nothing else.
