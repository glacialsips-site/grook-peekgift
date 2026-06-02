import { describe, it, expect } from "vitest";
import { ensureReadable, contrastRatio, type Palette } from "../src/index";

const base = (over: Partial<Palette>): Palette => ({
  mode: "light",
  bg: "#ffffff",
  surface: "#f6f6f7",
  ink: "#15161a",
  muted: "#6b6f76",
  line: "#e4e5e9",
  accent: "#3b5bdb",
  ...over,
});

describe("contrast safety-net", () => {
  it("leaves an already-readable palette untouched", () => {
    const p = base({});
    const r = ensureReadable(p);
    expect(r.ink).toBe("#15161a");
    expect(r.bg).toBe("#ffffff");
    expect(r.accent).toBe("#3b5bdb"); // brand color never altered
  });

  it("repairs dark ink on a dark background to clear AA", () => {
    const p = base({ mode: "dark", bg: "#000000", ink: "#15161a", muted: "#222222" });
    const r = ensureReadable(p);
    expect(contrastRatio(r.ink, r.bg)!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(r.muted, r.bg)!).toBeGreaterThanOrEqual(3);
    expect(r.bg).toBe("#000000"); // background untouched; only text is nudged
  });

  it("passes non-hex colors through unchanged", () => {
    const p = base({ bg: "oklch(0.2 0.1 250)", ink: "hsl(0 0% 92%)" });
    expect(ensureReadable(p).ink).toBe("hsl(0 0% 92%)");
  });

  it("contrastRatio returns null for non-hex", () => {
    expect(contrastRatio("oklch(0.2 0.1 250)", "#fff")).toBeNull();
  });
});
