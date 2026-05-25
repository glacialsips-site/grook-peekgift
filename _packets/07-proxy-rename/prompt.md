# Packet 07 — Rename `middleware.ts` → `proxy.ts` (Next 16)

- **Worker:** cc-on-web | webchat-opus
- **Branch:** `claude/packet-07-proxy-rename`
- **Depends on (sequencing):** `atelier-integration` (batch 1 trunk)
- **Imports from siblings:** none
- **Validation:** `cd atelier && npm install && npm run build`
- **Target paths:** `atelier/middleware.ts`, `atelier/proxy.ts`

## Context

Next 16 deprecated the `middleware.ts` convention in favor of `proxy.ts`. Packet 06 wrote `middleware.ts`; build is green but prints a deprecation warning. Rename the file and confirm the deprecation warning disappears.

The internal API of `proxy.ts` is identical to `middleware.ts` — same `clerkMiddleware` wrapper, same `createRouteMatcher`, same `config` export. Pure file rename.

## Deliver

1. Move `atelier/middleware.ts` → `atelier/proxy.ts`. Same contents.
2. Verify `npm run build` no longer prints the `"middleware" file convention is deprecated` warning.
3. If anything else in the codebase references `middleware.ts` by name (e.g. config files), update those references.

## Constraints

- No code changes inside the file beyond the rename. The Clerk-middleware logic stays exactly as written.
- Do not touch any other file unless it explicitly names `middleware.ts`.

## Reply format

Branch `claude/packet-07-proxy-rename`, commit `packet 07: middleware → proxy`, push. 1-sentence reply.

Worker briefing (always apply): workspace check (`pwd` in `.claude/worktrees/agent-*/`), code only with no narrative comments (log any necessary ones to `_packets/COMMENTS.md`), surface ambiguities in NOTES.md not chat, minimal reply.
