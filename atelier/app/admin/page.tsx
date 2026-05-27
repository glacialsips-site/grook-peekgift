import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getUserId } from '@/lib/auth/server';
import { getUserTier } from '@/lib/usage/tier';
import { getTierConfig, TIER_NAMES, type TierName } from '@/lib/usage/tier-config';
import { getSupabaseService } from '@/lib/supabase/service';
import { TierLimitsEditor } from './tier-limits-editor';
import { UserTierEditor } from './user-tier-editor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface VendorRow {
  vendor: string;
  cost_cents: number;
}

interface UserSpendRow {
  user_id: string | null;
  email: string | null;
  tier: TierName;
  cost_cents: number;
  chat_turns: number;
  scrapes: number;
  image_gens: number;
  soft_cents: number;
  hard_cents: number;
}

interface VendorBreakdown {
  vendor: string;
  cost_cents: number;
  calls: number;
}

interface PeekSpendRow {
  peek_id: string;
  slug: string | null;
  recipient_name: string | null;
  status: string | null;
  cost_cents: number;
  calls: number;
}

interface AdminSnapshot {
  totalCents: number;
  byVendor: VendorBreakdown[];
  byTier: Array<{ tier: string; cost_cents: number; users: number }>;
  topUsers: UserSpendRow[];
  topPeeks: PeekSpendRow[];
}

