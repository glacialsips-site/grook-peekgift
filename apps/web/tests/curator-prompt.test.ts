import { describe, expect, it } from "vitest";
import { buildCuratorSystem } from "@/lib/curator/prompt";

// Phase 1 gate: the curator system prefix must assemble as four byte-stable cached
// blocks in the right order, ship the design vocabulary the model was missing, and
// stay consistent with the sanitizer reality (tag-driven, never scripted).
describe("curator system prompt", () => {
  const sys = buildCuratorSystem();

  it("assembles exactly four cached blocks (Anthropic's max breakpoints)", () => {
    expect(sys).toHaveLength(4);
    for (const block of sys) {
      expect(block.type).toBe("text");
      expect(block.cache_control).toEqual({ type: "ephemeral" });
      expect(block.text.length).toBeGreaterThan(0);
    }
  });

  it("orders the blocks method → pantry → few-shot → contract", () => {
    const [method, pantry, fewshot, contract] = sys.map((b) => b.text);
    expect(method).toContain("The only failure is GENERIC");
    expect(pantry).toContain("THE PANTRY — raw material, never a rulebook");
    expect(fewshot).toContain("ONE WORKED EXAMPLE");
    expect(contract).toContain("THE INTERACTION CONTRACT");
  });

  it("ships the design vocabulary the bare prompt was missing", () => {
    const pantry = sys[1].text;
    expect(pantry).toContain("FONTS"); // the font-personality taxonomy
    expect(pantry).toContain("TYPE-ART"); // the loud type-art CSS the renderer lacked
    expect(pantry).toMatch(/Oswald|Bodoni|Chakra|Bungee/); // real, varied display families
    expect(pantry.length).toBeGreaterThan(30_000); // the whole §1–§9 catalog, not a stub
  });

  it("drops the rejected deterministic design engine from the pantry", () => {
    expect(sys[1].text).not.toContain("THE ENGINE");
    expect(sys[1].text).not.toContain("ThemeSpec"); // §10 resolver framing is gone
  });

  it("the few-shot is a tag-driven page, not a scripted one", () => {
    const fewshot = sys[2].text;
    expect(fewshot).toContain("data-peek-card");
    expect(fewshot).toContain("data-peek-id"); // the stable id that links HTML ↔ spine
    expect(fewshot).toContain('data-peek-action="claim"');
    expect(fewshot).not.toMatch(/<script\b/i);
    expect(fewshot).not.toMatch(/<form\b/i);
    expect(fewshot).not.toMatch(/<input\b/i);
  });

  it("the contract states the sanitizer reality and the self-critique gate", () => {
    const contract = sys[3].text;
    expect(contract).toContain("What the page can and can't contain");
    expect(contract).toContain("Before your first set_page — the gate");
    expect(contract).toMatch(/do \*\*not\*\* author a <form>/);
  });
});
