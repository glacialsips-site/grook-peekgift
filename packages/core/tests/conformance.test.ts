import { describe, it, expect } from "vitest";
import { validatePeekIR, render } from "../src/index";
import dad from "./fixtures/dad-60th.ir.json";
import gala from "./fixtures/charity-gala.ir.json";
import taquito from "./fixtures/el-taquito.ir.json";

// The design seat's sample documents are the conformance bar: the schema must accept them
// (incl. legacy-shape normalization) and the renderer must paint them. This is the honest
// proof that the demo route renders real validated documents, not error fallbacks.
const samples: ReadonlyArray<readonly [string, unknown]> = [
  ["dad-60th", dad],
  ["charity-gala", gala],
  ["el-taquito", taquito],
];

describe("design-sample conformance", () => {
  for (const [name, raw] of samples) {
    it(`${name} validates against the PeekIR schema`, () => {
      const v = validatePeekIR(raw);
      if (!v.ok) console.error(`${name} did not validate:\n${v.error}`);
      expect(v.ok).toBe(true);
    });

    it(`${name} renders to a non-empty view-model`, () => {
      const v = validatePeekIR(raw);
      expect(v.ok).toBe(true);
      if (!v.ok) return;
      const m = render(v.value);
      expect(m.sections.length).toBeGreaterThan(0);
      expect(Array.isArray(m.cardGroups)).toBe(true);
      expect(m.cssVars["--peek-accent"]).toBeDefined();
      expect(m.cssVars["--peek-bg"]).toBeDefined();
    });
  }
});
