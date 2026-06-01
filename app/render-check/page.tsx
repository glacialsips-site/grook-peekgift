// ============================================================================
// /render-check — conformance route.
// Loads a sample IR (?sample=dad|gala|taquito, default dad), validates it through the
// Zod schema (validatePeekIR — which normalizes the legacy `radius:6` / missing `space`),
// and renders it through PeekRenderer to visually match the hand mockups.
// The renderer is pure (no ANTHROPIC key needed).
// ============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validatePeekIR } from '@/lib/ir/schema';
import RenderCheckClient from './RenderCheckClient';

export const dynamic = 'force-dynamic';

const SAMPLES: Record<string, { file: string; target: string }> = {
  dad: { file: 'dad-60th.ir.json', target: 'mockups/For the Old Man.html' },
  gala: { file: 'charity-gala.ir.json', target: 'reference/original-mockups/Charity Gala.html' },
  taquito: { file: 'el-taquito.ir.json', target: 'mockups/El Taquito.html' },
};

function loadSampleIR(which: string) {
  const entry = SAMPLES[which] || SAMPLES.dad;
  const p = join(process.cwd(), 'peek-jumpoff', 'samples', entry.file);
  const raw = JSON.parse(readFileSync(p, 'utf8'));
  const res = validatePeekIR(raw);
  return { res, entry };
}

export default async function RenderCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string }>;
}) {
  const sp = await searchParams;
  const which = sp?.sample && SAMPLES[sp.sample] ? sp.sample : 'dad';
  const { res, entry } = loadSampleIR(which);

  if (!res.ok) {
    return (
      <main
        style={{
          minHeight: '100dvh',
          background: '#1a0c0c',
          color: '#ffd7d7',
          padding: 40,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 13,
          whiteSpace: 'pre-wrap',
        }}
      >
        <h1 style={{ fontFamily: 'system-ui' }}>render-check: sample &quot;{which}&quot; failed validation</h1>
        {res.error}
      </main>
    );
  }

  return <RenderCheckClient ir={res.value} sample={which} target={entry.target} />;
}
