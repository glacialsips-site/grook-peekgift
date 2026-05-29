import { createClient } from '@supabase/supabase-js';

/**
 * Module-level singleton Supabase client for edge (Deno/edge-runtime) code.
 *
 * WHY a singleton is safe here: this is the SERVICE-ROLE client. It is fully
 * stateless — `persistSession: false` (no cookies / refresh state) and it
 * carries NO per-user or per-request auth (the same service-role key is used
 * for every request). Reusing one instance across requests inside an edge
 * isolate is therefore safe and avoids paying the re-instantiation cost on
 * every invocation. There is no per-request state to leak between callers.
 *
 * `@supabase/supabase-js` is fetch-based (no node TCP / `node:` builtins), so
 * it runs unchanged on the edge runtime — it is already used by the working
 * spine chat edge route.
 */

/**
 * Build the service-role client, scoped to the `peek_v2` schema.
 *
 * The return type is left to inference on purpose: `createClient(..., { db: {
 * schema: 'peek_v2' } })` yields a client whose schema generic is the literal
 * `'peek_v2'`. That type is invariant and is NOT assignable to a bare
 * `SupabaseClient` (whose schema defaults to `'public'`), so annotating this
 * as `SupabaseClient` would be a type error. We instead derive the cache type
 * from the factory (`ReturnType<typeof makeClient>`) — the same reason the
 * spine route types its client as `ReturnType<typeof sb>`.
 */
function makeClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'peek_v2' },
  });
}

/**
 * The schema-typed client this module hands out. Derived from the factory so
 * it carries the `peek_v2` schema generic; structurally it is the library's
 * `SupabaseClient` with that schema bound.
 */
export type EdgeSupabaseClient = ReturnType<typeof makeClient>;

let cached: EdgeSupabaseClient | null = null;

export function getSupabaseEdge(): EdgeSupabaseClient {
  if (cached) return cached;
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) throw new Error('supabase_env_missing');
  cached = makeClient(url, key);
  return cached;
}

/** Clear the cached client. For test isolation only. */
export function resetSupabaseEdge(): void {
  cached = null;
}
