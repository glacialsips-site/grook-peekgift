'use client';

// ============================================================================
// DIAG client island — mounts PeekRenderer, then un-clamps its internal scroll
// so the document grows to full content height (full-page screenshot friendly).
// The renderer itself is untouched; we only relax positioning on its host nodes
// AFTER mount via the DOM (the renderer creates .peek-scroll inside the host).
// ============================================================================

import { useEffect, useRef } from 'react';
import type { PeekIR } from '@/lib/ir/contract';
import { PeekRenderer } from '@/lib/peek-render';

export default function DiagClient({ ir, mode = 'full' }: { ir: PeekIR; mode?: 'full' | 'frame' }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  // FRAME mode: leave the renderer clamped in a 430x932 device, force the sticky
  // action bar shown + scroll to the bottom so the running-total bar is captured.
  useEffect(() => {
    if (mode !== 'frame') return;
    const show = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const bar = wrap.querySelector('.peek-bar') as HTMLElement | null;
      if (bar) bar.classList.add('peek-show');
      const scroll = wrap.querySelector('.peek-scroll') as HTMLElement | null;
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
    };
    const ids = [150, 500, 1000, 1800].map((d) => setTimeout(show, d));
    return () => ids.forEach(clearTimeout);
  }, [ir, mode]);

  // After the renderer paints, relax the absolute/scroll clamps so the page is
  // one continuous column at full content height (for top-to-bottom capture).
  useEffect(() => {
    if (mode !== 'full') return;
    const unclamp = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const root = wrap.querySelector('.peek-root') as HTMLElement | null;
      const scroll = wrap.querySelector('.peek-scroll') as HTMLElement | null;
      const scene = wrap.querySelector('.peek-scene') as HTMLElement | null;
      if (root) {
        root.style.position = 'relative';
        root.style.inset = 'auto';
        root.style.height = 'auto';
        root.style.minHeight = 'auto';
        root.style.width = '430px';
        // keep horizontal clipped (the inner carousels use overflow-x:auto; relaxing it
        // would let flex children blow the page width out past 430), vertical visible.
        root.style.overflowX = 'hidden';
        root.style.overflowY = 'visible';
      }
      if (scroll) {
        scroll.style.position = 'static';
        scroll.style.inset = 'auto';
        scroll.style.height = 'auto';
        scroll.style.width = '430px';
        scroll.style.overflowX = 'hidden';
        scroll.style.overflowY = 'visible';
      }
      // keep the scene as a tall absolute backdrop covering the whole column
      if (scene) {
        scene.style.position = 'absolute';
        scene.style.inset = '0';
        scene.style.height = '100%';
      }
      // The sticky action bar is position:absolute bottom:0 inside the (now static)
      // root → it would pin to the document bottom and force-show. Park it so it does
      // not overlap content in the static capture; the bar gets its own capture via
      // the device-frame render-check anyway.
      const bar = wrap.querySelector('.peek-bar') as HTMLElement | null;
      if (bar) bar.style.display = 'none';
      const nav = wrap.querySelector('.peek-nav') as HTMLElement | null;
      if (nav) nav.style.position = 'static';
    };
    // run a few times as fonts/hero-fit settle
    const ids = [120, 400, 900, 1500].map((d) => setTimeout(unclamp, d));
    unclamp();
    return () => ids.forEach(clearTimeout);
  }, [ir, mode]);

  if (mode === 'frame') {
    // clamped 430x932 device so the sticky action bar + running total are captured
    return (
      <div style={{ width: 430, height: 932, margin: '0 auto', background: '#fff', position: 'relative' }}>
        <div ref={wrapRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#fff' }}>
          <PeekRenderer ir={ir} surface="recipient" />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 430,
        margin: '0 auto',
        background: '#fff',
        position: 'relative',
      }}
    >
      <div
        ref={wrapRef}
        data-diag-host
        style={{ position: 'relative', width: 430, minHeight: 200, overflowX: 'hidden' }}
      >
        <PeekRenderer ir={ir} surface="recipient" />
      </div>
    </div>
  );
}
