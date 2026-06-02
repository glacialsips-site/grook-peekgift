import { describe, it, expect } from "vitest";
import { emptyDocument, execute, counterCtx, render, type PeekIR, type Command } from "../src/index";

function sampleDoc(): PeekIR {
  let doc = emptyDocument({ id: "p", slug: "p", curator_id: "u" });
  const ctx = counterCtx();
  const vg = execute(doc, { type: "add_variant_group", payload: { title: "Pick one", selection: "pick_one" } }, ctx);
  if (vg.isOk()) doc = vg.value.doc;
  const vgId = doc.variant_groups[0]!.id;
  const cmds: Command[] = [
    { type: "add_card", payload: { type: "product", title: "A", value_cents: 1000, reveal_value: true, variant_group_id: vgId } },
    { type: "add_card", payload: { type: "product", title: "B", value_cents: 2000, reveal_value: true, variant_group_id: vgId } },
    { type: "add_card", payload: { type: "activity", title: "Dinner", proposed_date: "2026-09-01T19:00:00Z", location_hint: "Nonna's" } },
    { type: "add_card", payload: { type: "aspirational", title: "Trip", value_display: "—" } },
  ];
  for (const cmd of cmds) {
    const r = execute(doc, cmd, ctx);
    if (r.isOk()) doc = r.value.doc;
  }
  return doc;
}

describe("pure render(document, theme)", () => {
  it("is deterministic: same input -> byte-identical view-model, no side effects", () => {
    const doc = sampleDoc();
    const a = render(doc);
    const b = render(doc);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a).toEqual(b);
  });

  it("groups cards by variant_group with the selection rule surfaced (gap-a)", () => {
    const m = render(sampleDoc());
    const grouped = m.cardGroups.find((g) => g.group !== null);
    expect(grouped).toBeDefined();
    expect(grouped!.selection).toBe("pick_one");
    expect(grouped!.cards).toHaveLength(2);
    expect(m.cardGroups.some((g) => g.group === null)).toBe(true);
  });

  it("derives an ordered itinerary from activity cards (gap-b)", () => {
    const m = render(sampleDoc());
    expect(m.itinerary).toHaveLength(1);
    expect(m.itinerary[0]!.place).toBe("Nonna's");
    expect(m.itinerary[0]!.date).toBe("2026-09-01T19:00:00Z");
  });

  it("carries the theme as a --peek-* css-var record and the page structure", () => {
    const m = render(sampleDoc());
    expect(m.cssVars["--peek-accent"]).toBeDefined();
    expect(m.mode).toBe("light");
    expect(m.sections.some((s) => s.kind === "giftgrid" && s.bearsCards)).toBe(true);
    expect(m.totalValueCents).toBe(3000);
  });

  it("shows value via explicit value_display or a revealed number, else hides it", () => {
    const cards = render(sampleDoc()).cardGroups.flatMap((g) => g.cards);
    expect(cards.find((c) => c.title === "A")!.valueText).toBe("$10");
    expect(cards.find((c) => c.title === "Trip")!.valueText).toBe("—");
  });
});
