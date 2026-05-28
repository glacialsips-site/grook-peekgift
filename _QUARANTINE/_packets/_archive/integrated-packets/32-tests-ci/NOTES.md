# Packet 32 — Tests + CI — Worker notes

## What landed

Branch: `claude/packet-32-tests-ci` (from `5376e52`).

### Files added

- `atelier/vitest.config.ts` — node env, `@`-path alias, forks pool, v8 coverage.
- `atelier/tests/setup.ts` — env stub (APP_URL, NODE_ENV, Supabase URL/keys) + `server-only` mock.
- `atelier/tests/unit/affiliate.test.ts` — 11 tests for `wrap`, `buildClickCustomId`, `parseClickCustomId`.
- `atelier/tests/unit/classify-cards.test.ts` — 8 tests for `lib/vibe/classify-cards.ts`.
- `atelier/tests/unit/extract.test.ts` — 8 tests for `lib/scrape/extract.ts` with Anthropic mocked + HTML fixtures.
- `atelier/tests/unit/session.test.ts` — 15 tests for `lib/chat/session.ts` (`assertPeekAccess`, `anonymousTurnCount`, `anonymousTurnExceeded`, `recordEvent`).
- `atelier/tests/unit/analytics.test.ts` — 6 tests for `lib/analytics/facade.ts` (`track`, `trackFireAndForget`, distinct-id, PostHog-on/off).
- `atelier/tests/integration/tool-registry.test.ts` — 7 tests for the tool registry (bootstrap, schemas, dispatch, `ping`, dup-register, unknown).
- `atelier/tests/fixtures/scrape/{product-simple,product-noisy}.html` — extractor input fixtures.
- `atelier/playwright.config.ts` — Chromium + iPhone 14 projects, GH reporter on CI.
- `atelier/tests/e2e/landing.spec.ts` — 2 specs for `/` (heading + Start a Peek + Sign in links).
- `atelier/tests/e2e/anon-build.spec.ts` — 2 specs that tolerate either anon-build or sign-in redirect behavior.
- `atelier/tests/e2e/auth.spec.ts` — 1 sign-up + sign-in spec, `.skip()`'d behind `CLERK_TEST_MODE` env.
- `atelier/eslint.config.mjs` — flat config (`tseslint.configs.recommended` + `@next/next` recommended + core-web-vitals + custom rules).
- `.github/workflows/ci.yml` — typecheck + lint + test + build on push/PR to `atelier-integration` and `main`.

### Files modified

- `atelier/package.json` — replaced `next lint` (removed in Next 16) with `eslint .`; added `test` / `test:watch` / `test:coverage` / `test:e2e` scripts.
- `atelier/.gitignore` — added `playwright-report/`, `test-results/`, `.playwright/`.

## Validation

All four green locally on the worker container:

```
npm run typecheck   # 0 errors
npm run lint        # 0 errors, 5 warnings (pre-existing code, none in test files)
npm run test        # 6 files, 54 tests passed
npm run build       # 21 routes compiled
```

## Test counts

| Suite | Tests |
|---|---|
| affiliate | 11 |
| classify-cards | 8 |
| extract | 8 |
| session | 15 |
| analytics | 6 |
| tool-registry (integration) | 7 |
| **Vitest total** | **54** |
| landing E2E | 2 |
| anon-build E2E | 2 |
| auth E2E (skipped behind `CLERK_TEST_MODE`) | 1 |

## Eslint rules added (effective rule set in flat config)

- `tseslint.configs.recommended` (full preset)
- `@next/next` recommended + `core-web-vitals` rules
- `@typescript-eslint/no-explicit-any`: **error**
- `@typescript-eslint/no-unused-vars`: **warn** (with `_`-prefix ignore)
- `@typescript-eslint/consistent-type-imports`: **warn**
- `no-console`: **warn** (allow `error`, `warn`)
- All four softened to **off** for `tests/**/*.ts`

### Why warn instead of error on the type-imports + unused-vars rules

Five pre-existing files in the trunk would have failed `error`-level rules: shadcn `actionTypes` `typeof`-only use in `use-toast.ts`, a `Vibe` import in `set_vibe.ts`, etc. These are real code-quality nudges but not bugs. Per packet spec ("CI must not need real env secrets … must NOT need overrides that hide real issues"), `no-explicit-any` stays at `error`; the lower-stakes rules are `warn` so they surface in CI output without blocking the trunk. A follow-up packet can dial them up to `error` after a one-shot fixup pass.

## What got `.skip()`'d and why

- `tests/e2e/auth.spec.ts` — the full Clerk sign-up + verify + sign-in flow is gated on `process.env.CLERK_TEST_MODE`. Reason: requires a Clerk test instance with test-mode keys (`pk_test_*` + a test-mode webhook). Worker container has neither, and accepting the prebuilt Clerk widget's email/password fields from a fresh Playwright session would need either real OTP delivery (no email server in CI) or Clerk's test-mode `424242` OTP path (which itself requires the test-mode keys to be configured). The spec is ready — just flip the env var once a Clerk test instance is provisioned.
- No vitest `.skip()` calls. The `incrementAnonymousTurn` redis-only function from session.ts is intentionally not covered here because the version on this branch (`5376e52`) doesn't expose it; only the dual-source `anonymousTurnCount` + cap-checking pair are present on this branch. Per packet spec, fold in the redis pathway when packet 31 (rate-limit + idempotency) merges, since that's the packet adding Redis-keyed counters.

## Notes for orchestrator at merge

1. **`next lint` → `eslint .`** in scripts. Next 16 removed the `next lint` subcommand. Anyone running `npm run lint` locally needs to know this changed.
2. **Eslint warnings on trunk** (5 of them, all pre-existing) — they will appear in every CI run output. Recommend a small follow-up packet that fixes them at the source and dials `no-unused-vars` + `consistent-type-imports` to `error`.
3. **CI env stubs** — workflow seeds `APP_URL`, supabase publishable/service-role placeholders, `GUEST_CLAIM_TOKEN_SECRET` (32 chars) so `next build` and `lib/env.ts` zod parsing succeed without real secrets. No real secrets are required.
4. **No deps added.** All required devDeps (`vitest`, `@vitest/coverage-v8`, `@playwright/test`, `eslint`, `typescript-eslint`, `@next/eslint-plugin-next`) were already present from the batch-4 prep commit.
5. **Coverage** — run via `npm run test:coverage`; reports land in `atelier/coverage/` (gitignored). Not wired into CI; add when there's a coverage floor we want to enforce.
6. **Playwright browsers** — `npx playwright install` not run; `test:e2e` is intended for ad-hoc local + a future job in `ci.yml`. Holding off on wiring an `e2e` job until packet 28's auth UI is integrated and the sign-up spec can pass; otherwise E2E becomes a flaky gate.
7. **Tool registry test** uses heavy `vi.mock` blocks for `@/db/client`, `@/lib/anthropic/client`, `@/lib/supabase/service`, `@/lib/affiliate/wrap`, `@/lib/analytics/facade`, `@/lib/vibe/evolve` so importing `./bootstrap` doesn't hit any I/O. If a future tool grows new sibling-module dependencies, that mock set will need an update — the failing test will surface it.
