# Comment audit log

Every comment that lands in the codebase must be logged here with the WHY it can't be a code change. Audited periodically; stale ones get removed (and code re-checked).

Format:

```
- `path/to/file.ts:LINE` — "<the comment>" — <why a comment, not a code change>
```

## Current entries

- `atelier/lib/anthropic/tools/generate_hero_image.ts:tryEvolveVibe` — "intentionally swallowed: vibe evolution is best-effort" — empty catch block needs a WHY so a future reader doesn't think the error swallow is a bug; vibe evolution is a packet-21 background signal and must not fail the user-visible image gen tool turn.
- `atelier/lib/scrape/browserbase.ts:session-cleanup` — "session cleanup is fire-and-forget; logging the failure here is enough to debug a leaking session without retrying (cost > benefit for cleanup)" — packet 33 audit: documents why the cleanup branch logs at debug-only rather than retries (we already have a session leak monitor on Browserbase's side).
- `atelier/lib/anthropic/client.ts:console.warn` — "[anthropic] ANTHROPIC_API_KEY is not set …" — module-load warning runs before the logger module is reliably initialized (the logger imports env transitively in some build phases). Kept as `console.warn` per packet 33's "console at top-of-file warnings" rule.
- `atelier/lib/env.ts:console.error` — "Invalid environment:" — same reason; env validation runs at module-load and the logger imports env, so we'd loop.
- `atelier/lib/supabase/server.ts:server-component-cookie-set` — "server-component context — cookies are read-only here" — Next.js SSR rendering context can't mutate the cookie jar; the swallow is by design, this comment names the WHY.
