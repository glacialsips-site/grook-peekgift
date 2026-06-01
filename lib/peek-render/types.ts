// ============================================================================
// peek-render/types.ts — the Renderer API seam (INTERFACES.md §1.1)
// These mirror the documented contract exactly. The renderer implements `mountPeek`.
// ============================================================================

import type { PeekIR } from '@/lib/ir/contract';

export interface RecipientInteractions {
  // The recipient surface supplies these; the gift-builder preview passes no-ops.
  onPick?(cardId: string): void; // recipient selects a card
  onBeg?(cardId: string, message: string): void; // locked card with unlock_rule.kind==='beg'
  onUnlock?(cardId: string): void; // a date_after/event card whose gate passed
  onCheckout?(): void; // the in-world CTA (Peek.cta_label) fired
}

export interface RenderOptions {
  surface: 'builder' | 'recipient'; // builder = live preview pane; recipient = the shared page
  interactions?: RecipientInteractions;
  reducedMotion?: boolean; // force-honor prefers-reduced-motion (else read media query)
}

export interface PeekRenderer {
  update(ir: PeekIR): void; // re-render/diff to the new IR snapshot (idempotent)
  destroy(): void; // tear down observers/listeners/injected <style>/<link>
  /** live-builder signal: pulse a just-added/edited section or card (SHELL_SPEC §0) */
  markPlaced(id: string): void;
}
