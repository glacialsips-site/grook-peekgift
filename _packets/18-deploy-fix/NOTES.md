# Packet 18 — Deploy fix NOTES

## Final state

`https://peek-gift-vnext.netlify.app/` serves the atelier app end-to-end:

| Route | Status | Notes |
|---|---|---|
| `/` | 200 | Atelier landing renders ("peek.gift", "Make gift giving real again") |
| `/sign-up` | 200 | Clerk SignUp component renders |
| `/sign-in` | 200 | Clerk SignIn component renders |
| `/g/[slug]` | 404 for unknown slug | `notFound()` per spec; published peeks would render — schema queries succeed |
| `/api/chat` POST unauth | 404 (via Clerk `auth.protect` rewrite) | Browsers follow redirect to `/sign-in`; expected behavior |
| `/api/webhooks/clerk` | 500 "webhook not configured" | `CLERK_WEBHOOK_SIGNING_SECRET` not set yet — Clerk Dashboard webhook needs to be created and its signing secret pasted into Netlify. User task. |

## Root causes of original "exit code 2" failures (could NOT retrieve build log content via Netlify API — `/api/v1/deploys/:id/log` returns 404, `/api/v1/builds/:id/log` returns 404; Netlify only exposes log contents through Dashboard session-cookie auth, not Bearer tokens, even with a PAT). Diagnosed instead by direct local reproduction + smoke test of the deployed function via `netlify logs --source functions`:

1. **No `<ClerkProvider>` in `app/layout.tsx`.** Packet 06 explicitly deferred this to an "integration packet" that never landed. Without it, any Clerk hook (`useSession`, `<SignIn />`, `<SignUp />`) throws server-side: `Error: useSession can only be used within the <ClerkProvider /> component`. Fixed by wrapping `RootLayout`'s tree in `<ClerkProvider>` (commit `ca56b4a`).
2. **`peek_v2` schema not exposed in PostgREST `db-schemas` GUC.** Default Supabase config exposes `public, storage, graphql_public`. Recipient view (`/g/[slug]`) queried `peek_v2.peeks` and got `PGRST106` (with `Accept-Profile: peek_v2`) or `PGRST205` (without). Fixed via SQL:
   ```sql
   ALTER ROLE authenticator SET pgrst.db_schemas = 'public, storage, graphql_public, peek_v2';
   NOTIFY pgrst, 'reload config';
   ```
3. **No role grants on `peek_v2` schema.** Even after exposing the schema, `anon`, `authenticated`, and `service_role` had no `USAGE` on the schema or privileges on its tables. Fixed via SQL:
   ```sql
   GRANT USAGE ON SCHEMA peek_v2 TO anon, authenticated, service_role;
   GRANT ALL ON ALL TABLES IN SCHEMA peek_v2 TO service_role;
   GRANT ALL ON ALL SEQUENCES IN SCHEMA peek_v2 TO service_role;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA peek_v2 TO anon, authenticated;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA peek_v2 TO anon, authenticated;
   ALTER DEFAULT PRIVILEGES IN SCHEMA peek_v2 GRANT ALL ON TABLES TO service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA peek_v2 GRANT ALL ON SEQUENCES TO service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA peek_v2 GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
   NOTIFY pgrst, 'reload schema';
   ```
   Going forward, the migration files in `db/migrations/` should include these grants OR the schema setup script should be wrapped in a Supabase migration that handles them. Worth folding into a follow-up "schema-grants" packet so the grant set is reproducible (e.g., for branch deploys + the Supabase git integration the user just set up).

## What was set / changed on Netlify (site `peek-gift-vnext`, id `932646db-e8be-42f1-a94b-a57bb733e308`)

### Env vars copied/upserted via `netlify env:clone` + direct API PUT/POST

