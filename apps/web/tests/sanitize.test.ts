import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize";

describe("sanitizeHtml — keep the design soul, strip the vectors", () => {
  it("strips <script> and inline event handlers", () => {
    const out = sanitizeHtml(`<div onclick="steal()">hi</div><script>steal()</script>`, false);
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toContain("onclick");
    expect(out).toContain("hi");
  });

  it("strips @import from a <style> block but keeps @keyframes + gradients (the soul)", () => {
    // <style> lives in <head>, so this is the whole-document (set_page) path.
    const out = sanitizeHtml(
      `<html><head><style>@import url("//evil/x.css");@keyframes spin{to{transform:rotate(360deg)}}.h{background:linear-gradient(90deg,#f00,#00f)}</style></head><body><div class="h"></div></body></html>`,
      true,
    );
    expect(out).not.toMatch(/@import/i);
    expect(out).toContain("@keyframes spin");
    expect(out).toContain("linear-gradient");
  });

  it("neutralizes expression()/behavior in inline styles, keeps safe declarations", () => {
    const out = sanitizeHtml(`<div style="behavior:url(#x);color:red">x</div>`, false);
    expect(out).not.toMatch(/behavior\s*:/i);
    expect(out).toContain("color:red");
  });

  it("forces rel=noopener noreferrer on target=_blank (reverse-tabnabbing)", () => {
    const out = sanitizeHtml(`<a href="https://x.com" target="_blank">go</a>`, false);
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("keeps the data-peek-* interaction contract and SVG", () => {
    const out = sanitizeHtml(
      `<div data-peek-card data-peek-id="c1" data-price="44"><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg></div>`,
      false,
    );
    expect(out).toContain("data-peek-card");
    expect(out).toContain('data-peek-id="c1"');
    expect(out).toContain("data-price");
    expect(out).toContain("<circle");
  });

  it("strips forms/inputs (behavior must come from the host runtime, never markup)", () => {
    const out = sanitizeHtml(`<form action="//evil"><input name="card" /></form><div>ok</div>`, false);
    expect(out).not.toMatch(/<form/i);
    expect(out).not.toMatch(/<input/i);
    expect(out).toContain("ok");
  });
});
