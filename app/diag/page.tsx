// ============================================================================
// THROWAWAY DIAG ROUTE (app/_diag) — aesthetic-gap diagnosis only.
// Mounts an arbitrary sample IR through the real PeekRenderer in a 430px-wide,
// FULL-HEIGHT (un-clamped, no inner scroll) container so a full-page Puppeteer
// screenshot captures the page top-to-bottom. Does NOT touch lib/peek-render.
// Usage: /_diag?sample=dad-60th  (loads peek-jumpoff/samples/<sample>.ir.json)
// ============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validatePeekIR } from '@/lib/ir/schema';
import DiagClient from './DiagClient';

export const dynamic = 'force-dynamic';

export default function DiagPage({
  searchParams,
}: {
  searchParams: { sample?: string; mode?: string };
}) {
  const sample = (searchParams.sample || 'dad-60th').replace(/[^a-z0-9-]/gi, '');
  const mode = searchParams.mode === 'frame' ? 'frame' : 'full';
  const p = join(process.cwd(), 'peek-jumpoff', 'samples', `${sample}.ir.json`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    return (
      <main style={{ padding: 40, fontFamily: 'monospace', color: '#b00' }}>
        could not read sample {sample}: {String(e)}
      </main>
    );
  }
  const res = validatePeekIR(raw);
  if (!res.ok) {
    return (
      <main style={{ padding: 40, fontFamily: 'monospace', color: '#b00', whiteSpace: 'pre-wrap' }}>
        {sample} failed validation:{'\n'}
        {res.error}
      </main>
    );
  }
  return <DiagClient ir={res.value} mode={mode} />;
}
