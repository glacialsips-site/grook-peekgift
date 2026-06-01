'use client';

// ============================================================================
// render-check — client island. Mounts the validated sample IR through the
// PeekRenderer inside an iOS-ish device frame (the renderer's canonical surface).
// ============================================================================

import { useMemo, useRef, useState } from 'react';
import type { PeekIR } from '@/lib/ir/contract';
import { PeekRenderer } from '@/lib/peek-render';
import type { PeekRendererController, RecipientInteractions } from '@/lib/peek-render';

export default function RenderCheckClient({ ir }: { ir: PeekIR }) {
  const ctrl = useRef<PeekRendererController | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const push = (s: string) => setLog((l) => [s, ...l].slice(0, 6));

  const interactions: RecipientInteractions = useMemo(
    () => ({
      onPick: (id) => push(`pick ${id}`),
      onBeg: (id, msg) => push(`beg ${id}: ${msg}`),
      onUnlock: (id) => push(`unlock ${id}`),
      onCheckout: () => push('checkout'),
    }),
    [],
  );

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0f0f10',
        color: '#f4f4f4',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 28,
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '28px 18px 60px',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      {/* device frame — the renderer fills this absolutely-positioned backdrop */}
      <div
        style={{
          position: 'relative',
          width: 'min(430px, 92vw)',
          height: 'min(900px, 86dvh)',
          borderRadius: 44,
          background: '#000',
          padding: 12,
          boxShadow: '0 40px 120px rgba(0,0,0,.6), 0 0 0 2px rgba(255,255,255,.06)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 12,
            borderRadius: 32,
            overflow: 'hidden',
            background: '#fff',
          }}
        >
          <PeekRenderer
            ir={ir}
            surface="recipient"
            interactions={interactions}
            controllerRef={ctrl}
          />
        </div>
      </div>

      {/* dev controls */}
      <div style={{ width: 260, fontSize: 13, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: 0.6 }}>
          render-check
        </div>
        <p style={{ opacity: 0.8 }}>
          Sample <code>dad-60th.ir.json</code> validated against the Zod schema, painted through{' '}
          <code>PeekRenderer</code>. Target: <code>mockups/For the Old Man.html</code>.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
          <button onClick={() => ctrl.current?.markPlaced('s_ticket')} style={btn}>
            markPlaced(ticket)
          </button>
          <button onClick={() => ctrl.current?.markPlaced('c1')} style={btn}>
            markPlaced(card c1)
          </button>
        </div>
        <div style={{ opacity: 0.7, fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
          {log.map((l, i) => (
            <div key={i}>· {l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  background: 'rgba(255,255,255,.08)',
  color: '#f4f4f4',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 8,
  padding: '7px 10px',
  fontSize: 12,
  cursor: 'pointer',
};
