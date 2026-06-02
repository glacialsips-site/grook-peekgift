import { describe, it, expect } from "vitest";
import {
  emptyDocument,
  decide,
  execute,
  counterCtx,
  commandFromTool,
  parseCommand,
  apply,
  replay,
  validatePeekIR,
  type Command,
  type PeekEvent,
  type PeekIR,
} from "../src/index";

const base = (): PeekIR => emptyDocument({ id: "p1", slug: "p1", curator_id: "u1" });

describe("maker-checker: decide → events → apply", () => {
  it("a valid command produces events + a new document, and never mutates the input", () => {
    const doc = base();
    const before = structuredClone(doc);
    const r = execute(
      doc,
      { type: "set_concept", payload: { oneLiner: "x", boldMove: "y", voice: "z", emotionalCore: "w" } },
      counterCtx(),
    );
    expect(r.isOk()).toBe(true);
    if (r.isOk()) {
      expect(r.value.events).toHaveLength(1);
      expect(r.value.doc.peek.concept.oneLiner).toBe("x");
    }
    expect(doc).toEqual(before);
  });

  it("add_card assigns position 0 and auto-creates a giftgrid section", () => {
    const r = execute(
      base(),
      { type: "add_card", payload: { type: "product", title: "Wool throw", value_cents: 4200 } },
      counterCtx(),
    );
    expect(r.isOk()).toBe(true);
    if (r.isOk()) {
      expect(r.value.doc.cards).toHaveLength(1);
      expect(r.value.doc.cards[0]!.position).toBe(0);
      expect(r.value.doc.sections.some((s) => s.kind === "giftgrid")).toBe(true);
    }
  });

  it("set_note auto-creates a note section", () => {
    const r = execute(base(), { type: "set_note", payload: { note_md: "hi" } }, counterCtx());
    expect(r.isOk()).toBe(true);
    if (r.isOk()) expect(r.value.doc.sections.some((s) => s.kind === "note")).toBe(true);
  });

  it("upsert_section can author a `stats` section (gap-d fix: full kind set)", () => {
    const r = execute(
      base(),
      { type: "upsert_section", payload: { kind: "stats", data: { items: [{ value: 30, label: "years" }] } } },
      counterCtx(),
    );
    expect(r.isOk()).toBe(true);
    if (r.isOk()) expect(r.value.doc.sections.some((s) => s.kind === "stats")).toBe(true);
  });

  describe("the checker rejects and leaves the document unchanged", () => {
    it("update_card with an unknown id → NOT_FOUND", () => {
      const doc = base();
      const before = structuredClone(doc);
      const r = decide(doc, { type: "update_card", payload: { card_id: "nope", title: "x" } }, counterCtx());
      expect(r.isErr()).toBe(true);
      if (r.isErr()) expect(r.error.code).toBe("NOT_FOUND");
      expect(doc).toEqual(before);
    });

    it("add_card referencing a missing variant group → NOT_FOUND", () => {
      const r = decide(
        base(),
        { type: "add_card", payload: { type: "product", title: "x", variant_group_id: "ghost" } },
        counterCtx(),
      );
      expect(r.isErr()).toBe(true);
    });

    it("add_card with a negative value → INVARIANT", () => {
      const r = decide(
        base(),
        { type: "add_card", payload: { type: "product", title: "x", value_cents: -5 } },
        counterCtx(),
      );
      expect(r.isErr()).toBe(true);
      if (r.isErr()) expect(r.error.code).toBe("INVARIANT");
    });

    it("remove_section with an unknown id → NOT_FOUND", () => {
      expect(decide(base(), { type: "remove_section", payload: { id: "ghost" } }, counterCtx()).isErr()).toBe(true);
    });

    it("mark_ready before the page is useful (no concept, no cards) → INVARIANT", () => {
      const r = decide(base(), { type: "mark_ready", payload: {} }, counterCtx());
      expect(r.isErr()).toBe(true);
      if (r.isErr()) expect(r.error.code).toBe("INVARIANT");
    });
  });

  it("mark_ready passes once a concept + a card exist", () => {
    let doc = base();
    const ctx = counterCtx();
    const setup: Command[] = [
      { type: "set_concept", payload: { oneLiner: "a real concept", boldMove: "b", voice: "v", emotionalCore: "e" } },
      { type: "add_card", payload: { type: "product", title: "A", value_cents: 1000 } },
    ];
    for (const cmd of setup) {
      const r = execute(doc, cmd, ctx);
      expect(r.isOk()).toBe(true);
      if (r.isOk()) doc = r.value.doc;
    }
    expect(decide(doc, { type: "mark_ready", payload: {} }, ctx).isOk()).toBe(true);
  });

  it("replaying the event log reconstructs an identical document", () => {
    const ctx = counterCtx();
    let doc = base();
    const log: PeekEvent[] = [];

    const vg = execute(doc, { type: "add_variant_group", payload: { title: "Pick one", selection: "pick_one" } }, ctx);
    expect(vg.isOk()).toBe(true);
    if (!vg.isOk()) return;
    doc = vg.value.doc;
    log.push(...vg.value.events);
    const vgId = doc.variant_groups[0]!.id;

    const seq: Command[] = [
      { type: "set_concept", payload: { oneLiner: "slow morning kit", boldMove: "chalkboard menu", voice: "warm", emotionalCore: "known" } },
      { type: "set_theme", payload: { palette: { mode: "dark", accent: "#E5944B" }, radius: 8 } },
      { type: "add_card", payload: { type: "product", title: "pour-over", value_cents: 6800, variant_group_id: vgId } },
      { type: "add_card", payload: { type: "activity", title: "pottery class", value_cents: 14000, variant_group_id: vgId } },
      { type: "set_note", payload: { note_md: "happy birthday" } },
    ];
    for (const cmd of seq) {
      const r = execute(doc, cmd, ctx);
      expect(r.isOk()).toBe(true);
      if (r.isOk()) {
        doc = r.value.doc;
        log.push(...r.value.events);
      }
    }

    const replayed = validatePeekIR(replay(base(), log, apply));
    expect(replayed.ok).toBe(true);
    if (replayed.ok) expect(replayed.value).toEqual(doc);
  });

  it("commandFromTool maps tool calls; resolve_card is orchestration; bogus types reject", () => {
    expect(commandFromTool("add_card", { type: "product", title: "x" }).isOk()).toBe(true);
    expect(commandFromTool("resolve_card", { text: "a barrel cactus under $40" }).isErr()).toBe(true);
    expect(parseCommand({ type: "bogus", payload: {} }).isErr()).toBe(true);
  });
});
