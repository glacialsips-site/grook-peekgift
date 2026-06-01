'use client';

import { useState } from 'react';
import { TIER_NAMES, type TierName } from '@/lib/usage/tiers';

export function UserTierEditor() {
  const [clerkUserId, setClerkUserId] = useState('');
  const [tier, setTier] = useState<TierName>('authenticated');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    if (!clerkUserId.trim()) {
      setMsg('clerk_user_id required');
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/user-tier', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clerk_user_id: clerkUserId.trim(), tier }),
      });
      if (!res.ok) {
        const text = await res.text();
        setMsg(`Failed: ${text}`);
      } else {
        setMsg('Applied.');
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <div>
        <label className="block text-xs uppercase text-muted-foreground">clerk_user_id</label>
        <input
          type="text"
          value={clerkUserId}
          onChange={(e) => setClerkUserId(e.target.value)}
          className="mt-1 w-80 rounded border bg-background px-2 py-1 font-mono text-xs"
          placeholder="user_..."
        />
      </div>
      <div>
        <label className="block text-xs uppercase text-muted-foreground">tier</label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as TierName)}
          className="mt-1 rounded border bg-background px-2 py-1 text-xs"
        >
          {TIER_NAMES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="rounded-md bg-foreground px-4 py-1.5 text-xs font-medium text-background disabled:opacity-50"
      >
        {saving ? 'Applying…' : 'Apply'}
      </button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
