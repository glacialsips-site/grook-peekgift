# Packet 32 — Tests + CI

- **Worker:** cc-on-web
- **Branch:** `claude/packet-32-tests-ci`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** none for the test code itself
- **Validation:** `cd atelier && npm install && npm run test && npm run build` all green. New `.github/workflows/ci.yml` runs typecheck + lint + test + build on every push and PR.
- **Target paths:** `atelier/tests/**` (new), `atelier/vitest.config.ts` (new), `atelier/playwright.config.ts` (new), `atelier/package.json` (add scripts only — no new deps; vitest/playwright already in devDeps), `.github/workflows/ci.yml` (new at REPO ROOT, not atelier — actions run at repo root), root `package.json` ONLY IF needed for action runner (avoid).

## Context

Zero tests. Zero CI gates beyond the deploy hook. Workers have shipped 26 packets without any unit/integration/E2E test ever running. The only validation has been `npm run build` which proves compilation, not correctness.

This packet stands up:
1. Vitest unit tests for pure-logic modules (`lib/affiliate/wrap.ts`, `lib/vibe/classify-cards.ts`, `lib/chat/session.ts` helpers, `lib/scrape/extract.ts` parser, `lib/analytics/facade.ts` event shapes, `lib/security/idempotency.ts` if packet 31 lands).
2. Vitest integration tests for the tool registry (`lib/anthropic/tools/index.ts`) — register, list, dispatch, error paths.
3. Playwright E2E tests for the critical user flows: anon → `/build` → first chat turn streams (mocked Anthropic) → publish (mocked Stripe).
4. GitHub Actions running typecheck + lint + unit tests + build on every push to `atelier-integration` AND every PR. Required to merge.
5. Lint setup if missing — `next lint` is wired but no `.eslintrc`; if Next 16 uses flat config (`eslint.config.mjs`), set it up with sensible defaults (`@next/eslint-plugin-next`, `@typescript-eslint/recommended-type-checked`, no overrides that hide real issues).

## Deliver

### `atelier/vitest.config.ts` (new)

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    pool: 'forks',
    coverage: { provider: 'v8', reporter: ['text', 'html'], reportsDirectory: 'coverage' },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

### `atelier/tests/setup.ts` (new)

Mock `env` to a fixed shape so module loading doesn't blow up:

```ts
process.env.APP_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';
// Stub other optional vars where modules import at top level
```

### `atelier/tests/unit/affiliate.test.ts` (new)

Test `wrapAffiliateLink`: skimlinks present → wraps; skimlinks absent + sovrn present → falls through; both absent → returns `direct`. Test `buildClickCustomId` with peekId only vs peekId+cardId.

### `atelier/tests/unit/classify-cards.test.ts` (new)

Tests for `lib/vibe/classify-cards.ts`: empty array → empty patch; all-taunt → lively motion; all-activity → soft motion; mixed → no change.

### `atelier/tests/unit/extract.test.ts` (new)

Test `lib/scrape/extract.ts` — pass it sample HTML fixtures (commit fixtures in `tests/fixtures/scrape/*.html`); mock Anthropic via `vi.spyOn(anthropic.messages, 'create')` to return a known JSON; assert the parser produces the right `ScrapedProduct`.

### `atelier/tests/unit/session.test.ts` (new)

Test `lib/chat/session.ts` `assertPeekAccess`, `anonymousTurnCount`, `anonymousTurnExceeded`. Mock the Supabase service client (use a small fake that returns canned rows).

### `atelier/tests/integration/tool-registry.test.ts` (new)

Boot the tool registry, list schemas, dispatch `ping` and assert pong shape; dispatch a `set_recipient` against a fake DB and assert the SQL pattern.

### `atelier/playwright.config.ts` (new)

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

### `atelier/tests/e2e/landing.spec.ts` (new)

Visit `/`, assert "peek.gift" heading, "Start a Peek" CTA exists and links to `/build`, "Sign in" link works.

### `atelier/tests/e2e/anon-build.spec.ts` (new)

Visit `/build` as anon. Should redirect to sign-in if anon flow isn't supported, OR start a draft Peek if it is. Test the one that actually works in current code. (Worker checks current behavior to write the right assertion.)

### `atelier/tests/e2e/auth.spec.ts` (new)

Once packet 28 lands and we have our custom auth: visit `/sign-up`, enter a Clerk test-mode email like `verify+clerk_test@example.com`, enter password, complete verification with `424242` (Clerk's test OTP), assert we end up at `/build`. Then sign out, sign in with the same email/password, assert again. Requires Clerk test mode env or a dedicated test instance — surface in NOTES.md if not feasible in CI; mark `.skip()` until configured.

### `atelier/package.json` (modify ONLY scripts)

Add:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage",
"test:e2e": "playwright test"
```

### `.github/workflows/ci.yml` (new, at REPO ROOT)

```yaml
name: CI

on:
  push:
    branches: [atelier-integration, main]
  pull_request:
    branches: [atelier-integration, main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    defaults:
      run:
        working-directory: atelier
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: atelier/package-lock.json
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - run: npm run build
        env:
          APP_URL: https://peek-gift-vnext.netlify.app
          # other env stubs as needed for build to pass
```

### Eslint flat config

`atelier/eslint.config.mjs` (new — Next 16 supports flat config):

```js
import next from '@next/eslint-plugin-next';
import ts from 'typescript-eslint';

export default [
  ...ts.configs.recommendedTypeChecked,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@next/next': next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'db/migrations/**', 'coverage/**'] },
];
```

If `@next/eslint-plugin-next` / `typescript-eslint` need to be added as devDeps and they're NOT already in `package.json` — surface in NOTES.md so orchestrator writes a deps-bump.

## Constraints

- TS strict. No `any` in test code either — `expect.objectContaining<...>()` etc.
- Tests must NOT hit live services. Mock Anthropic, Stripe, Supabase, fal.ai, Browserbase, etc. for unit + integration. E2E can use Clerk test mode.
- CI must NOT need real env secrets for build — set stub values in workflow.
- Use subagents per test slice: one for affiliate/vibe/scrape/session units, one for E2E specs, one for CI/lint config.

## Reply format

Branch `claude/packet-32-tests-ci`, commit `packet 32: tests + CI`, push. NOTES.md with: test counts, lint rules added, what got `.skip()`'d and why, any deps that need orchestrator to add.
