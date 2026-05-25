# Clerk setup notes

These steps are one-time configuration in the Clerk dashboard at https://dashboard.clerk.com for the **`accounts.peek.gift`** Clerk app. The Clerk app is shared with the legacy peek.gift site — no new project, no new keys.

If `CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY` are already set in the Netlify environment from the legacy site, you do not need to regenerate them.

## 1. JWT template for Supabase

Clerk → JWT templates → New template → Name it **`supabase`**.

- **Signing algorithm:** HS256.
- **Signing key:** paste the Supabase project's **JWT secret** (Supabase dashboard → Project settings → API → JWT secret).
- **Claims:** set the JSON to:

  ```json
  {
    "sub": "{{user.id}}",
    "role": "authenticated"
  }
  ```

This token will be used by the browser to authenticate Supabase requests under RLS as the Clerk user.

## 2. Webhook endpoint

Clerk → Webhooks → New endpoint.

- **Endpoint URL:** `{APP_URL}/api/webhooks/clerk`
  - Production: `https://peek.gift/api/webhooks/clerk` (or wherever `APP_URL` resolves)
  - Preview branches: each Netlify deploy preview URL will need its own endpoint if you want to exercise the flow there
- **Events to subscribe to:**
  - `user.created`
  - `user.updated`
  - `user.deleted`
- After creating the endpoint, copy the **Signing Secret** (starts with `whsec_`) and put it into the Netlify environment variable **`CLERK_WEBHOOK_SIGNING_SECRET`**.

## 3. Sign-in / sign-up URLs

Clerk → Paths (or "Customization → Account portal" depending on dashboard version):

- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in URL: `/` (or whatever the post-auth landing page is)
- After sign-up URL: `/`

These are also reflected in env vars (`NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`) if you want to override them at the app level.

## 4. Local testing

Use `ngrok` (or Clerk's webhook tester) to forward `localhost:3000/api/webhooks/clerk` and confirm a fresh user.created event lands in `peek_v2.users`.
