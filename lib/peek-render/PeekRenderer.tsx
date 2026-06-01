'use client';

// ============================================================================
// peek-render/PeekRenderer.tsx — thin React wrapper over mountPeek (INTERFACES §1.1)
// ----------------------------------------------------------------------------
// Mounts the imperative controller into a ref'd host element once, calls update(ir)
// when the IR changes, destroy() on unmount. The host element is the self-contained
// absolutely-positioned root the renderer fills (SHELL_SPEC §0). The CALLER positions
// the host (e.g. inside an iOS device frame, or full-bleed for the recipient page).
// ============================================================================

import { useEffect, useRef } from 'react';
import type { PeekIR } from '@/lib/ir/contract';
import { mountPeek } from './mount';
import type { PeekRenderer as Controller, RecipientInteractions } from './types';

export interface PeekRendererProps {
  ir: PeekIR;
  surface: 'builder' | 'recipient';
  interactions?: RecipientInteractions;
  reducedMotion?: boolean;
  /** className on the host (the caller controls position/size — relative parent + this fills it) */
  className?: string;
  style?: React.CSSProperties;
  /** optional ref to the controller so a parent can call markPlaced() on stream events */
  controllerRef?: React.MutableRefObject<Controller | null>;
}

export function PeekRenderer({
  ir,
  surface,
  interactions,
  reducedMotion,
  className,
  style,
  controllerRef,
}: PeekRendererProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<Controller | null>(null);
  // keep the latest interactions without forcing a remount
  const interactionsRef = useRef<RecipientInteractions | undefined>(interactions);
  interactionsRef.current = interactions;

  // mount once
  useEffect(() => {
    if (!hostRef.current) return;
    const ctrl = mountPeek(hostRef.current, ir, {
      surface,
      reducedMotion,
      interactions: {
        onPick: (id) => interactionsRef.current?.onPick?.(id),
        onBeg: (id, msg) => interactionsRef.current?.onBeg?.(id, msg),
        onUnlock: (id) => interactionsRef.current?.onUnlock?.(id),
        onCheckout: () => interactionsRef.current?.onCheckout?.(),
      },
    });
    ctrlRef.current = ctrl;
    if (controllerRef) controllerRef.current = ctrl;
    return () => {
      ctrl.destroy();
      ctrlRef.current = null;
      if (controllerRef) controllerRef.current = null;
    };
    // mount-once: surface/reducedMotion changes are rare; remount via key if needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface, reducedMotion]);

  // update on IR change
  useEffect(() => {
    ctrlRef.current?.update(ir);
  }, [ir]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}
    />
  );
}

export default PeekRenderer;
