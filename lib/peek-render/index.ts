// ============================================================================
// peek-render — the conformant renderer for peek.gift vNext.
// Paints a PeekIR (lib/ir/contract.ts) into a themed, interactive mobile page at
// mockup caliber. Two surfaces, one output (SHELL_SPEC §0):
//   • mountPeek(root, ir, opts) — imperative controller (INTERFACES §1.1)
//   • <PeekRenderer ir surface interactions /> — thin React wrapper for Next
// ============================================================================

export { mountPeek } from './mount';
export { PeekRenderer, default as PeekRendererDefault } from './PeekRenderer';
export type { PeekRendererProps } from './PeekRenderer';
export type {
  PeekRenderer as PeekRendererController,
  RenderOptions,
  RecipientInteractions,
} from './types';
export { FontLoader, FONT_SPECS, fontStack } from './fonts';
export { toTokens, applyThemeVars } from './theme';
export type { Tokens } from './theme';
