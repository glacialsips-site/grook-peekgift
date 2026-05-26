# Packet 30 — Type safety pass

## Counts

- **`as unknown as` casts removed:** 3 of 4. One remains by design at `atelier/lib/anthropic/tools/index.ts:24` (registry generic-erasure); documented in `_packets/COMMENTS.md`.
- **`: any` annotations killed:** 0 — base trunk was already clean (zero `: any`, zero `<any>`, zero `any[]`). The few `any` occurrences in source files were all inside English text (system prompt, tool descriptions, JSDoc strings).
- **`@ts-ignore` / `@ts-expect-error` directives removed:** 0 — none existed on trunk.
- **`Record<string, unknown>` placeholder Database types removed:** 1 (the `AnyTable`/`AnyRow` scaffold in `lib/supabase/types.ts`).
- **Hand-rolled snake_case row types deleted:** ~12 (`RawPeekRow`, `RawCardRow`, `RawVariantGroupRow`, `RawPickRow`, `PeekRow`, `PeekMetaRow`, `PeekShareRow`, `PeekOgRow`, `CardRow`, `GroupRow`, `PeekSharePageRow`, etc.) — all rows now flow from the typed `DbRow<'table'>` helper.
- **Zod schemas tightened with `.strict()`:** 14 (every tool input schema + `ChatRequestSchema` + `/api/checkout` + `/api/pick` POST + `/api/pick` DELETE + `/api/scrape` + `/api/share/send` + skimlinks webhook payload).
- **`tsconfig` knobs added:** `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`. (`noUncheckedIndexedAccess` was already on.)

## Architecture: Drizzle-as-canonical Database type

`atelier/lib/supabase/database.types.ts` (new) derives the Supabase JS client `Database` shape from every Drizzle table's `$inferSelect` / `$inferInsert`. Two layers:

1. **`CamelToSnake<S>`** template-literal type — maps Drizzle's camelCase TS field names (`curatorId`) to the Postgres snake_case column names that `.from('peeks').select('curator_id')` actually queries.
2. **`WireSelect<T>` / `WireInsert<T>`** — replace `Date` with `string` on Row (Supabase REST returns ISO strings, not `Date`); accept `Date | string` on Insert so callers can pass either. **Critical fix**: the `Date`-replacement conditional uses `V extends Date ? string : V` rather than `V extends Date | null ? string | null : V` to avoid TS's distributive-conditional eating null unions and silently widening `number | null` to `string | number | null`.

Exports a `DbRow<T>` / `DbInsert<T>` / `DbUpdate<T>` helper so call sites can write `DbRow<'peeks'>` instead of dereferencing the full path.

## Vibe re-canonicalization

`atelier/lib/peek/types.ts` now re-exports `Vibe`, `VibeCore`, `VibePalette`, `VibeMotion`, `VibePreset`, `VibeFontPairing`, `VibeSignalSource`, `VibeSignalSourceEntry` directly from `@/db/schema/peeks`. The previous UI-side duplicate Vibe (missing `preset`, `signal_source_history`) is gone. `UnlockRule` is now `Partial<SchemaUnlockRule>` so the empty-default jsonb satisfies the UI type without a cast.

## Trust-boundary casts kept (NOT `as unknown as`)

A handful of `as Type` casts remain at deserialization boundaries where runtime validation is impractical or would duplicate Zod work:

- `app/api/chat/route.ts` history/userMessage cast to `Anthropic.MessageParam[]` / `ContentBlockParam[]`. The Zod schema in `app/api/chat/schema.ts` was tightened to validate role/content shape but full Anthropic block-union validation would duplicate the SDK's runtime guard.
- `lib/peek/realtime.ts` / `components/recipient/realtime.ts` — Supabase realtime payloads come typed as `Record<string, unknown>`; converters use property-by-property runtime guards (`asString`, `asNullableNumber`, etc.) + literal-union narrows (`isCardType`, `isPeekStatus`, `isVariantSelection`).
- `lib/jobs/nudge-relationships.ts` — Drizzle `db.execute<NudgeRow>(sql\`...\`)` returns a result whose `rows` accessor isn't exposed in the public type. Replaced the `as unknown as` cast with a narrowed `toArray<T>(result)` runtime-guard helper.
- `app/api/webhooks/skimlinks/route.ts` raw_payload — replaced `evt as unknown as Record<string, unknown>` with a tiny `toRawPayload(evt: SkimlinksEvent)` spread (`{ ...evt }`); also moved JSON validation onto a Zod schema with `.passthrough()`.

## Behavior changes (intentional)

- **`app/api/webhooks/clerk/route.ts`** — when a Clerk user has no primary email address, the upsert is skipped (returns `200 ok`) rather than passing `null` to a `notNull()` column and erroring with `upsert failed`. The Drizzle schema for `users.email` is `text().notNull()`; the route was previously type-cheating with `as` and would have hit a Postgres constraint violation at runtime. Now fails cleanly with a 200 "missing email" response and `success=true` on the webhook-log.
- **`app/api/scrape/route.ts`** — `recordScrapeEvent` now uses `DbInsert<'events'>` instead of a `Record<string, unknown>`. Same wire format; just typed.

## Files changed

- New: `atelier/lib/supabase/database.types.ts`
- Replaced: `atelier/lib/supabase/types.ts` (`AnyTable` scaffold → re-export of new Database)
- Refactored: `atelier/lib/peek/types.ts` (Vibe re-canonicalization)
- Refactored: every `/app/api/**/route.{ts,tsx}` that hits Supabase
- Refactored: `/app/g/[slug]/{page,opengraph-image}.tsx`, `/app/build/**/page.tsx`, `/app/build/[peekId]/publish/publish-status.tsx`
- Refactored: `lib/{analytics/facade,chat/{session,persistence},peek/realtime,jobs/nudge-relationships,vibe/{evolve,classify-tone}}.ts`
- Refactored: `components/recipient/realtime.ts`
- Tightened Zod (`.strict()` + URL/cents bounds + regex hex colors): every `lib/anthropic/tools/*.ts` + `app/api/chat/schema.ts` + share/send + pick + checkout + scrape routes
- Trivial process.env index-access fixes for `noPropertyAccessFromIndexSignature`: `db/{client,migrate}.ts`, `drizzle.config.ts`, `instrumentation.ts`, `instrumentation-client.ts`, `components/providers.tsx`, `app/api/posthog/[...path]/route.ts`, `app/api/stripe/webhook/route.ts`, `lib/vibe/classify-tone.ts`
- `tsconfig.json`: added `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`

## Validation

`cd atelier && APP_URL=http://localhost:3000 npm install && npm run typecheck` — green.
`cd atelier && APP_URL=http://localhost:3000 npm run build` — green; all 21 routes compile (15 page routes + 6 internal). No new warnings beyond pre-existing edge-runtime + ANTHROPIC_API_KEY-not-set notices.

## Deviations from prompt

- **Did not run `supabase gen types`** — explicitly forbidden by the prompt's rewritten "Build the Database type from Drizzle" section. Implementation uses the Drizzle adapter as instructed.
- **Did not delete `RawPeekRow` etc. from a single shared module** — they were already file-local in every page/route file. Deleted in place rather than centralizing.
- **One `as unknown as` survives at `lib/anthropic/tools/index.ts:24`** — registry generic-erasure. Per packet 30's explicit instruction (`handler: handler(input as never, ctx)` discussion), this cast is correct and is logged in `_packets/COMMENTS.md`.
