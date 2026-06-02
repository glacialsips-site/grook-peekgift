// The persistence adapter: PeekIR document snapshots in Supabase (peek_v2.peek_documents).
// Server-only, service-role (bypasses RLS; the table is default-deny). Key-gated: with no
// Supabase env it is a no-op so the rest of the app still runs. The recipient page loads
// through here; the curator route saves through here; the webhook publishes through here.

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

async function loadByColumn(column: "slug" | "id", value: string): Promise<PeekIR | null> {
  const c = client();
  if (!c) return null;
  const { data, error } = await c.schema(SCHEMA).from(TABLE).select("doc").eq(column, value).maybeSingle();
  if (error || !data) return null;
  const v = validatePeekIR((data as { doc: unknown }).doc);
  return v.ok ? v.value : null;
}

export function loadPeekBySlug(slug: string): Promise<PeekIR | null> {
  return loadByColumn("slug", slug);
}

export function loadPeekById(id: string): Promise<PeekIR | null> {
  return loadByColumn("id", id);
}

/** Publish a paid peek. Idempotent: an already-published/claimed peek is left as-is. */
export async function markPeekPublished(
  id: string,
  info: { sessionId?: string; paymentIntentId?: string },
): Promise<{ ok: boolean; error?: string }> {
  const doc = await loadPeekById(id);
  if (!doc) return { ok: false, error: "peek not found" };
  if (doc.peek.status === "published" || doc.peek.status === "claimed") return { ok: true };

  const published: PeekIR = {
    ...doc,
    peek: {
      ...doc.peek,
      status: "published",
      published_at: new Date().toISOString(),
      share_url: `/g/${doc.peek.slug}`,
      stripe_checkout_session_id: info.sessionId ?? doc.peek.stripe_checkout_session_id,
      stripe_payment_intent_id: info.paymentIntentId ?? doc.peek.stripe_payment_intent_id,
    },
  };
  return savePeekDocument(published);
}