| Key | Source | Action |
|---|---|---|
| `ANTHROPIC_API_KEY` | legacy `peek-gift` (cloned, server-side; masked at rest) | cloned |
| `BROWSERBASE_API_KEY` | legacy (cloned) | cloned |
| `CLERK_SECRET_KEY` | legacy (cloned) | cloned |
| `RESEND_API_KEY` | legacy (cloned) | cloned |
| `SUPABASE_SERVICE_ROLE_KEY` | **fresh `sb_secret_*` from Supabase Dashboard (modern format, not legacy JWT)** | set via API with explicit contexts (`production`, `deploy-preview`, `branch-deploy`, `dev`) — Netlify rejects `context: all` for `is_secret: true` |
| `STRIPE_SECRET_KEY`, `DATABASE_URL`, `STRIPE_WEBHOOK_SECRET` | legacy site (these are `is_secret: false` on the source — values visible via API) | replicated |
| `GOOGLE_PLACES_API_KEY`, `ZENROWS_API_KEY`, `GUEST_CLAIM_TOKEN_SECRET` | legacy (cloned) | cloned |
| `APP_URL` | corrected to `https://peek-gift-vnext.netlify.app` (clone copied legacy's `https://peek.gift`) | overwritten |
| `SUPABASE_STORAGE_BUCKET` | set to `peek-v2-assets` (clone copied legacy's `gift-assets`) | overwritten |
| `NODE_VERSION` | `22` | added |
| `NPM_FLAGS` | (legacy had `--legacy-peer-deps`) | **deleted** (atelier deps install clean without it; violates build principle) |

`NEXT_PUBLIC_*` vars were already correct from the orchestrator's earlier setup.

### Env vars still NOT set (will need to be created out-of-band)

- **`CLERK_WEBHOOK_SIGNING_SECRET`** — requires creating a webhook endpoint in Clerk Dashboard → Webhooks pointing at `https://peek-gift-vnext.netlify.app/api/webhooks/clerk` listening on `user.created`, `user.updated`, `user.deleted`, then pasting the signing secret here. Currently `/api/webhooks/clerk` returns `500 "webhook not configured"` (correctly fail-closed). Out of scope for this packet.
- **`STRIPE_WEBHOOK_SECRET`** was cloned but corresponds to the legacy webhook endpoint. A new endpoint at `https://peek-gift-vnext.netlify.app/api/stripe/webhook` needs to be created in Stripe Dashboard → Webhooks (listening on `checkout.session.completed`), and its signing secret pasted in. Low priority while `PAY_MODE=mock`.

## What was set / changed on Supabase (project `ewqpujqerdnrkjqlpobo`)

- `pgrst.db_schemas` GUC on `authenticator` role: appended `peek_v2`. PostgREST reload notified.
- Schema/table grants on `peek_v2` for `anon`, `authenticated`, `service_role` (see SQL above).
- A fresh `sb_secret_*` API key was created in the Supabase Dashboard by the user and is now in Netlify env. The legacy JWT `service_role` key on the dashboard can be disabled when the user is ready (button at the bottom of the API Keys page) — nothing in atelier reads the legacy key anymore.

## What was set / changed in code (committed `ca56b4a` on `claude/packet-18-deploy-fix`)

- `atelier/app/layout.tsx` — wrapped tree in `<ClerkProvider>`. This was a missing integration step that packet 06 explicitly deferred; without it, all Clerk components throw at SSR.
- `atelier/.gitignore` — added `deno.lock` (Netlify CLI generates it at project root during edge-function bundling).

Per packet 18 spec, code changes were authorized once the bug was confirmed via function logs (`Error: useSession can only be used within the <ClerkProvider /> component`). No other code touched.

## Deploy method

Pure CLI deploys via Netlify CLI 26.0.2:
```
cd atelier
npm install
APP_URL=http://localhost:3000 npm run build
NETLIFY_AUTH_TOKEN=… NETLIFY_SITE_ID=… netlify deploy --prod --dir=.next --functions=.netlify/functions-internal
```

The `--functions=.netlify/functions-internal` flag is **required** — without it, the CLI uploads only `.next` assets and skips the `___netlify-server-handler` function, leaving the site serving Netlify's default 404 for every dynamic route (initial attempt symptomized this exact failure; `available_functions: []` in the deploy record).

`netlify deploy --build` ran the build server-side but exhibited the same skip-functions bug in CLI 26.0.2. Reliable path is to build locally then `netlify deploy --prod --dir=.next --functions=.netlify/functions-internal`.

## Git integration (note for orchestrator)

User configured a **Supabase git integration** during this packet. That covers schema/migration syncing for Supabase but does NOT replace the Netlify git auto-deploy setup — peek-gift-vnext is still **not linked to the GitHub repo** for auto-deploys (`build_settings: {}` on the site record; Netlify MCP doesn't expose `repo_url` writes; would need to be set in Netlify Dashboard → Continuous Deployment OR via Management API with PATCH `/api/v1/sites/{site_id}` including `repo_url`/`repo_branch`/`base`). For now, every deploy is a manual `netlify deploy --prod` from `atelier/`. Recommend a follow-up packet to wire git auto-deploy so pushes to `atelier-integration` redeploy automatically.

## Recommended follow-ups (in priority order)

1. **Schema-grants migration packet** — fold the `peek_v2` grants + `pgrst.db_schemas` config into a Drizzle migration so Supabase branch deploys + future fresh DB setups don't have to repeat this by hand.
2. **Netlify git auto-deploy wiring packet** — link the site to `glacialsips-site/grook-peekgift` on branch `atelier-integration` so pushes auto-deploy. Removes the manual `netlify deploy` step.
3. **Clerk webhook setup packet (Dashboard task)** — create the webhook endpoint in Clerk, paste signing secret as `CLERK_WEBHOOK_SIGNING_SECRET` on Netlify, verify `user.created` syncs to `peek_v2.users`.
4. **Stripe webhook setup packet (Dashboard task)** — create the production webhook for `checkout.session.completed`, paste signing secret. Low priority while `PAY_MODE=mock`.
5. **Disable legacy Supabase API keys** — after all consumers are on `sb_secret_*` / `sb_publishable_*` (atelier already is), click the "Disable JWT-based API keys" button on the Supabase Dashboard API Keys page.
