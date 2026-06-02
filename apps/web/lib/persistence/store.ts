// The persistence adapter: PeekIR document snapshots in Supabase (peek_v2.peek_documents).
// Server-only, service-role (bypasses RLS; the table is default-deny). Key-gated: with no
// Supabase env it is a no-op so the rest of the app still runs. The recipient page loads
// through here; the curator route saves through here.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { validatePeekIR, type PeekIR } from "@peek/core";

const SCHEMA = "peek_v2";
const TABLE = "peek_documents";

let _client: SupabaseClient | null = null;

function client(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_client) {
    _client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return _client;
}

export function persistenceConfigured(): boolean {
  return client() !== null;
}

export async function savePeekDocument(doc: PeekIR): Promise<{ ok: boolean; error?: string }> {
  const c = client();
  if (!c) return { ok: false, error: "persistence not configured" };
  const { error } = await c
    .schema(SCHEMA)
    .from(TABLE)
    .upsert(
      {
        id: doc.peek.id,
        slug: doc.peek.slug,
        curator_id: doc.peek.curator_id,
        status: doc.peek.status,
        doc,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function loadPeekBySlug(slug: string): Promise<PeekIR | null> {
  const c = client();
  if (!c) return null;
  const { data, error } = await c.schema(SCHEMA).from(TABLE).select("doc").eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  const v = validatePeekIR((data as { doc: unknown }).doc);
  return v.ok ? v.value : null;
}
