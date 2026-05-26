# Packet 30 — Type safety pass (kill placeholders, casts, anys)

- **Worker:** cc-on-web
- **Branch:** `claude/packet-30-type-safety`
- **Depends on (sequencing):** `atelier-integration`. Reads `_packets/AUDIT.md` (packet 29) if available — works without it.
- **Imports from siblings:** none. Touches many files but doesn't add cross-packet imports.
- **Validation:** `cd atelier && npm install && npm run build` AND `npm run typecheck` must both be clean. Zero `any`, zero `as unknown as`, zero `@ts-ignore`, zero `Record<string, unknown>` placeholder Database types remaining.
- **Target paths:** `atelier/lib/supabase/types.ts`, `atelier/db/types.ts` (new — generated), every file that currently uses `as unknown as` or `any`, `lib/peek/types.ts` (align with `db/schema/peeks.ts`), Zod schema files in tool handlers.

## Context

Database type is a permissive `{ peek_v2: { Tables: { [k:string]: AnyTable } } }` scaffold. Every Supabase query returns `unknown`-shaped rows, the code casts at every call site. Tools cast their inputs through `as unknown as`. The Vibe type in `lib/peek/types.ts` drifted from the schema's Vibe. Zod schemas in tool inputs sometimes accept more than the runtime actually handles. Plus a scattering of `as Card['unlockRule']`, `as RawPeekRow`, `as PeekMetaRow`, etc. for `.from().select()` results.

This packet fixes all of it.

## Deliver

### Generate real Supabase types

1. From `atelier/`, run: `npx supabase gen types typescript --project-id ewqpujqerdnrkjqlpobo --schema peek_v2 > lib/supabase/database.types.ts` (or via the Supabase CLI's `supabase login` + `link` if needed — the orchestrator can also do this if MCP `generate_typescript_types` is more reliable; surface in NOTES if you can't run the command).
2. Replace `lib/supabase/types.ts` contents with:
   ```ts
   export type { Database } from './database.types';
   ```
3. Re-export `Database` from `lib/supabase/index.ts` (already does).

### Verify all clients pick up the typed Database

- `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `lib/supabase/service.ts` already pass `<Database>` to `createClient<Database>()` — leave as-is, they now get real typing.

### Refactor every call site

Now that `db.from('peeks').select('*')` returns typed rows:

- Remove every `RawPeekRow`, `RawCardRow`, `RawVariantGroupRow`, `RawPickRow`, `PeekMetaRow` cast type. Use the generated row types directly.
- Delete the `as` casts after `.from().select()`. They're noise once types flow.
- `app/g/[slug]/page.tsx`, `app/build/[peekId]/page.tsx`, `app/build/[peekId]/publish/page.tsx`, `app/api/stripe/webhook/route.ts`, every chat / tool handler that queries Supabase: tighten.

### Drizzle row types

Where Drizzle is used (the chat persistence, the analytics events writer, the tool DB writes), `typeof table.$inferSelect` and `$inferInsert` are the source of truth. Use them. Remove cast types that duplicate this.

### Tool input casts

- `lib/anthropic/tools/scrape_url.ts`: `outcome.product as unknown as Record<string, unknown>` for the analytics payload — fix by widening the `scrape_complete` event payload type to accept the proper `ScrapedProduct` (or change the facade to use a generic). Same pattern in other tools where `trackFireAndForget(...)` complains.
- `lib/anthropic/tools/set_vibe.ts` + `update_vibe.ts`: if any `as unknown as Vibe` or `as Vibe` casts survived packet 17, kill them.
- `lib/anthropic/tools/index.ts`: `handler: handler(input as never, ctx)` — this is correct (it's the registry generic shaving). Document with one comment in COMMENTS.md but leave the cast — it's a real registry constraint.

### Align Vibe types

- `lib/peek/types.ts` Vibe must match the schema Vibe in `db/schema/peeks.ts`. Re-export from the schema rather than duplicating, OR define one canonical Vibe in `db/schema/peeks.ts` and have both DB and UI types import from there.

### Zod tighten

- Every tool `InputSchema` should be `.strict()` (rejects unknown keys).
- Inputs with enums should use `z.enum([...])` not `z.string()`.
- URL inputs: `z.string().url()` not `z.string()` then runtime-check.
- Cents amounts: `z.number().int().nonnegative().max(10_000_000)` to cap silly values.
- `metadata: jsonb` fields: define a `MetadataSchema = z.record(z.string(), z.unknown())` at minimum, or a real shape if there is one.

### `any` elimination

Grep for `: any` and `<any>` and `any[]` across `atelier/`. Fix every one. Most will resolve to `unknown` + a narrow, or to a typed shape.

### `@ts-ignore` / `@ts-expect-error` elimination

Grep, fix, or document why retained in `_packets/COMMENTS.md`.

### Strict TS config audit

- `tsconfig.json` is strict per packet 01, but verify `noUncheckedIndexedAccess` is on. After enabling, fix the unsafe `array[i]` accesses (use `array.at(i)` or `array[i]!` if proven non-null by context).
- Add `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature` if not already on. Fix resulting errors.

## Constraints

- TS strict, expanded.
- Zero `any`, `as unknown as`, `@ts-ignore` remaining (unless logged in `_packets/COMMENTS.md` with WHY).
- Build + typecheck both green.
- Do not change runtime behavior unless a type change reveals a real bug (in which case fix it and call it out in NOTES.md).
- Don't modify `package.json` (unless `supabase` CLI needs to be devdep-added — surface in NOTES if so).
- Use subagents per directory (`lib/anthropic/`, `lib/supabase/`, `app/api/`, `app/g/`, `app/build/`, `components/`) for parallel work.

## Reply format

Branch `claude/packet-30-type-safety`, commit `packet 30: type safety pass`, push. NOTES.md with: count of casts removed, count of `any` killed, any tsconfig knobs added, any deviations.
