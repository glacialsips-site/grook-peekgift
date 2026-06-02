import { describe, it, expect } from "vitest";
import { emptyDocument, themeToCSSVars, type ThemeSpec } from "../src/index";

const themeOf = (mut?: (t: ThemeSpec) => void): ThemeSpec => {
  const t = emptyDocument().peek.theme;
  mut?.(t);
  return t;
};

describe("runtime token system (themeToCSSVars)", () => {
  it("maps a theme to a --peek-* record: all keys namespaced, all values strings", () => {
    const vars = themeToCSSVars(themeOf());
    const keys = Object.keys(vars);
    expect(keys.length).toBeGreaterThan(20);
    expect(keys.every((k) => k.startsWith("--peek-"))).toBe(true);
    expect(Object.values(vars).every((v) => typeof v === "string")).toBe(true);
    expect(vars["--peek-bg"]).toBeDefined();
    expect(vars["--peek-accent"]).toBeDefined();
  });

  it("swapping themes changes values, never the key structure", () => {
    const a = themeToCSSVars(themeOf());
    const b = themeToCSSVars(
      themeOf((t) => {
        t.palette.bg = "#000000";
        t.palette.accent = "#ff0000";
        t.palette.mode = "dark";
      }),
    );
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
    expect(b["--peek-bg"]).toBe("#000000");
    expect(a["--peek-bg"]).not.toBe(b["--peek-bg"]);
    expect(b["--peek-mode"]).toBe("dark");
  });

  it("gap-c fix: palette.glow alone produces a headline glow (not 'none')", () => {
    const off = themeToCSSVars(themeOf());
    const on = themeToCSSVars(themeOf((t) => (t.palette.glow = true)));
    expect(off["--peek-display-shadow"]).toBe("none");
    expect(on["--peek-display-shadow"]).not.toBe("none");
    expect(on["--peek-display-shadow"]).toContain("color-mix");
  });

  it("an explicit loud.displayShadow wins and expands accent keywords", () => {
    const vars = themeToCSSVars(
      themeOf((t) => {
        t.palette.accent2 = "#123456";
        t.loud = { displayShadow: "3px 3px 0 accent2" };
      }),
    );
    expect(vars["--peek-display-shadow"]).toBe("3px 3px 0 #123456");
  });

  it("model cssVars are merged last but only within the --peek-* namespace", () => {
    const vars = themeToCSSVars(
      themeOf((t) => {
        t.cssVars = { "--peek-accent": "#abcdef", "--evil": "x" };
      }),
    );
    expect(vars["--peek-accent"]).toBe("#abcdef");
    expect(vars["--evil"]).toBeUndefined();
  });

  it("emits --peek-display-case as a valid CSS text-transform value", () => {
    expect(themeToCSSVars(themeOf())["--peek-display-case"]).toBe("none");
    expect(
      themeToCSSVars(themeOf((t) => (t.type.displayCase = "upper")))["--peek-display-case"],
    ).toBe("uppercase");
  });
});
