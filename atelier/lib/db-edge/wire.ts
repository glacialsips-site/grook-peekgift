/**
 * db-edge wire layer — a RE-EXPORT of the shared spine wire layer.
 *
 * DECISION: re-export, do NOT move. The spine chat edge route
 * (`app/api/spine/chat/route.ts`) and `tests/unit/spine-derive.test.ts`
 * already import these symbols from `@/lib/spine/wire`. Re-exporting from
 * here gives db-edge a single import home (`@/lib/db-edge/wire`) without
 * disturbing that proven, tested code or duplicating the mappers.
 *
 * Everything below is pure (string column constants + pure snake→camel
 * mapper functions whose only deps are type-only) and already proven
 * edge-safe in the working route.
 */
export {
  PEEK_COLUMNS,
  CARD_COLUMNS,
  rowToWirePeek,
  rowToWireCard,
  rowsToState,
} from '@/lib/spine/wire';
export type { SpinePeekRow, SpineCardRow } from '@/lib/spine/wire';
