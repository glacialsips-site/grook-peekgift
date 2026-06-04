// The persistence adapter: PeekDocument snapshots in Supabase (peek_v2.peek_documents).
// Server-only, service-role (bypasses RLS; the table is default-deny). Key-gated: with no
// Supabase env it is a no-op so the rest of the app still runs.
//
// Dual representation: the whole PeekDocument envelope (the structured `spine` PLUS the
// authored `presentation.html`) is stored in the existing `doc` jsonb column — no schema
// change. Legacy rows hold a bare v1 PeekIR; validatePeekDocument() wraps those on read, so
// they load unchanged. Two loader shapes: loadPeek* return the SPINE (PeekIR) for the
// commerce/pick callers that read doc.peek/cards; loadDocument* return the full envelope so
// the recipient route can serve presentation.html + peek-runtime.js.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { validatePeekDocument, type PeekDocument, type PeekIR } from "@peek/core";

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

/** Upsert the dual-rep envelope (spine + presentation), keyed by the spine's peek id. */
export async function savePeekDocument(doc: PeekDocument): Promise<{ ok: boolean; error?: string }> {
  const c = client();
  if (!c) return { ok: false, error: "persistence not configured" };
  const { peek } = doc.spine;
  const { error } = await c
    .schema(SCHEMA)
    .from(TABLE)
    .upsert(
      {
        id: peek.id,
        slug: peek.slug,
        curator_id: peek.curator_id,
        status: peek.status,
        doc,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  return error ? { ok: false, error: error.message } : { ok: true };
}

async function loadDocByColumn(column: "slug" | "id", value: string): Promise<PeekDocument | null> {
  const c = client();
  if (!c) return null;
  const { data, error } = await c.schema(SCHEMA).from(TABLE).select("doc").eq(column, value).maybeSingle();
  if (error || !data) return null;
  const v = validatePeekDocument((data as { doc: unknown }).doc);
  return v.ok ? v.value : null;
}

/** The full dual-rep envelope (for serving the authored HTML / publishing). */
export function loadDocumentBySlug(slug: string): Promise<PeekDocument | null> {
  return loadDocByColumn("slug", slug);
}
export function loadDocumentById(id: string): Promise<PeekDocument | null> {
  return loadDocByColumn("id", id);
}

/** The structured spine only (for callers that read doc.peek / doc.cards). */
export async function loadPeekBySlug(slug: string): Promise<PeekIR | null> {
  return (await loadDocByColumn("slug", slug))?.spine ?? null;
}
export async function loadPeekById(id: string): Promise<PeekIR | null> {
  return (await loadDocByColumn("id", id))?.spine ?? null;
}

/**
 * Publish a paid peek. Idempotent: an already-published/claimed peek is left as-is.
 * Preserves the authored presentation; only the spine's status/publish fields change.
 */
export async function markPeekPublished(
  id: string,
  info: { sessionId?: string; paymentIntentId?: string },
): Promise<{ ok: boolean; error?: string }> {
  const doc = await loadDocumentById(id);
  if (!doc) return { ok: false, error: "peek not found" };
  if (doc.spine.peek.status === "published" || doc.spine.peek.status === "claimed") return { ok: true };

  const published: PeekDocument = {
    ...doc,
    spine: {
      ...doc.spine,
      peek: {
        ...doc.spine.peek,
        status: "published",
        published_at: new Date().toISOString(),
        share_url: `/g/${doc.spine.peek.slug}`,
        stripe_checkout_session_id: info.sessionId ?? doc.spine.peek.stripe_checkout_session_id,
        stripe_payment_intent_id: info.paymentIntentId ?? doc.spine.peek.stripe_payment_intent_id,
      },
    },
  };
  return savePeekDocument(published);
}
