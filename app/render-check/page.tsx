// ============================================================================
// /render-check — conformance route.
// Loads peek-jumpoff/samples/dad-60th.ir.json, validates it through the Zod schema
// (validatePeekIR — which normalizes the legacy `radius:6` / missing `space`), and
// renders it through PeekRenderer to visually match mockups/For the Old Man.html.
// The renderer is pure (no ANTHROPIC key needed).
// ============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validatePeekIR } from '@/lib/ir/schema';
import RenderCheckClient from './RenderCheckClient';

export const dynamic = 'force-dynamic';

function loadSampleIR() {
  const p = join(process.cwd(), 'peek-jumpoff', 'samples', 'dad-60th.ir.json');
  const raw = JSON.parse(readFileSync(p, 'utf8'));
  const res = validatePeekIR(raw);
  return res;
}

export default function RenderCheckPage() {
  const res = loadSampleIR();

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
        <h1 style={{ fontFamily: 'system-ui' }}>render-check: sample IR failed validation</h1>
        {res.error}
      </main>
    );
  }

  return <RenderCheckClient ir={res.value} />;
}
