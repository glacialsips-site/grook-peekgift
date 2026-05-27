import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getUserId } from '@/lib/auth/server';
import { getUserTier } from '@/lib/usage/tier';
import { getSupabaseService } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BreakdownRow {
  vendor: string;
  kind: string;
  calls: number;
  cost_cents: number;
}

interface PeekInfo {
  id: string;
  slug: string;
  status: string;
  recipient_name: string | null;
  occasion: string | null;
  curator_id: string | null;
  curator_email: string | null;
  created_at: string;
  updated_at: string;
}

interface LoadResult {
  peek: PeekInfo | null;
  rows: BreakdownRow[];
  totalCents: number;
  totalCalls: number;
  firstTs: string | null;
  lastTs: string | null;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s,
  );
}

async function loadPeekBreakdown(peekId: string): Promise<LoadResult> {
  const sb = getSupabaseService();

  const { data: peekRow } = await sb
    .from('peeks')
    .select(
      'id, slug, status, recipient_name, occasion, curator_id, created_at, updated_at',
    )
    .eq('id', peekId)
    .maybeSingle();

  let curatorEmail: string | null = null;
  if (peekRow?.curator_id) {
    const { data: userRow } = await sb
      .from('users')
      .select('email')
      .eq('clerk_user_id', peekRow.curator_id)
      .maybeSingle();
    curatorEmail = userRow?.email ?? null;
  }

  const { data: ledgerRows } = await sb
    .from('usage_ledger')
    .select('vendor, kind, cost_cents, ts')
    .eq('peek_id', peekId);

  const rows = ledgerRows ?? [];
  const agg = new Map<string, { calls: number; cost: number }>();
  let totalCents = 0;
  let totalCalls = 0;
  let firstTs: string | null = null;
  let lastTs: string | null = null;

  for (const r of rows) {
    const cost = typeof r.cost_cents === 'number' ? r.cost_cents : 0;
    const key = `${r.vendor}::${r.kind}`;
    const cur = agg.get(key) ?? { calls: 0, cost: 0 };
    cur.calls += 1;
    cur.cost += cost;
    agg.set(key, cur);
    totalCents += cost;
    totalCalls += 1;
    const ts = typeof r.ts === 'string' ? r.ts : null;
    if (ts) {
      if (!firstTs || ts < firstTs) firstTs = ts;
      if (!lastTs || ts > lastTs) lastTs = ts;
    }
  }

  const breakdown: BreakdownRow[] = Array.from(agg.entries())
    .map(([key, v]) => {
      const [vendor, kind] = key.split('::', 2);
      return {
        vendor: vendor ?? 'unknown',
        kind: kind ?? 'unknown',
        calls: v.calls,
        cost_cents: v.cost,
      };
    })
    .sort((a, b) => b.cost_cents - a.cost_cents);

  return {
    peek: peekRow
      ? {
          id: peekRow.id,
          slug: peekRow.slug,
          status: peekRow.status,
          recipient_name: peekRow.recipient_name,
          occasion: peekRow.occasion,
          curator_id: peekRow.curator_id,
          curator_email: curatorEmail,
          created_at: peekRow.created_at,
          updated_at: peekRow.updated_at,
        }
      : null,
    rows: breakdown,
    totalCents,
    totalCalls,
    firstTs,
    lastTs,
  };
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(4)}`;
}

function formatTs(ts: string | null): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  } catch {
    return ts;
  }
}

export default async function AdminPeekPage({
  params,
}: {
  params: Promise<{ peekId: string }>;
}) {
  const { peekId } = await params;
  if (!isUuid(peekId)) notFound();

  const userId = await getUserId();
  const tier = await getUserTier(userId);
  if (tier !== 'admin') notFound();

  const data = await loadPeekBreakdown(peekId);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-sm">
      <div className="mb-2 text-xs text-muted-foreground">
        <Link href="/admin" className="underline">
          ← back to admin
        </Link>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Peek usage</h1>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{peekId}</p>

      {data.peek ? (
        <section className="mt-6 grid grid-cols-1 gap-3 rounded-lg border p-4 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Slug</div>
            <div className="font-mono">{data.peek.slug}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Status</div>
            <div>{data.peek.status}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Recipient
            </div>
            <div>{data.peek.recipient_name ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Occasion
            </div>
            <div>{data.peek.occasion ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Curator
            </div>
            <div className="font-mono text-xs">
              {data.peek.curator_email ?? data.peek.curator_id ?? '—'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Created · Updated
            </div>
            <div className="text-xs">
              {formatTs(data.peek.created_at)}
              <br />
              {formatTs(data.peek.updated_at)}
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-lg border border-yellow-500 p-4 text-yellow-700">
          Peek row not found in DB. Showing ledger rows attributed to this id
          anyway.
        </section>
      )}

      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Total cost
          </div>
          <div className="mt-1 text-3xl font-semibold">
            {dollars(data.totalCents)}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Total calls
          </div>
          <div className="mt-1 text-3xl font-semibold">{data.totalCalls}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">Span</div>
          <div className="mt-1 text-xs">
            {formatTs(data.firstTs)}
            <br />→ {formatTs(data.lastTs)}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Breakdown by vendor · kind</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 uppercase">
              <tr>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2 text-right">Calls</th>
                <th className="px-3 py-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={`${r.vendor}::${r.kind}`} className="border-t">
                  <td className="px-3 py-2 font-mono">{r.vendor}</td>
                  <td className="px-3 py-2 font-mono">{r.kind}</td>
                  <td className="px-3 py-2 text-right">{r.calls}</td>
                  <td className="px-3 py-2 text-right">
                    {dollars(r.cost_cents)}
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No usage rows attributed to this peek. (Rows from before
                    2026-05-27 won't have peek_id.)
                  </td>
                </tr>
              )}
              {data.rows.length > 0 && (
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="px-3 py-2" colSpan={2}>
                    TOTAL
                  </td>
                  <td className="px-3 py-2 text-right">{data.totalCalls}</td>
                  <td className="px-3 py-2 text-right">
                    {dollars(data.totalCents)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