async function loadSnapshot(): Promise<AdminSnapshot> {
  const sb = getSupabaseService();
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: ledgerRows } = await sb
    .from('usage_ledger')
    .select('user_id, peek_id, vendor, kind, cost_cents')
    .gte('ts', sinceIso);

  const rows = ledgerRows ?? [];

  let totalCents = 0;
  const vendorMap = new Map<string, { cost: number; calls: number }>();
  const userMap = new Map<
    string,
    { cost: number; chat_turns: number; scrapes: number; image_gens: number }
  >();
  const peekMap = new Map<string, { cost: number; calls: number }>();
  const anonAgg = { cost: 0, chat_turns: 0, scrapes: 0, image_gens: 0 };

  for (const r of rows) {
    const cost = typeof r.cost_cents === 'number' ? r.cost_cents : 0;
    totalCents += cost;
    const v = vendorMap.get(r.vendor) ?? { cost: 0, calls: 0 };
    v.cost += cost;
    v.calls += 1;
    vendorMap.set(r.vendor, v);
    const target = r.user_id
      ? (userMap.get(r.user_id) ?? {
          cost: 0,
          chat_turns: 0,
          scrapes: 0,
          image_gens: 0,
        })
      : anonAgg;
    target.cost += cost;
    if (r.vendor === 'anthropic') target.chat_turns += 1;
    if (
      r.vendor === 'browserbase' ||
      r.vendor === 'zenrows' ||
      r.vendor === 'jina'
    ) {
      target.scrapes += 1;
    }
    if (r.vendor === 'fal') target.image_gens += 1;
    if (r.user_id) userMap.set(r.user_id, target);
    if (r.peek_id) {
      const p = peekMap.get(r.peek_id) ?? { cost: 0, calls: 0 };
      p.cost += cost;
      p.calls += 1;
      peekMap.set(r.peek_id, p);
    }
  }

  const userIds = Array.from(userMap.keys());
  const userInfo = new Map<string, { tier: TierName; email: string | null }>();
  if (userIds.length > 0) {
    const { data: usersData } = await sb
      .from('users')
      .select('clerk_user_id, email, tier')
      .in('clerk_user_id', userIds);
    for (const u of usersData ?? []) {
      const tier = (TIER_NAMES as readonly string[]).includes(u.tier as string)
        ? (u.tier as TierName)
        : 'authenticated';
      userInfo.set(u.clerk_user_id, { tier, email: u.email });
    }
  }

  const config = await getTierConfig();

  const topUsers: UserSpendRow[] = userIds
    .map((id) => {
      const agg = userMap.get(id);
      const info = userInfo.get(id);
      const tier = info?.tier ?? 'authenticated';
      const limit = config[tier];
      return {
        user_id: id,
        email: info?.email ?? null,
        tier,
        cost_cents: agg?.cost ?? 0,
        chat_turns: agg?.chat_turns ?? 0,
        scrapes: agg?.scrapes ?? 0,
        image_gens: agg?.image_gens ?? 0,
        soft_cents: limit?.soft_cents ?? 0,
        hard_cents: limit?.hard_cents ?? 0,
      };
    })
    .sort((a, b) => b.cost_cents - a.cost_cents)
    .slice(0, 50);

  if (anonAgg.cost > 0) {
    const limit = config['guest'];
    topUsers.unshift({
      user_id: null,
      email: '(anonymous/guests aggregate)',
      tier: 'guest',
      cost_cents: anonAgg.cost,
      chat_turns: anonAgg.chat_turns,
      scrapes: anonAgg.scrapes,
      image_gens: anonAgg.image_gens,
      soft_cents: limit?.soft_cents ?? 0,
      hard_cents: limit?.hard_cents ?? 0,
    });
  }

  const tierBuckets = new Map<string, { cost: number; users: Set<string> }>();
  for (const row of topUsers) {
    const b = tierBuckets.get(row.tier) ?? { cost: 0, users: new Set<string>() };
    b.cost += row.cost_cents;
    if (row.user_id) b.users.add(row.user_id);
    tierBuckets.set(row.tier, b);
  }
  const byTier = Array.from(tierBuckets.entries())
    .map(([tier, b]) => ({ tier, cost_cents: b.cost, users: b.users.size }))
    .sort((a, b) => b.cost_cents - a.cost_cents);

  const byVendor: VendorBreakdown[] = Array.from(vendorMap.entries())
    .map(([vendor, v]) => ({ vendor, cost_cents: v.cost, calls: v.calls }))
    .sort((a, b) => b.cost_cents - a.cost_cents);

  const peekIds = Array.from(peekMap.keys());
  const peekInfo = new Map<
    string,
    { slug: string | null; recipient_name: string | null; status: string | null }
  >();
  if (peekIds.length > 0) {
    const { data: peeksData } = await sb
      .from('peeks')
      .select('id, slug, recipient_name, status')
      .in('id', peekIds);
    for (const p of peeksData ?? []) {
      peekInfo.set(p.id, {
        slug: p.slug,
        recipient_name: p.recipient_name,
        status: p.status,
      });
    }
  }
  const topPeeks: PeekSpendRow[] = peekIds
    .map((id) => {
      const agg = peekMap.get(id);
      const info = peekInfo.get(id);
      return {
        peek_id: id,
        slug: info?.slug ?? null,
        recipient_name: info?.recipient_name ?? null,
        status: info?.status ?? null,
        cost_cents: agg?.cost ?? 0,
        calls: agg?.calls ?? 0,
      };
    })
    .sort((a, b) => b.cost_cents - a.cost_cents)
    .slice(0, 25);

  return { totalCents, byVendor, byTier, topUsers, topPeeks };
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function AdminPage() {
  const userId = await getUserId();
  const tier = await getUserTier(userId);
  if (tier !== 'admin') notFound();

  const [snapshot, config] = await Promise.all([loadSnapshot(), getTierConfig()]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-sm">
      <h1 className="text-3xl font-semibold tracking-tight">Admin · usage</h1>
      <p className="mt-1 text-muted-foreground">Last 24h, all vendors.</p>

      <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">Total spend (24h)</div>
          <div className="mt-2 text-3xl font-semibold">
            {dollars(snapshot.totalCents)}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">Vendors</div>
          <ul className="mt-2 space-y-1">
            {snapshot.byVendor.map((v) => (
              <li key={v.vendor} className="flex justify-between">
                <span>{v.vendor}</span>
                <span>
                  {dollars(v.cost_cents)}{' '}
                  <span className="text-muted-foreground">({v.calls})</span>
                </span>
              </li>
            ))}
            {snapshot.byVendor.length === 0 && (
              <li className="text-muted-foreground">No usage yet.</li>
            )}
          </ul>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">Tiers</div>
          <ul className="mt-2 space-y-1">
            {snapshot.byTier.map((t) => (
              <li key={t.tier} className="flex justify-between">
                <span>{t.tier}</span>
                <span>
                  {dollars(t.cost_cents)}{' '}
                  <span className="text-muted-foreground">({t.users}u)</span>
                </span>
              </li>
            ))}
            {snapshot.byTier.length === 0 && (
              <li className="text-muted-foreground">No usage yet.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Top users by spend (24h)</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 uppercase">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2 text-right">Spend</th>
                <th className="px-3 py-2 text-right">Limit</th>
                <th className="px-3 py-2 text-right">Chat</th>
                <th className="px-3 py-2 text-right">Scrape</th>
                <th className="px-3 py-2 text-right">Image</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.topUsers.map((u) => {
                const overSoft = u.cost_cents >= u.soft_cents && u.soft_cents > 0;
                const overHard = u.cost_cents >= u.hard_cents && u.hard_cents > 0;
                return (
                  <tr key={u.user_id ?? 'anon-bucket'} className="border-t">
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {u.email ?? u.user_id ?? 'anon'}
                      {u.user_id && (
                        <div className="text-muted-foreground">{u.user_id}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">{u.tier}</td>
                    <td className="px-3 py-2 text-right">{dollars(u.cost_cents)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {dollars(u.hard_cents)}
                    </td>
                    <td className="px-3 py-2 text-right">{u.chat_turns}</td>
                    <td className="px-3 py-2 text-right">{u.scrapes}</td>
                    <td className="px-3 py-2 text-right">{u.image_gens}</td>
                    <td className="px-3 py-2">
                      {overHard ? (
                        <span className="rounded bg-red-600 px-2 py-0.5 text-white">
                          BLOCKED
                        </span>
                      ) : overSoft ? (
                        <span className="rounded bg-yellow-500 px-2 py-0.5 text-black">
                          WARN
                        </span>
                      ) : (
                        <span className="text-muted-foreground">ok</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {snapshot.topUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No usage in the last 24h.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Top peeks by spend (24h)</h2>
        <p className="mt-1 text-muted-foreground">
          Click a peek to see vendor · kind breakdown for that curator session.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 uppercase">
              <tr>
                <th className="px-3 py-2">Peek</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Calls</th>
                <th className="px-3 py-2 text-right">Spend</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.topPeeks.map((p) => (
                <tr key={p.peek_id} className="border-t">
                  <td className="px-3 py-2 font-mono text-[11px]">
                    <Link
                      href={`/admin/peek/${p.peek_id}`}
                      className="underline"
                    >
                      {p.recipient_name ?? p.peek_id.slice(0, 8)}
                    </Link>
                    <div className="text-muted-foreground">{p.peek_id}</div>
                  </td>
                  <td className="px-3 py-2 font-mono">{p.slug ?? '—'}</td>
                  <td className="px-3 py-2">{p.status ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{p.calls}</td>
                  <td className="px-3 py-2 text-right">
                    {dollars(p.cost_cents)}
                  </td>
                </tr>
              ))}
              {snapshot.topPeeks.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No peek-attributed usage in the last 24h. (Rows from before
                    the peek_id column was added show up under Top users only.)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <form
          action={async (formData: FormData) => {
            'use server';
            const raw = String(formData.get('peek_id') ?? '').trim();
            if (!raw) return;
            const { redirect } = await import('next/navigation');
            redirect(`/admin/peek/${encodeURIComponent(raw)}`);
          }}
          className="mt-4 flex items-center gap-2"
        >
          <label className="text-xs uppercase text-muted-foreground">
            Jump to peek_id:
          </label>
          <input
            name="peek_id"
            type="text"
            placeholder="00000000-0000-0000-0000-000000000000"
            className="flex-1 rounded border px-2 py-1 font-mono text-xs"
          />
          <button
            type="submit"
            className="rounded bg-foreground px-3 py-1 text-xs text-background"
          >
            Apply
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Tier limits</h2>
        <p className="mt-1 text-muted-foreground">
          Hard limit blocks the next vendor call. Soft limit (default 80% of hard)
          triggers an in-chat nudge.
        </p>
        <TierLimitsEditor initial={config} />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Override a user's tier</h2>
        <UserTierEditor />
      </section>
    </main>
  );
}
