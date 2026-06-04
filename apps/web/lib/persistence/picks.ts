import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SCHEMA = "peek_v2";
const TABLE = "peek_picks";

let _client: SupabaseClient | null = null;
function client(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_client) _client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _client;
}

export async function loadPicks(peekId: string): Promise<string[]> {
  const c = client();
  if (!c) return [];
  const { data } = await c.schema(SCHEMA).from(TABLE).select("picks").eq("peek_id", peekId).maybeSingle();
  const picks = (data as { picks?: unknown } | null)?.picks;
  return Array.isArray(picks) ? picks.filter((x): x is string => typeof x === "string") : [];
}

export async function savePicks(peekId: string, picks: string[]): Promise<{ ok: boolean; error?: string }> {
  const c = client();
  if (!c) return { ok: false, error: "persistence not configured" };
  const { error } = await c
    .schema(SCHEMA)
    .from(TABLE)
    .upsert({ peek_id: peekId, picks, updated_at: new Date().toISOString() }, { onConflict: "peek_id" });
  return error ? { ok: false, error: error.message } : { ok: true };
}
