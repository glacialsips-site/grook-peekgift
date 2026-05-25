import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// v0 doesn't generate DB types. We type as `any` so .from() / .eq() / .update() etc.
// don't fight us. Row shapes live in lib/types.ts and are asserted at use sites.
let _admin: any = null;

// Server-only. Uses service-role key. Scoped to the peek_v2 schema.
export function supabaseAdmin(): any {
  if (_admin) return _admin;
  _admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'peek_v2' as any }
  });
  return _admin;
}

// Browser-safe client (publishable key, peek_v2 schema). Reads only — v0 writes through API routes.
export function supabaseBrowser(): any {
  return createClient(url, publishableKey, {
    auth: { persistSession: false },
    db: { schema: 'peek_v2' as any }
  });
}

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'peek-v2-assets';
