// The selection engine — the recipient side of the maker-checker, and the product's
// genuinely defensible mechanic. The recipient toggles cards; this PURE function enforces
// the creator's rules and returns the new selection or a typed error:
//   • variant groups: pick_one (radio), pick_any (checkbox), pick_all (the bundle moves as one)
//   • locked cards can't be picked until unlocked (beg/date/event — handled outside; here a
//     locked card is simply not selectable)
//   • a hard cap blocks; a soft cap warns. Value sums skip taunts.
// No IO, no clock, no random — the recipient surface and the server both run this, so the
// client preview and the server-validated pick can never disagree.

import { ok, err, coreError } from "../result";
import type { Result, CoreError } from "../result";
import type { PeekIR } from "../document/contract";

export interface Caps {
  hardCents?: number;
  softCents?: number;
}

export interface PickAction {
  type: "toggle";
  cardId: string;
}

export interface PickResult {
  picks: string[]; // the resulting selected card ids (sorted, deterministic)
  committedCents: number;
  overSoftCap: boolean;
}

export function decidePick(
  doc: PeekIR,
  current: readonly string[],
  action: PickAction,
  caps?: Caps,
): Result<PickResult, CoreError> {
  const card = doc.cards.find((c) => c.id === action.cardId);
  if (!card) return err(coreError("NOT_FOUND", `no card with id ${action.cardId}`));
  if (card.is_taunt) return err(coreError("FORBIDDEN", "a taunt card can't be picked"));
  if (card.is_locked) return err(coreError("FORBIDDEN", `card ${action.cardId} is locked`));

  const picked = new Set(current);
  const wasPicked = picked.has(card.id);
  const vg = card.variant_group_id
    ? doc.variant_groups.find((g) => g.id === card.variant_group_id)
    : undefined;

  if (vg) {
    const groupCardIds = doc.cards.filter((c) => c.variant_group_id === vg.id).map((c) => c.id);
    if (vg.selection === "pick_one") {
      for (const id of groupCardIds) picked.delete(id);
      if (!wasPicked) picked.add(card.id);
    } else if (vg.selection === "pick_all") {
      const allPicked = groupCardIds.every((id) => picked.has(id));
      for (const id of groupCardIds) {
        if (allPicked) picked.delete(id);
        else picked.add(id);
      }
    } else {
      if (wasPicked) picked.delete(card.id);
      else picked.add(card.id);
    }
  } else if (wasPicked) {
    picked.delete(card.id);
  } else {
    picked.add(card.id);
  }

  const committedCents = doc.cards
    .filter((c) => picked.has(c.id) && !c.is_taunt && typeof c.value_cents === "number")
    .reduce((sum, c) => sum + (c.value_cents ?? 0), 0);

  if (caps?.hardCents != null && committedCents > caps.hardCents) {
    return err(
      coreError("INVARIANT", `over the hard cap: ${committedCents} > ${caps.hardCents} cents`, {
        committedCents,
        hardCents: caps.hardCents,
      }),
    );
  }

  const overSoftCap = caps?.softCents != null && committedCents > caps.softCents;
  return ok({ picks: [...picked].sort(), committedCents, overSoftCap });
}
