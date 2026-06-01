'use client';

import { useState } from 'react';
import {
  TIER_NAMES,
  type TierLimits,
  type TierName,
} from '@/lib/usage/tiers';

interface Props {
  initial: TierLimits;
}

export function TierLimitsEditor({ initial }: Props) {
  const [state, setState] = useState<TierLimits>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function update(tier: TierName, key: 'period_hours' | 'hard_cents' | 'soft_cents', value: string) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return;
    setState((prev) => ({ ...prev, [tier]: { ...prev[tier], [key]: n } }));
  }

  async function submit() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/tier-config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (!res.ok) {
        const text = await res.text();
        setMsg(`Save failed: ${text}`);
      } else {
        setMsg('Saved.');
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 uppercase">
          <tr>
            <th className="px-3 py-2 text-left">Tier</th>
            <th className="px-3 py-2 text-right">Period (h)</th>
            <th className="px-3 py-2 text-right">Soft (¢)</th>
            <th className="px-3 py-2 text-right">Hard (¢)</th>
          </tr>
        </thead>
        <tbody>
          {TIER_NAMES.map((tier) => (
            <tr key={tier} className="border-t">
              <td className="px-3 py-2 font-mono">{tier}</td>
              <td className="px-3 py-2 text-right">
                <input
                  type="number"
                  min={1}
                  className="w-20 rounded border bg-background px-2 py-1 text-right"
                  value={state[tier].period_hours}
                  onChange={(e) => update(tier, 'period_hours', e.target.value)}
                />
              </td>
              <td className="px-3 py-2 text-right">
                <input
                  type="number"
                  min={0}
                  className="w-28 rounded border bg-background px-2 py-1 text-right"
                  value={state[tier].soft_cents}
                  onChange={(e) => update(tier, 'soft_cents', e.target.value)}
                />
              </td>
              <td className="px-3 py-2 text-right">
                <input
                  type="number"
                  min={0}
                  className="w-28 rounded border bg-background px-2 py-1 text-right"
                  value={state[tier].hard_cents}
                  onChange={(e) => update(tier, 'hard_cents', e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-end gap-3 border-t bg-muted/20 px-3 py-2">
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="rounded-md bg-foreground px-4 py-1.5 text-xs font-medium text-background disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
