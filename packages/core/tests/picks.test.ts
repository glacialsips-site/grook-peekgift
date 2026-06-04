import { describe, it, expect } from "vitest";
import { emptyDocument, execute, counterCtx, decidePick, type PeekIR, type Command } from "../src/index";

function doc(): PeekIR {
  let d = emptyDocument({ id: "p", slug: "p", curator_id: "u" });
  const ctx = counterCtx();
  const run = (cmd: Command) => {
    const r = execute(d, cmd, ctx);
    if (r.isOk()) d = r.value.doc;
    else throw new Error(r.error.message);
  };
  run({ type: "add_variant_group", payload: { title: "one", selection: "pick_one" } });
  const g1 = d.variant_groups[0]!.id;
  run({ type: "add_variant_group", payload: { title: "any", selection: "pick_any" } });
  const g2 = d.variant_groups[1]!.id;
  run({ type: "add_card", payload: { type: "product", title: "A", value_cents: 1000, variant_group_id: g1 } });
  run({ type: "add_card", payload: { type: "product", title: "B", value_cents: 2000, variant_group_id: g1 } });
  run({ type: "add_card", payload: { type: "product", title: "C", value_cents: 300, variant_group_id: g2 } });
  run({ type: "add_card", payload: { type: "product", title: "D", value_cents: 400, variant_group_id: g2 } });
  run({ type: "add_card", payload: { type: "product", title: "E", value_cents: 5000 } });
  run({ type: "add_card", payload: { type: "aspirational", title: "F", is_locked: true } });
  run({ type: "add_card", payload: { type: "aspirational", title: "G", is_taunt: true } });
  return d;
}

const idOf = (d: PeekIR, title: string) => d.cards.find((c) => c.title === title)!.id;

describe("the selection engine (decidePick)", () => {
  it("pick_one behaves like a radio: a second pick in the group replaces the first", () => {
    const d = doc();
    const r1 = decidePick(d, [], { type: "toggle", cardId: idOf(d, "A") });
    expect(r1.isOk()).toBe(true);
    const after1 = r1._unsafeUnwrap().picks;
    expect(after1).toEqual([idOf(d, "A")]);
    const r2 = decidePick(d, after1, { type: "toggle", cardId: idOf(d, "B") });
    expect(r2._unsafeUnwrap().picks).toEqual([idOf(d, "B")]);
  });

  it("pick_any behaves like checkboxes: both can be selected, and toggle removes", () => {
    const d = doc();
    let picks = decidePick(d, [], { type: "toggle", cardId: idOf(d, "C") })._unsafeUnwrap().picks;
    picks = decidePick(d, picks, { type: "toggle", cardId: idOf(d, "D") })._unsafeUnwrap().picks;
    expect(picks.sort()).toEqual([idOf(d, "C"), idOf(d, "D")].sort());
    picks = decidePick(d, picks, { type: "toggle", cardId: idOf(d, "C") })._unsafeUnwrap().picks;
    expect(picks).toEqual([idOf(d, "D")]);
  });

  it("a locked card and a taunt card cannot be picked", () => {
    const d = doc();
    expect(decidePick(d, [], { type: "toggle", cardId: idOf(d, "F") }).isErr()).toBe(true);
    expect(decidePick(d, [], { type: "toggle", cardId: idOf(d, "G") }).isErr()).toBe(true);
  });

  it("an unknown card id is rejected", () => {
    expect(decidePick(doc(), [], { type: "toggle", cardId: "ghost" }).isErr()).toBe(true);
  });

  it("sums committed value and enforces a hard cap (skipping taunts)", () => {
    const d = doc();
    const blocked = decidePick(d, [], { type: "toggle", cardId: idOf(d, "E") }, { hardCents: 4000 });
    expect(blocked.isErr()).toBe(true);
    if (blocked.isErr()) expect(blocked.error.code).toBe("INVARIANT");
    const okRes = decidePick(d, [], { type: "toggle", cardId: idOf(d, "E") }, { hardCents: 6000 });
    expect(okRes.isOk()).toBe(true);
    expect(okRes._unsafeUnwrap().committedCents).toBe(5000);
  });

  it("flags the soft cap without blocking", () => {
    const d = doc();
    const r = decidePick(d, [], { type: "toggle", cardId: idOf(d, "E") }, { softCents: 4000, hardCents: 100000 });
    expect(r.isOk()).toBe(true);
    expect(r._unsafeUnwrap().overSoftCap).toBe(true);
  });
});
